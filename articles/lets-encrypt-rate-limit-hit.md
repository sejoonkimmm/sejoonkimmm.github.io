---
title: "Hit Let's Encrypt Rate Limit While Testing cert-manager"
date: "15.10.2025"
description: "Made a mistake while testing cert-manager configuration. Issued 20 certificates for the same domain in an hour. Got rate limited for a week. Notes on staging environment and rate limits."
tags: ["cert-manager", "Let's Encrypt", "TLS", "Kubernetes", "Certificate Management"]
readTime: "6 min read"
---

# Hit Let's Encrypt Rate Limit While Testing cert-manager

Last week I broke TLS certificate issuance for our domain. While testing a new cert-manager configuration, I accidentally requested certificates from Let's Encrypt production instead of staging. Hit their rate limit and got blocked for a week.

Nobody could issue new certificates for our domain until the rate limit reset. Existing certificates kept working, but we couldn't add new subdomains or renew test certificates.

## What happened

I was setting up cert-manager to use Azure Key Vault for DNS-01 challenge validation. The configuration needed some trial and error to get the Azure permissions right.

Each time I changed the configuration, I deleted the certificate resource and recreated it to test. cert-manager would request a new certificate from Let's Encrypt.

I did this about 20 times in an hour. Then I got this error:

```
Error presenting challenge: acme: error: 429 :: POST https://acme-v02.api.letsencrypt.org/acme/new-cert :: urn:ietf:params:acme:error:rateLimited :: too many certificates already issued for exact set of domains
```

Rate limited. For 7 days.

## Let's Encrypt rate limits

Let's Encrypt has rate limits to prevent abuse:

Certificates per Registered Domain: 50 per week. This counts certificates issued for a domain and all its subdomains. Issuing certs for `app.example.com` and `api.example.com` counts as 2.

Duplicate Certificate: 5 per week. Same exact set of domain names. I had requested `test.example.com` 20 times. Way over the limit.

Once you hit it, you're locked out for a week. No exceptions.

## Why this happened (my fault)

Let's Encrypt provides a staging environment specifically for testing. Same API as production, but certificates aren't trusted by browsers (signed by a fake CA), and the rate limits are about 1000x higher. It's made for exactly this kind of testing.

I should have used staging. I didn't because I wanted to see if the cert would actually work in a browser. Lazy shortcut that cost me a week.

## The fix for future testing

Always use staging for testing cert-manager configs:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory  # staging URL
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - dns01:
        azureDNS:
          subscriptionID: xxx
          resourceGroupName: dns-rg
          hostedZoneName: example.com
          managedIdentity:
            clientID: xxx
```

Once the config works in staging, switch to production:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory  # production URL
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - dns01:
        azureDNS:
          subscriptionID: xxx
          resourceGroupName: dns-rg
          hostedZoneName: example.com
          managedIdentity:
            clientID: xxx
```

Test certificate using staging issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: test-cert
  namespace: default
spec:
  secretName: test-cert-tls
  issuerRef:
    name: letsencrypt-staging  # use staging for tests
    kind: ClusterIssuer
  dnsNames:
  - test.example.com
```

Once it works, change to production issuer and apply once:

```yaml
issuerRef:
  name: letsencrypt-prod  # switch to production
  kind: ClusterIssuer
```

## Workaround during rate limit

While rate limited, we couldn't issue new certificates for our domain. Existing certificates kept working, but we couldn't add new subdomains, test cert-manager changes, or renew certificates that were expiring (luckily none were).

The workaround: I registered a cheap throwaway domain (2 euros/year), pointed it at our cluster, and used that for cert-manager testing. Once the rate limit reset after 7 days, we went back to our main domain.

## DNS-01 vs HTTP-01 challenges

Let's Encrypt uses challenges to verify you own the domain before issuing a certificate.

HTTP-01: Let's Encrypt makes an HTTP request to `http://your-domain/.well-known/acme-challenge/token`. Easy to set up, but only works for single domains (no wildcards) and requires port 80 to be accessible.

DNS-01: Let's Encrypt checks for a TXT record in DNS. Can issue wildcard certificates (`*.example.com`), works even if services aren't publicly accessible, but requires DNS API access.

We use DNS-01 because we want wildcard certificates. cert-manager creates the TXT records in Azure DNS automatically during the challenge.

## Azure DNS configuration for cert-manager

This is what I was testing when I hit the rate limit. cert-manager needs permissions to create DNS records in Azure.

I created a managed identity with DNS Zone Contributor role:

```bash
az identity create --name cert-manager-identity --resource-group dns-rg

# Get the identity client ID
az identity show --name cert-manager-identity --resource-group dns-rg --query clientId -o tsv

# Assign role to DNS zone
az role assignment create \
  --role "DNS Zone Contributor" \
  --assignee <client-id> \
  --scope /subscriptions/<sub-id>/resourceGroups/dns-rg/providers/Microsoft.Network/dnszones/example.com
```

Then configured cert-manager to use this identity in the ClusterIssuer. Took me 20 tries to get the Azure permissions right, which is how I burned through the rate limit.

## Checking rate limit status

Let's Encrypt doesn't provide an API to check your current rate limit status. You just have to wait and try again.

There are unofficial tools like `https://letsdebug.net` that might show rate limit errors, but they're not perfect.

The official advice: keep track of how many certificates you've issued, and don't go over the limits. Not very helpful when you're already locked out.

## Production certificate management

For production, we have:
- One ClusterIssuer using production Let's Encrypt
- Certificate resources for each service
- Auto-renewal 30 days before expiry (cert-manager default)
- Alerts if certificate issuance fails

We rarely need to manually intervene. cert-manager handles renewals on its own. The rate limits aren't a problem in normal operation because we only renew each certificate once per 60-90 days. Well within the 50 certificates per week limit.

## Lessons

1. Always test with staging environment first
2. Rate limits are per exact certificate set, not per request
3. Keep a throwaway domain for testing
4. Don't skip staging because you want to see it work in a real browser

The week-long rate limit was annoying but didn't cause real problems because existing certs kept working. If we'd been in the middle of adding a bunch of new services that needed certificates, it would have been much worse.
