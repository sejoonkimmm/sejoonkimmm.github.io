---
title: "external-secrets Wasn't Syncing from Azure Key Vault"
date: "22.10.2025"
description: "Secrets in Azure Key Vault were updated but pods kept using old values. Took 2 hours to figure out the sync interval setting and force a refresh. Notes on how external-secrets actually works."
tags: ["Kubernetes", "Azure Key Vault", "external-secrets", "Secret Management"]
readTime: "7 min read"
image: ""
---

# external-secrets Wasn't Syncing from Azure Key Vault

We use external-secrets-operator to sync secrets from Azure Key Vault into Kubernetes. It usually works fine - you update a secret in Key Vault, and it shows up in Kubernetes automatically.

Except last week it didn't. Changed a database password in Key Vault, waited 10 minutes, pods still had the old password. Took me 2 hours to figure out why.

## The setup

We store all secrets in Azure Key Vault. External-secrets-operator runs in the cluster and creates Kubernetes Secret objects from Key Vault secrets.

Configuration looks like this:

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

Rotated the PostgreSQL password in Key Vault at 2 PM. By 2:15 PM, pods should have new credentials. They didn't.

Checked the ExternalSecret status:

```bash
kubectl describe externalsecret database-credentials
```

Status showed last sync was at 1:30 PM. Next sync scheduled for 2:30 PM.

The `refreshInterval` was set to 1 hour. So even though the secret changed in Key Vault, external-secrets wouldn't check until the next hour.

## The fix

Changed `refreshInterval` to something shorter:

```yaml
spec:
  refreshInterval: 5m  # check every 5 minutes
```

But this doesn't immediately trigger a sync. Had to wait until the next scheduled refresh (at 2:30 PM) for it to pick up the new interval.

To force an immediate refresh, deleted and recreated the ExternalSecret:

```bash
kubectl delete externalsecret database-credentials
kubectl apply -f externalsecret.yaml
```

This triggered an immediate sync. New password appeared in the Kubernetes Secret within seconds.

## How external-secrets sync actually works

External-secrets-operator runs a reconciliation loop. For each ExternalSecret:

1. Check if it's time to sync (based on `refreshInterval`)
2. If yes, query the secret from the provider (Azure Key Vault)
3. Compare with current Kubernetes Secret value
4. If different, update the Kubernetes Secret
5. Schedule next sync after `refreshInterval`

The sync is not event-driven. External-secrets doesn't get notified when a secret changes in Azure. It just polls on a fixed schedule.

This means there's always a delay between updating a secret in Azure and having it available in Kubernetes. The delay is at most `refreshInterval`.

## Why not use a shorter interval?

Could set `refreshInterval: 1m` to sync every minute. But this hits Azure Key Vault API 60 times per hour per ExternalSecret.

We have about 15 ExternalSecrets across different namespaces. That's 900 API calls per hour to Key Vault. Azure charges $0.03 per 10,000 transactions, so this isn't expensive, but it's unnecessary load.

Secrets don't change that often. Most of our secrets change maybe once a month. Polling every hour is fine.

## Forcing a sync manually

When you do need to force a refresh immediately:

**Option 1**: Delete and recreate the ExternalSecret
```bash
kubectl delete externalsecret name
kubectl apply -f externalsecret.yaml
```

**Option 2**: Annotate the ExternalSecret to trigger reconciliation
```bash
kubectl annotate externalsecret name force-sync="$(date +%s)" --overwrite
```

The operator watches for annotation changes and triggers a reconciliation.

**Option 3**: Restart the external-secrets controller pod
```bash
kubectl rollout restart deployment external-secrets -n external-secrets-system
```

This forces all ExternalSecrets to resync immediately. Use this if you need to refresh multiple secrets at once.

## Pods don't automatically reload secrets

Even after the Kubernetes Secret updates, pods don't automatically see the new value. They loaded the secret at startup and keep using that value.

To get pods to use the new secret, restart them:

```bash
kubectl rollout restart deployment app
```

This does a rolling restart - creates new pods with new secrets, waits for them to be healthy, then terminates old pods.

Or use something like Reloader which watches Secrets and automatically restarts pods when secrets change:

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

We don't use Reloader because we prefer manual control over when pods restart. Automatic restarts can cause issues if a secret is temporarily wrong or if the timing is bad.

## Better approach: Versioned secrets

Instead of updating a secret in place, create a new version:

In Azure Key Vault:
- `postgresql-password-v1`
- `postgresql-password-v2`

Update the ExternalSecret to reference the new version:

```yaml
data:
- secretKey: password
  remoteRef:
    key: postgresql-password-v2  # changed from v1
```

This triggers external-secrets to sync immediately (because the ExternalSecret resource changed) and creates a new Kubernetes Secret.

Then update deployments to use the new secret, test that it works, and clean up the old version.

This approach is more controlled but requires more manual work.

## Debugging external-secrets

When secrets aren't syncing, check these:

**1. Check ExternalSecret status:**
```bash
kubectl describe externalsecret name
```

Look for errors or the last sync time.

**2. Check SecretStore connection:**
```bash
kubectl describe secretstore azure-backend
```

Verify the vault URL and managed identity are correct.

**3. Check external-secrets controller logs:**
```bash
kubectl logs -n external-secrets-system deployment/external-secrets -f
```

Look for authentication errors or API failures.

**4. Test Azure Key Vault access manually:**
```bash
az keyvault secret show --vault-name our-vault --name postgresql-password
```

If this fails, the managed identity probably doesn't have permission to read the secret.

## Azure Key Vault permissions

The managed identity needs these permissions on the Key Vault:

- `get` - read secret values
- `list` - list available secrets

Set via Access Policy:

```bash
az keyvault set-policy \
  --name our-vault \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list
```

Or using Azure RBAC (newer approach):

```bash
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <managed-identity-client-id> \
  --scope /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/our-vault
```

We use RBAC because it integrates better with Azure AD and is the recommended approach.

## Why use external-secrets instead of mounting secrets directly?

Kubernetes CSI driver can mount Azure Key Vault secrets directly into pods. Why use external-secrets?

**CSI driver approach:**
- Secrets mounted as files in pod filesystem
- Synced every 2 minutes (configurable)
- Requires CSI driver installed
- Secrets only available to pods, not to Kubernetes APIs

**external-secrets approach:**
- Secrets stored as Kubernetes Secret objects
- Available to all Kubernetes resources (ConfigMaps, ServiceAccounts, etc.)
- Works with GitOps (ExternalSecret defined in Git, actual secret value in Azure)
- Can transform secrets (combine multiple Key Vault secrets into one Kubernetes Secret)

We prefer external-secrets because it integrates better with GitOps and makes secrets available as native Kubernetes objects.

## Lessons

1. `refreshInterval` is not how quickly secrets sync - it's the maximum delay
2. Changing a secret in Azure doesn't immediately update pods
3. Force syncs by deleting/recreating ExternalSecret or annotating it
4. Pods need restarts to see new secret values
5. Consider versioned secrets for critical rotations

External-secrets works well once you understand its sync model. The hourly refresh default is fine for most use cases. When you need immediate updates, you can force them manually.
