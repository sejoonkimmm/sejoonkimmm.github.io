---
title: "Automating PostgreSQL Backups to Azure Blob Storage"
date: "29.10.2025"
description: "Set up daily PostgreSQL backups from our Kubernetes cluster to Azure Blob Storage. Using pg_dump in a CronJob with lifecycle policies for retention. Cost is about €8/month for 30 days of backups."
tags: ["PostgreSQL", "Azure", "Backup", "Kubernetes", "CronJob"]
readTime: "8 min read"
image: ""
---

# Automating PostgreSQL Backups to Azure Blob Storage

We run PostgreSQL in Kubernetes using the Zalando operator. It handles replication and failover, but backups are still our responsibility. Last week finally set up proper automated backups to Azure Blob Storage.

Before this, our backup strategy was "Zalando operator has replicas, we'll be fine." Not great. If someone accidentally dropped a table or we had data corruption, we'd be screwed.

## The backup strategy

Daily full backups using pg_dump, stored in Azure Blob Storage:
- Backups run at 2 AM daily (low traffic time)
- Retention: 30 days
- Encrypted at rest in Azure
- Lifecycle policy moves old backups to cool storage
- Cost: about €8/month

## The implementation

Created a Kubernetes CronJob that runs pg_dump and uploads to Azure:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: database
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: postgres-backup-sa
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              #!/bin/sh
              set -e

              # Install Azure CLI
              apk add --no-cache py3-pip
              pip3 install azure-cli

              # Get timestamp for backup file
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              BACKUP_FILE="/tmp/backup-${TIMESTAMP}.sql.gz"

              # Run pg_dump
              echo "Starting backup..."
              pg_dump -h postgres-service \
                      -U postgres \
                      -d production \
                      --verbose \
                      --format=custom \
                      --file=/tmp/backup.dump

              # Compress
              gzip /tmp/backup.dump
              mv /tmp/backup.dump.gz $BACKUP_FILE

              # Upload to Azure
              echo "Uploading to Azure Blob Storage..."
              az storage blob upload \
                --account-name backupsstorage \
                --container-name postgres-backups \
                --name "backup-${TIMESTAMP}.sql.gz" \
                --file $BACKUP_FILE \
                --auth-mode login

              echo "Backup completed: backup-${TIMESTAMP}.sql.gz"

              # Cleanup local file
              rm $BACKUP_FILE
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
          restartPolicy: OnFailure
```

The CronJob:
1. Connects to PostgreSQL using credentials from Kubernetes Secret
2. Runs pg_dump to create a backup
3. Compresses with gzip
4. Uploads to Azure Blob Storage
5. Cleans up local files

## Azure Blob Storage configuration

Created a storage account for backups:

```bash
az storage account create \
  --name backupsstorage \
  --resource-group backups-rg \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot
```

Created a container for PostgreSQL backups:

```bash
az storage container create \
  --name postgres-backups \
  --account-name backupsstorage \
  --auth-mode login
```

## Lifecycle policy for retention

Azure lifecycle policies automatically delete or tier old backups:

```json
{
  "rules": [
    {
      "name": "move-to-cool-after-7-days",
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["backup-"]
        },
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 7
            },
            "delete": {
              "daysAfterModificationGreaterThan": 30
            }
          }
        }
      }
    }
  ]
}
```

This policy:
- Moves backups to cool storage after 7 days (saves money)
- Deletes backups older than 30 days

Applied via:

```bash
az storage account management-policy create \
  --account-name backupsstorage \
  --policy @lifecycle-policy.json \
  --resource-group backups-rg
```

## Managed identity authentication

The CronJob needs permission to write to Azure Blob Storage. Used managed identity instead of storing access keys:

Created a managed identity:

```bash
az identity create \
  --name postgres-backup-identity \
  --resource-group backups-rg
```

Assigned Storage Blob Data Contributor role:

```bash
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee <identity-client-id> \
  --scope /subscriptions/<sub>/resourceGroups/backups-rg/providers/Microsoft.Storage/storageAccounts/backupsstorage
```

Configured the Kubernetes ServiceAccount to use this identity:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: postgres-backup-sa
  namespace: database
  annotations:
    azure.workload.identity/client-id: <identity-client-id>
```

## Testing the backup

Didn't wait for 2 AM. Triggered the CronJob manually to test:

```bash
kubectl create job --from=cronjob/postgres-backup test-backup-1 -n database
```

Watched the logs:

```bash
kubectl logs -f job/test-backup-1 -n database
```

Backup completed in about 3 minutes for our 2GB database. File uploaded to Azure successfully.

## Restore procedure

To restore from a backup:

1. Download backup from Azure:
```bash
az storage blob download \
  --account-name backupsstorage \
  --container-name postgres-backups \
  --name backup-20251029-020015.sql.gz \
  --file backup.sql.gz \
  --auth-mode login
```

2. Decompress:
```bash
gunzip backup.sql.gz
```

3. Restore to PostgreSQL:
```bash
pg_restore -h localhost \
           -U postgres \
           -d production \
           --verbose \
           --clean \
           --if-exists \
           backup.sql
```

The `--clean --if-exists` flags drop existing tables before restoring. Be careful with this in production.

For testing restores, we spin up a temporary PostgreSQL pod and restore there first:

```bash
kubectl run postgres-restore --image=postgres:15 -it --rm -- bash
# Inside the pod: download backup and restore
```

## Monitoring backups

Created alerts for backup failures:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-monitor
  namespace: database
data:
  check-backup.sh: |
    #!/bin/bash
    # Check if backup ran in last 25 hours
    LATEST=$(az storage blob list \
      --account-name backupsstorage \
      --container-name postgres-backups \
      --query "max_by([], &properties.lastModified).properties.lastModified" \
      --auth-mode login)

    HOURS_AGO=$(( ($(date +%s) - $(date -d "$LATEST" +%s)) / 3600 ))

    if [ $HOURS_AGO -gt 25 ]; then
      echo "CRITICAL: Last backup was $HOURS_AGO hours ago"
      exit 1
    else
      echo "OK: Backup is current (${HOURS_AGO}h ago)"
      exit 0
    fi
```

This runs as a separate CronJob every morning and alerts if backups are stale.

## Cost breakdown

Azure Blob Storage costs for backups:

- Storage (Hot tier): 2GB × 7 days × €0.0184/GB = €0.26
- Storage (Cool tier): 2GB × 23 days × €0.0100/GB = €0.46
- Write operations: 30 backups × €0.05/10,000 ops ≈ €0.00
- Read operations (for monitoring): ~100/month ≈ €0.00

**Total: ~€0.72/month**

Wait, that's way less than €8/month I said earlier. Let me recalculate...

Actually checked our Azure bill. We're paying about €7-8/month for the entire backups storage account, which includes:
- PostgreSQL backups (€0.72)
- Application state backups (€2.50)
- Log archives (€3.80)
- Kubernetes etcd snapshots (€1.00)

So PostgreSQL backups alone are under €1/month. Very affordable.

## Why Azure Blob instead of Hetzner Storage Box?

Hetzner offers Storage Box at €3.81/month for 1TB. Way cheaper than Azure Blob if you need lots of storage.

We use Azure because:
1. **Geographic diversity**: Backups are outside Hetzner infrastructure
2. **Integration**: Same cloud as our Key Vault and other Azure services
3. **Durability**: Azure Blob has 11 nines durability guarantee
4. **Automation**: Better API and tooling for lifecycle policies

For larger backups, Hetzner Storage Box makes more sense financially. For our small database, Azure Blob is fine.

## What about WAL archiving?

pg_dump creates point-in-time backups. You can restore to the moment the backup ran, but not to 5 minutes ago if that's between backups.

For true point-in-time recovery, you need WAL (Write-Ahead Log) archiving. This continuously ships transaction logs to storage.

We don't do this because:
- Our data isn't critical enough to justify the complexity
- Daily backups are acceptable for our recovery point objective (RPO)
- Zalando operator handles replication for high availability

If we needed better RPO, we'd set up WAL archiving using pg_basebackup and archive_command.

## Testing restores

Backups are only useful if you can actually restore from them. We test restores monthly:

1. Download latest backup
2. Restore to a test database
3. Run application smoke tests against test database
4. Verify data looks correct

This ensures backups aren't corrupted and our restore procedure works.

Documenting this because I've seen places that have backups but have never actually tried restoring. Don't be that place.

## Improvements we could make

**Incremental backups**: pg_dump creates full backups. For large databases, incremental backups using pgBackRest would be more efficient.

**Backup verification**: Automatically test restore after each backup completes.

**Multiple regions**: Copy backups to a second Azure region for disaster recovery.

**Encryption in transit**: Currently backups are uploaded over HTTPS (encrypted), but we could add application-level encryption before upload.

For now, daily full backups to Azure with 30-day retention is good enough. It's simple, reliable, and cheap.
