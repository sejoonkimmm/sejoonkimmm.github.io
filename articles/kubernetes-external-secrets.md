---
title: "Managing Secrets in Kubernetes with External Secrets Operator"
date: "24.08.2025"
description: "A comprehensive guide to implementing External Secrets Operator for secure secret management in Kubernetes clusters"
tags: ["Kubernetes", "DevOps", "Security", "External Secrets", "AWS", "Secret Management"]
readTime: "8 min read"
---

# Managing Secrets in Kubernetes with External Secrets Operator

If you've worked with Kubernetes secrets, you know the default setup is a bit underwhelming. Kubernetes stores secrets in etcd as base64-encoded data, which is not encryption. Anyone with access to etcd can decode them. Managing secrets across multiple clusters by hand gets old fast.

I ran into these problems when our team started running more than one cluster. We needed something better.

## What's wrong with native Kubernetes secrets?

A few things bothered me:

- They're base64-encoded in etcd, not encrypted (by default)
- Creating and updating them means manual kubectl commands or scripting around it
- Keeping secrets in sync across clusters is tedious and error-prone
- There's no real audit trail for who changed what

None of these are dealbreakers for a small setup. But once you have multiple environments and a team, it becomes a headache.

## External Secrets Operator (ESO)

External Secrets Operator is a Kubernetes operator that pulls secrets from an external system (like AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault) and creates regular Kubernetes secrets from them. Automatically.

Why I like it:

1. You manage secrets in one place (the external provider), and ESO syncs them to your clusters
2. When you update a secret in AWS or Azure, ESO picks up the change on its own
3. Secrets stay encrypted in the external system until they're needed
4. The ExternalSecret YAML files can live in Git, since they only reference the secret, not the actual value. That makes GitOps work properly.

## Setting it up with AWS Secrets Manager

Here's how I set this up in practice. We were using AWS Secrets Manager, but the flow is similar for other providers.

### What you need first

- A Kubernetes cluster (EKS makes the AWS integration easier, but any cluster works)
- AWS CLI configured with the right permissions
- Helm 3.x installed

### Step 1: Install External Secrets Operator

```bash
# Add the External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io

# Install ESO
helm install external-secrets external-secrets/external-secrets -n \
external-secrets-system --create-namespace
```

### Step 2: Create AWS IAM Role and Policy

ESO needs permission to read your secrets. Here's a minimal IAM policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": "arn:aws:secretsmanager:region:account:secret:your-secret-name/*"
        }
    ]
}
```

### Step 3: Configure SecretStore

The SecretStore tells ESO where to find secrets and how to authenticate:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        serviceAccount:
          name: external-secrets-sa
```

### Step 4: Create ExternalSecret

This is where you map external secrets to Kubernetes secrets:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: prod/database
      property: username
  - secretKey: password
    remoteRef:
      key: prod/database
      property: password
```

After you apply this, ESO fetches the username and password from AWS Secrets Manager and creates a regular Kubernetes secret called `db-credentials`. It refreshes every hour.

## Things that work well in practice

### ClusterSecretStore for shared secrets

If you have secrets that need to be available across all namespaces, use a ClusterSecretStore instead of a namespace-scoped SecretStore:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: global-aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        serviceAccount:
          name: external-secrets-sa
          namespace: external-secrets-system
```

### Secret rotation

Set a shorter refresh interval if you rotate secrets frequently. ESO will pick up the new values:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-secret
spec:
  refreshInterval: 30m  # Check for updates every 30 minutes
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secret
    creationPolicy: Owner
    deletionPolicy: Retain
```

The `deletionPolicy: Retain` part means if you delete the ExternalSecret resource, the Kubernetes secret stays. Useful if you want to clean up ESO resources without accidentally deleting the secrets your apps depend on.

### Templating for config files

Sometimes you need secrets embedded in a config file format. ESO can template that for you:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: config-secret
spec:
  target:
    name: app-config
    template:
      type: Opaque
      data:
        config.yaml: |
          database:
            host: {{ .host }}
            port: {{ .port }}
            username: {{ .username }}
            password: {{ .password }}
  data:
  - secretKey: host
    remoteRef:
      key: prod/database
      property: host
  - secretKey: port
    remoteRef:
      key: prod/database
      property: port
```

This was handy for apps that expect a config file rather than individual environment variables.

## Monitoring and troubleshooting

When something doesn't work, these commands help:

```bash
# Check operator status
kubectl get pods -n external-secrets-system

# View ExternalSecret status
kubectl get externalsecret -A

# Check events for troubleshooting
kubectl describe externalsecret database-credentials
```

Most issues I've hit fall into a few categories:

1. Authentication failures - usually wrong IAM role or service account config
2. Secret not found - typo in the secret path or the secret doesn't exist yet in the external provider
3. Refresh issues - network connectivity problems or permissions that expired

The `describe` command usually tells you exactly what went wrong.

## Multi-tenancy

If you run multiple teams on the same cluster, you can scope secret access per namespace:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: tenant-a-secrets
  namespace: tenant-a
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        serviceAccount:
          name: tenant-a-sa
```

Each team only has access to their own secrets. Clean separation.

## Wrapping up

ESO solved our secret management problems without adding too much complexity. The external provider handles encryption, access control, and audit logging. ESO handles syncing. Kubernetes secrets work the same way they always did from the application's perspective.

The main things to remember:
- ESO is a bridge between your external secret store and Kubernetes
- Secrets sync automatically, so you don't have to update Kubernetes secrets by hand
- The actual secret values stay encrypted in the external system
- Your ExternalSecret YAML files can safely live in Git

If you're managing secrets across more than one cluster, or you're tired of manually creating Kubernetes secrets, ESO is worth setting up. Took me about an afternoon to get everything working the first time.
