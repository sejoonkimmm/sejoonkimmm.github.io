---
title: "external-secrets Wasn't Syncing from Azure Key Vault"
date: "22.10.2025"
description: "Secrets in Azure Key Vault were updated but pods kept using old values. Took 2 hours to figure out the sync interval setting and force a refresh. Notes on how external-secrets actually works."
tags: ["Kubernetes", "Azure Key Vault", "external-secrets", "Secret Management"]
readTime: "7 min read"
---

# external-secrets Wasn't Syncing from Azure Key Vault

We use external-secrets-operator to sync secrets from Azure Key Vault into Kubernetes. It usually works fine. You update a secret in Key Vault, and it shows up in Kubernetes automatically.

Except last week it didn't. I changed a database password in Key Vault, waited 10 minutes, and the pods still had the old password. Took me 2 hours to figure out why.

## The setup

We store all secrets in Azure Key Vault. External-secrets-operator runs in the cluster and creates Kubernetes Secret objects from Key Vault secrets.

The configuration looks like this:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-backend
  namespace: default
spec:
  provider:
    azurekv:
      authType: ManagedIdentity
      vaultUrl: https://our-vault.vault.azure.net
      identityId: <managed-identity-client-id>
```

Then an ExternalSecret resource that references a Key Vault secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 1h  # this was the problem
  secretStoreRef:
    name: azure-backend
    kind: SecretStore
  target:
    name: database-credentials
  data:
  - secretKey: password
    remoteRef:
      key: postgresql-password
```

External-secrets polls Azure Key Vault every `refreshInterval` and updates the Kubernetes Secret if the value changed.

## The problem

I rotated the PostgreSQL password in Key Vault at 2 PM. By 2:15 PM, pods should have had the new credentials. They didn't.

Checked the ExternalSecret status:

```bash
kubectl describe externalsecret database-credentials
```

The status showed last sync was at 1:30 PM. Next sync was scheduled for 2:30 PM.

The `refreshInterval` was set to 1 hour. So even though the secret changed in Key Vault, external-secrets wouldn't check until the next hour mark. I just had to wait. Kind of frustrating when you're staring at it.

## The fix

Changed `refreshInterval` to something shorter:

```yaml
spec:
  refreshInterval: 5m  # check every 5 minutes
```

But this doesn't trigger an immediate sync. I still had to wait until the next scheduled refresh (at 2:30 PM) for it to pick up the new interval.

To force an immediate refresh, I deleted and recreated the ExternalSecret:

```bash
kubectl delete externalsecret database-credentials
kubectl apply -f externalsecret.yaml
```

This triggered an immediate sync. The new password appeared in the Kubernetes Secret within seconds.

## How external-secrets sync actually works

External-secrets-operator runs a reconciliation loop. For each ExternalSecret:

1. Check if it's time to sync (based on `refreshInterval`)
2. If yes, query the secret from the provider (Azure Key Vault)
3. Compare with the current Kubernetes Secret value
4. If different, update the Kubernetes Secret
5. Schedule next sync after `refreshInterval`

The sync is not event-driven. External-secrets doesn't get notified when a secret changes in Azure. It just polls on a schedule.

So there's always a delay between updating a secret in Azure and having it available in Kubernetes. The delay is at most `refreshInterval`.

## Why not use a shorter interval?

I could set `refreshInterval: 1m` to sync every minute. But that hits Azure Key Vault API 60 times per hour per ExternalSecret.

We have about 15 ExternalSecrets across different namespaces. That's 900 API calls per hour to Key Vault. Azure charges $0.03 per 10,000 transactions, so the cost is negligible. But it's unnecessary load for secrets that change maybe once a month.

Polling every hour is fine for normal use.

## Forcing a sync manually

When you need a refresh right now, there are a few options.

Option 1: Delete and recreate the ExternalSecret
```bash
kubectl delete externalsecret name
kubectl apply -f externalsecret.yaml
```

Option 2: Annotate the ExternalSecret to trigger reconciliation
```bash
kubectl annotate externalsecret name force-sync="$(date +%s)" --overwrite
```

The operator watches for annotation changes and triggers a reconciliation.

Option 3: Restart the external-secrets controller pod
```bash
kubectl rollout restart deployment external-secrets -n external-secrets-system
```

This forces all ExternalSecrets to resync at once. Useful if you need to refresh many secrets.

## Pods don't automatically reload secrets

Here's the other thing that tripped me up. Even after the Kubernetes Secret updates, pods don't see the new value. They loaded the secret at startup and keep using the old one.

To pick up the new secret, restart the pods:

```bash
kubectl rollout restart deployment app
```

This does a rolling restart. New pods get the new secrets, old pods get terminated after the new ones are healthy.

There's also Reloader, which watches Secrets and automatically restarts pods when values change:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  annotations:
    reloader.stakater.com/auto: "true"  # auto-restart on secret change
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - secretRef:
            name: database-credentials
```

We don't use Reloader. I prefer knowing exactly when pods restart. Automatic restarts can cause problems if a secret is temporarily wrong or if the timing is bad.

## A more controlled approach: versioned secrets

Instead of updating a secret in place, you can create a new version:

In Azure Key Vault:
- `postgresql-password-v1`
- `postgresql-password-v2`

Then update the ExternalSecret to reference the new version:

```yaml
data:
- secretKey: password
  remoteRef:
    key: postgresql-password-v2  # changed from v1
```

This triggers external-secrets to sync immediately (because the ExternalSecret resource itself changed) and creates a new Kubernetes Secret.

Then you update deployments to use it, test that it works, and clean up the old version.

More manual work, but you get more control over the rollout.

## Debugging external-secrets

When secrets aren't syncing, here's what I check.

1. Check ExternalSecret status:
```bash
kubectl describe externalsecret name
```

Look for errors or the last sync time.

2. Check SecretStore connection:
```bash
kubectl describe secretstore azure-backend
```

Make sure the vault URL and managed identity are correct.

3. Check external-secrets controller logs:
```bash
kubectl logs -n external-secrets-system deployment/external-secrets -f
```

Look for authentication errors or API failures.

4. Test Azure Key Vault access manually:
```bash
az keyvault secret show --vault-name our-vault --name postgresql-password
```

If this fails, the managed identity probably doesn't have permission to read the secret.

## Azure Key Vault permissions

The managed identity needs these permissions on the Key Vault:

- `get` to read secret values
- `list` to list available secrets

Set via Access Policy:

```bash
az keyvault set-policy \
  --name our-vault \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list
```

Or using Azure RBAC (the newer way):

```bash
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <managed-identity-client-id> \
  --scope /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/our-vault
```

We use RBAC because it works better with Azure AD and is what Microsoft recommends now.

## Why external-secrets instead of mounting secrets directly?

Kubernetes has a CSI driver that can mount Azure Key Vault secrets directly into pods. So why bother with external-secrets?

CSI driver approach:
- Secrets mounted as files in the pod filesystem
- Synced every 2 minutes (configurable)
- Requires the CSI driver installed
- Secrets are only available to pods, not to other Kubernetes resources

external-secrets approach:
- Secrets stored as Kubernetes Secret objects
- Available to anything in Kubernetes (ConfigMaps, ServiceAccounts, etc.)
- Works with GitOps (ExternalSecret defined in Git, actual value in Azure)
- Can combine multiple Key Vault secrets into one Kubernetes Secret

We went with external-secrets because it fits better with our GitOps setup and makes secrets available as native Kubernetes objects.

## Lessons

1. `refreshInterval` is the maximum delay, not how quickly secrets sync
2. Changing a secret in Azure doesn't immediately update pods
3. You can force syncs by deleting/recreating the ExternalSecret or annotating it
4. Pods need restarts to pick up new secret values
5. For critical password rotations, versioned secrets give you more control

Once I understood the polling model, external-secrets made a lot more sense. The hourly default works for most cases. When you need an immediate update, forcing a sync takes seconds.
