---
title: "Creating a Least-Privilege Monitoring User in Zalando Postgres Operator"
date: "05.09.2025"
description: "How I solved the challenge of creating a monitoring-only user with minimal permissions in a GitOps-managed Postgres cluster"
tags: ["Kubernetes", "PostgreSQL", "GitOps", "Security", "Monitoring", "Zalando"]
readTime: "9 min read"
image: ""
---

# Creating a Least-Privilege Monitoring User in Zalando Postgres Operator

I was working on an internal project where we needed Prometheus monitoring for our PostgreSQL cluster. Sounds simple - create a monitoring user, hook it up to postgres-exporter, done.

Except we needed this user to have minimal permissions. Only read metrics, nothing else. The problem? Zalando Postgres Operator's normal user creation doesn't work like that.

## The Problem

The normal way to create users in Zalando Postgres Operator looks like this:

```yaml
users:
  mps_superuser:
    - superuser
    - createdb
```

This works fine for application users. But for monitoring, I needed something different. The user should only be able to read PostgreSQL's statistics - no writes, no schema changes, no access to actual data. Just metrics.

Postgres has a built-in role for this called `pg_monitor`. But the operator's user creation doesn't let you create a user that ONLY has this role and nothing else.

## Why I Cared About This

Look, if someone gets hold of monitoring credentials, they shouldn't be able to do any damage. They shouldn't be able to:
- Change data
- Drop tables
- Create databases
- See customer information

They should only see metrics. That's the whole point of least privilege - limit the blast radius if something goes wrong.

## Finding a Solution

I found something in the Zalando Postgres Operator docs called "infrastructure roles". It's not in the basic tutorials, but it does what I needed.

The idea is: instead of defining users in the PostgreSQL resource, you use a combination of a Secret (for the password) and a ConfigMap (for the role definition). The operator reads both and creates the user with exactly those permissions.

## How It Actually Works

Let me walk through what actually happens. This took me a while to figure out because the flow isn't obvious.

### Step 1: Store the Password in Azure Key Vault

First, I manually created a password in Azure Key Vault with the key `postgresql-exporter-password`. This is just a random strong password - nothing special about it.

### Step 2: Create an External Secret

Then I created an ExternalSecret that pulls that password from Key Vault:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: postgres-infrastructure-roles
  namespace: postgres-operator
  annotations:
    argocd.argoproj.io/sync-wave: "-880"
spec:
  refreshInterval: 1m
  secretStoreRef:
    name: azure-secret-store
    kind: ClusterSecretStore
  target:
    name: postgres-infrastructure-roles
  data:
    - secretKey: postgres_exporter
      remoteRef:
        key: postgresql-exporter-password
```

This creates a Kubernetes Secret named `postgres-infrastructure-roles` in the `postgres-operator` namespace with the password from Key Vault. The sync-wave `-880` means this happens before everything else.

### Step 3: Create the ConfigMap with Role Definition

Now I created a ConfigMap that defines what permissions this user should have:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-infrastructure-roles
  namespace: postgres-operator
  annotations:
    argocd.argoproj.io/sync-wave: "-700"
data:
  postgres_exporter: |
    inrole: [pg_monitor]
    user_flags:
      - login
    db_parameters:
      log_statement: none
```

Breaking this down:
- `inrole: [pg_monitor]` - User gets permissions from PostgreSQL's built-in pg_monitor role
- `user_flags: [login]` - User can log in, but nothing else
- `log_statement: none` - Don't log this user's queries (they run every 30 seconds)

### Step 4: Configure the Operator

Next, I told the operator to look for infrastructure roles:

```yaml
configKubernetes:
  infrastructure_roles_secret_name: postgres-infrastructure-roles
```

This goes in the postgres-operator Helm values.

### Step 5: What Happens When Everything Deploys

Here's where I had to actually look at what the operator does:

1. The ExternalSecret controller pulls the password from Key Vault and creates a Secret named `postgres-infrastructure-roles` (sync-wave -880)
2. The operator starts up and reads BOTH the Secret and the ConfigMap with the same name `postgres-infrastructure-roles` (sync-wave -600)
3. The operator sees the `postgres_exporter` key in both:
   - From the Secret: gets the password
   - From the ConfigMap: gets the role definition (`inrole: [pg_monitor]`)
4. When the PostgreSQL cluster starts (sync-wave -500), the operator creates the `postgres_exporter` user in PostgreSQL with:
   - The password from the Secret
   - The permissions defined in the ConfigMap
5. The operator ALSO creates a second Secret with the credentials: `postgres-exporter.mps-postgres-cluster.credentials.postgresql.acid.zalan.do`

Both secrets live in the `postgres-operator` namespace and contain the same password. I spent way too long looking for these secrets in other namespaces before I realized they're both right there.

### Step 6: Using the Credentials

Now I can reference the operator-created secret in the postgres-exporter sidecar:

```yaml
sidecars:
  - name: exporter
    image: quay.io/prometheuscommunity/postgres-exporter:v0.17.1
    env:
      - name: DATA_SOURCE_USER
        value: postgres_exporter
      - name: DATA_SOURCE_PASS
        valueFrom:
          secretKeyRef:
            name: postgres-exporter.mps-postgres-cluster.credentials.postgresql.acid.zalan.do
            key: password
```

The exporter runs as a sidecar in the `postgres-operator` namespace, right next to the database pods. It connects to PostgreSQL using the `postgres_exporter` user and starts collecting metrics.

### Step 7: Prometheus Scrapes the Metrics

The exporter exposes metrics on port 9187. I configured a ServiceMonitor so Prometheus (running in the `monitoring` namespace) would scrape it:

```yaml
serviceMonitor:
  enabled: true
  interval: 30s
  namespace: monitoring
```

Every 30 seconds, Prometheus pulls metrics from the exporter. The flow is:
1. Prometheus (in `monitoring` namespace) → exporter sidecar (in `postgres-operator` namespace)
2. Exporter uses `postgres_exporter` user → PostgreSQL
3. User reads `pg_stat_*` views → exporter formats as Prometheus metrics
4. Prometheus stores the metrics

## What pg_monitor Actually Allows

The `pg_monitor` role gives read-only access to:
- Database statistics (`pg_stat_*` views)
- Replication status
- Wait events
- Lock information
- Background worker stats

It does NOT allow:
- Reading table data
- Writing anything
- Creating or dropping objects
- Modifying permissions

Perfect for monitoring.

## Why This Order Matters

The sync-wave numbers are critical:

1. `-880`: ExternalSecret creates the password Secret
2. `-700`: ConfigMap with role definition created
3. `-600`: Postgres operator deployed (reads both)
4. `-500`: Postgres cluster created (operator creates the user)
5. `-400`: Postgres exporter deployed (uses the credentials)

If these run out of order, things break. The operator might start before the Secret exists, or it might create the user with wrong permissions.

## Things That Confused Me

This took longer than it should have because:

1. I didn't realize the operator reads BOTH a Secret and a ConfigMap with the same name. The docs mention "infrastructure_roles_secret_name" but you also need the ConfigMap.
2. The operator creates a second Secret with the same password. I kept looking for where this password was coming from until I compared the base64 values and realized they're identical.
3. Both secrets live in `postgres-operator` namespace. I spent time searching other namespaces thinking the exporter credentials would be somewhere else.
4. The password comes from Key Vault, not generated by the operator. You have to manually create it in Key Vault first.

## Looking Back

I could have just created a superuser for monitoring. Would have been way faster. But doing it this way meant:
- If the monitoring credentials leak, attackers can't modify data
- The password is managed in Key Vault, not hardcoded anywhere
- Everything is declared in Git
- Reproducible across all environments

Took longer but worth it.

---

*Reference: [Zalando Postgres Operator - User Management](https://postgres-operator.readthedocs.io/en/refactoring-sidecars/user/)*
