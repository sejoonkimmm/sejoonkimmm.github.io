---
title: "Moving Terraform State from Local Files to Azure Storage"
date: "19.11.2025"
description: "We'd been storing Terraform state in Git (bad idea). Moved it to Azure Blob Storage with state locking. Migration took 30 minutes. Should have done this from the start."
tags: ["Terraform", "Azure", "Infrastructure as Code", "State Management"]
readTime: "6 min read"
image: ""
---

# Moving Terraform State from Local Files to Azure Storage

We've been using Terraform for infrastructure but storing state files in Git. This is wrong and I knew it was wrong, but it worked until it didn't.

Last week two people tried to apply Terraform changes at the same time. Both succeeded locally. Remote state got corrupted. Spent 2 hours manually fixing state conflicts.

Finally moved Terraform state to Azure Blob Storage with proper state locking. Should have done this months ago.

## The problem with local state

Terraform state tracks what infrastructure exists. If two people apply changes simultaneously with local state, they both think they're starting from the same state, but they're not. Results in race conditions and state corruption.

Also, storing state in Git means secrets (database passwords, API keys) are in version control. Even if you `.gitignore` the state file, it's too late if someone already committed it.

## Azure Blob Storage backend

Azure Storage supports Terraform state with locking via lease mechanism. Multiple people can read state, but only one can write at a time.

Created a storage account for Terraform state:

```bash
az storage account create \
  --name tfstatestorage \
  --resource-group terraform-rg \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2

az storage container create \
  --name tfstate \
  --account-name tfstatestorage
```

## Migrating existing state

Our current backend config (local):

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

New backend config (Azure):

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-rg"
    storage_account_name = "tfstatestorage"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}
```

Migrated state:

```bash
terraform init -migrate-state
```

Terraform detected the backend change and asked to copy state to Azure:

```
Do you want to copy existing state to the new backend?
  Pre-existing state was found while migrating the previous "local" backend to the
  newly configured "azurerm" backend. No existing state was found in the newly
  configured "azurerm" backend. Do you want to copy this state to the new "azurerm"
  backend? Enter "yes" to copy and "no" to start with an empty state.

  Enter a value: yes
```

Typed `yes`. State uploaded to Azure in 2 seconds.

Verified:

```bash
az storage blob list \
  --container-name tfstate \
  --account-name tfstatestorage \
  --output table
```

State file was there. Migration complete.

## State locking

Azure Storage uses blob leases for locking. When you run `terraform apply`, Terraform:

1. Acquires a lease on the state blob
2. Downloads current state
3. Plans and applies changes
4. Uploads new state
5. Releases the lease

If someone else tries to apply while the lease is held, they get:

```
Error: Error acquiring the state lock

Error message: storage: service returned error: StatusCode=409,
ErrorCode=LeaseAlreadyPresent
```

They have to wait for the first person to finish. This prevents concurrent modifications.

## Authentication

Terraform needs permission to read/write the storage account. Used Azure CLI authentication:

```bash
az login
```

Terraform automatically uses Azure CLI credentials. For CI/CD, use a service principal or managed identity instead.

Created a service principal for GitLab CI:

```bash
az ad sp create-for-rbac --name terraform-ci --role Contributor --scopes /subscriptions/<subscription-id>/resourceGroups/terraform-rg

# Output:
# {
#   "appId": "xxx",
#   "password": "yyy",
#   "tenant": "zzz"
# }
```

Added to GitLab CI variables:

```yaml
variables:
  ARM_CLIENT_ID: $AZURE_APP_ID
  ARM_CLIENT_SECRET: $AZURE_PASSWORD
  ARM_TENANT_ID: $AZURE_TENANT
  ARM_SUBSCRIPTION_ID: $AZURE_SUBSCRIPTION
```

Now CI pipeline can run Terraform with proper authentication.

## Multiple environments

We have dev, staging, and production. Each needs separate state files.

Used workspaces initially:

```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod
```

But workspaces share the same backend configuration, just different state files. This caused confusion.

Better approach - separate backend configs:

```hcl
# environments/dev/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-rg"
    storage_account_name = "tfstatestorage"
    container_name       = "tfstate"
    key                  = "dev.tfstate"
  }
}

# environments/prod/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-rg"
    storage_account_name = "tfstatestorage"
    container_name       = "tfstate"
    key                  = "prod.tfstate"
  }
}
```

Now dev and prod have completely separate state files. No chance of accidentally applying dev changes to prod.

## State versioning

Enabled blob versioning to protect against accidental state deletion or corruption:

```bash
az storage account blob-service-properties update \
  --account-name tfstatestorage \
  --enable-versioning true
```

Now if state gets corrupted, we can restore from a previous version:

```bash
az storage blob list \
  --container-name tfstate \
  --account-name tfstatestorage \
  --include v

# Download specific version
az storage blob download \
  --container-name tfstate \
  --account-name tfstatestorage \
  --name prod.tfstate \
  --version-id xxx \
  --file prod.tfstate.backup
```

## Cost

Azure Blob Storage for Terraform state is cheap:

- Storage: ~1MB state file × €0.0184/GB = €0.00002/month
- Transactions: ~100 reads/writes per month × €0.0004/10k = €0.00004/month

Basically free. State locking via leases has no additional cost.

## Common issues

**Locked state won't release:**

If Terraform crashes, the lease might not release. Force-break it:

```bash
az storage blob lease break \
  --container-name tfstate \
  --blob-name prod.tfstate \
  --account-name tfstatestorage
```

**Can't access state from local machine:**

Make sure you're logged in:

```bash
az login
az account set --subscription <subscription-id>
```

**State got corrupted:**

Restore from blob version:

```bash
az storage blob download \
  --container-name tfstate \
  --account-name tfstatestorage \
  --name prod.tfstate \
  --version-id <previous-version> \
  --file terraform.tfstate

terraform init
```

## Why not S3 or Google Cloud Storage?

We already use Azure for other services (Key Vault, Blob Storage for backups). Keeping Terraform state in Azure keeps everything in one place.

If you're on AWS, use S3 + DynamoDB for locking. On GCP, use Google Cloud Storage. The principle is the same - remote state with locking.

## Lessons

1. Never store Terraform state in Git
2. Always use remote backend with locking
3. Enable versioning for state blobs
4. Use separate state files for different environments
5. Test state migration in dev before doing prod

The migration took 30 minutes including creating the storage account. Should have done this when we first started using Terraform, not after hitting state conflicts.

Remote state with locking prevents a whole class of problems. Do it early.
