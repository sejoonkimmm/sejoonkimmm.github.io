---
title: "Moving Terraform State from Local Files to Azure Storage"
date: "19.11.2025"
description: "We'd been storing Terraform state in Git (bad idea). Moved it to Azure Blob Storage with state locking. Migration took 30 minutes. Should have done this from the start."
tags: ["Terraform", "Azure", "Infrastructure as Code", "State Management"]
readTime: "6 min read"
---

# Moving Terraform State from Local Files to Azure Storage

We'd been using Terraform for infrastructure but storing state files in Git. I knew this was wrong. It worked until it didn't.

Last week two people ran `terraform apply` at the same time. Both succeeded locally. Remote state got corrupted. I spent 2 hours manually fixing state conflicts. Not fun.

That's when I finally moved Terraform state to Azure Blob Storage with proper locking. Should have done this months ago.

## The problem with local state

Terraform state tracks what infrastructure exists. If two people apply changes at the same time with local state, they both think they're starting from the same state. They're not. You get race conditions and corrupted state.

There's another problem too. State files contain secrets like database passwords and API keys. Storing them in Git means those secrets are in version control. Even if you `.gitignore` the state file later, it's too late if someone already committed it.

## Azure Blob Storage backend

Azure Storage supports Terraform state with locking through a lease mechanism. Multiple people can read state, but only one can write at a time.

I created a storage account for Terraform state:

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

Our old backend config (local):

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

Then I migrated:

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

Typed `yes`. State uploaded in 2 seconds.

I verified it was there:

```bash
az storage blob list \
  --container-name tfstate \
  --account-name tfstatestorage \
  --output table
```

State file showed up. Migration done.

## State locking

Azure Storage uses blob leases for locking. When you run `terraform apply`, here's what happens:

1. Terraform acquires a lease on the state blob
2. Downloads current state
3. Plans and applies changes
4. Uploads new state
5. Releases the lease

If someone else tries to apply while the lease is held:

```
Error: Error acquiring the state lock

Error message: storage: service returned error: StatusCode=409,
ErrorCode=LeaseAlreadyPresent
```

They have to wait. This is exactly what we wanted. No more concurrent modifications.

## Authentication

Terraform needs permission to read and write the storage account. For local development, Azure CLI authentication works:

```bash
az login
```

Terraform picks up Azure CLI credentials automatically. For CI/CD, you need a service principal or managed identity instead.

I created a service principal for GitLab CI:

```bash
az ad sp create-for-rbac --name terraform-ci --role Contributor --scopes /subscriptions/<subscription-id>/resourceGroups/terraform-rg

# Output:
# {
#   "appId": "xxx",
#   "password": "yyy",
#   "tenant": "zzz"
# }
```

Added those to GitLab CI variables:

```yaml
variables:
  ARM_CLIENT_ID: $AZURE_APP_ID
  ARM_CLIENT_SECRET: $AZURE_PASSWORD
  ARM_TENANT_ID: $AZURE_TENANT
  ARM_SUBSCRIPTION_ID: $AZURE_SUBSCRIPTION
```

Now the CI pipeline can run Terraform with proper authentication.

## Multiple environments

We have dev, staging, and production. Each needs its own state file.

I tried workspaces first:

```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod
```

But workspaces share the same backend configuration, just with different state files. This got confusing fast.

Better approach: separate backend configs per environment.

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

Dev and prod now have completely separate state files. No chance of accidentally applying dev changes to prod.

## State versioning

I enabled blob versioning to protect against accidental deletion or corruption:

```bash
az storage account blob-service-properties update \
  --account-name tfstatestorage \
  --enable-versioning true
```

If state gets corrupted, I can restore a previous version:

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

Azure Blob Storage for Terraform state is basically free:

- Storage: ~1MB state file x EUR 0.0184/GB = EUR 0.00002/month
- Transactions: ~100 reads/writes per month x EUR 0.0004/10k = EUR 0.00004/month

State locking via leases costs nothing extra.

## Common issues

**Locked state won't release:**

If Terraform crashes mid-apply, the lease might not release. You can force-break it:

```bash
az storage blob lease break \
  --container-name tfstate \
  --blob-name prod.tfstate \
  --account-name tfstatestorage
```

**Can't access state from local machine:**

Usually means you're not logged in:

```bash
az login
az account set --subscription <subscription-id>
```

**State got corrupted:**

Restore from a blob version:

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

We already use Azure for other things (Key Vault, Blob Storage for backups). Keeping Terraform state in Azure puts everything in one place.

If you're on AWS, use S3 + DynamoDB for locking. On GCP, use Google Cloud Storage. The idea is the same: remote state with locking.

## Lessons

1. Never store Terraform state in Git
2. Always use a remote backend with locking
3. Enable versioning for state blobs
4. Use separate state files for different environments
5. Test state migration in dev before doing prod

The whole migration took 30 minutes, including creating the storage account. I should have done this when we first started using Terraform, not after hitting state conflicts.

Remote state with locking prevents a whole class of problems. Set it up early.
