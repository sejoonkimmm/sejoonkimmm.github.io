---
title: "Creating a Least-Privilege Monitoring User in Zalando Postgres Operator"
date: "05.09.2025"
description: "How I solved the challenge of creating a monitoring-only user with minimal permissions in a GitOps-managed Postgres cluster"
tags: ["Kubernetes", "PostgreSQL", "GitOps", "Security", "Monitoring", "Zalando"]
readTime: "9 min read"
---

# Creating a Least-Privilege Monitoring User in Zalando Postgres Operator

I was working on an internal project where we needed Prometheus monitoring for our PostgreSQL cluster. Should be simple: create a monitoring user, hook it up to postgres-exporter, done.

Except we needed this user to have minimal permissions. Read metrics only, nothing else. The problem? Zalando Postgres Operator's normal user creation doesn't support that.

## The problem

The usual way to create users in Zalando Postgres Operator:

```yaml
users:
  mps_superuser:
    - superuser
    - createdb
```

Fine for application users. But for monitoring, I needed something different. The user should only read PostgreSQL's statistics. No writes, no schema changes, no access to actual data. Just metrics.

Postgres has a built-in role for this called `pg_monitor`. But the operator's user creation doesn't let you create a user that only has this role and nothing else.

## Why I cared about this

If someone gets hold of monitoring credentials, they shouldn't be able to do any damage. They shouldn't be able to change data, drop tables, create databases, or see customer information. They should only see metrics.

That's least privilege: limit the damage if something goes wrong.

## Finding a solution

I found something in the Zalando Postgres Operator docs called "infrastructure roles". It's buried past the basic tutorials, but it does exactly what I needed.

The idea: instead of defining users in the PostgreSQL resource, you use a Secret (for the password) and a ConfigMap (for the role definition). The operator reads both and creates the user with those exact permissions.

## How it actually works

This took me a while to figure out because the flow isn't obvious. Let me walk through it.

### Step 1: Store the password in Azure Key Vault

First, I manually created a password in Azure Key Vault with the key `postgresql-exporter-password`. Just a random strong password.

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

This creates a Kubernetes Secret named `postgres-infrastructure-roles` in the `postgres-operator` namespace with the password from Key Vault. The sync-wave `-880` means this deploys before everything else.

### Step 3: Create the ConfigMap with role definition

Now the ConfigMap that defines what permissions this user gets:

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
- `inrole: [pg_monitor]` gives the user permissions from PostgreSQL's built-in pg_monitor role
- `user_flags: [login]` means the user can log in, but that's it
- `log_statement: none` skips logging this user's queries (they run every 30 seconds, would just be noise)

### Step 4: Configure the operator

Tell the operator to look for infrastructure roles:

```yaml
configKubernetes:
  infrastructure_roles_secret_name: postgres-infrastructure-roles
```

This goes in the postgres-operator Helm values.

### Step 5: What happens when everything deploys

Here's where I had to actually dig into what the operator does:

1. The ExternalSecret controller pulls the password from Key Vault and creates a Secret named `postgres-infrastructure-roles` (sync-wave -880)
2. The operator starts up and reads both the Secret and the ConfigMap with the same name `postgres-infrastructure-roles` (sync-wave -600)
3. The operator sees the `postgres_exporter` key in both:
   - From the Secret: gets the password
   - From the ConfigMap: gets the role definition (`inrole: [pg_monitor]`)
4. When the PostgreSQL cluster starts (sync-wave -500), the operator creates the `postgres_exporter` user in PostgreSQL with the password from the Secret and the permissions from the ConfigMap
5. The operator also creates a second Secret with the credentials: `postgres-exporter.mps-postgres-cluster.credentials.postgresql.acid.zalan.do`

Both secrets live in the `postgres-operator` namespace and contain the same password. I spent way too long looking for these secrets in other namespaces before realizing they were right there.

### Step 6: Using the credentials

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

The exporter runs as a sidecar in the `postgres-operator` namespace, next to the database pods. It connects to PostgreSQL using the `postgres_exporter` user and starts collecting metrics.

### Step 7: Prometheus scrapes the metrics

The exporter exposes metrics on port 9187. I set up a ServiceMonitor so Prometheus scrapes it:

```yaml
serviceMonitor:
  enabled: true
  interval: 30s
  namespace: monitoring
```

Every 30 seconds, Prometheus pulls metrics from the exporter. The flow is:
1. Prometheus (in `monitoring` namespace) hits the exporter sidecar (in `postgres-operator` namespace)
2. Exporter uses `postgres_exporter` user to query PostgreSQL
3. User reads `pg_stat_*` views, exporter formats them as Prometheus metrics
4. Prometheus stores them

## What pg_monitor actually allows

The `pg_monitor` role gives read-only access to:
- Database statistics (`pg_stat_*` views)
- Replication status
- Wait events
- Lock information
- Background worker stats

It does not allow reading table data, writing anything, creating or dropping objects, or changing permissions. Exactly what I wanted.

## Why this order matters

The sync-wave numbers are important:

1. `-880`: ExternalSecret creates the password Secret
2. `-700`: ConfigMap with role definition created
3. `-600`: Postgres operator deployed (reads both)
4. `-500`: Postgres cluster created (operator creates the user)
5. `-400`: Postgres exporter deployed (uses the credentials)

If these run out of order, things break. The operator might start before the Secret exists, or the cluster might come up before the role definition is ready.

## Things that confused me

This took longer than it should have because:

1. I didn't realize the operator reads both a Secret and a ConfigMap with the same name. The docs mention "infrastructure_roles_secret_name" but you also need the ConfigMap. That's easy to miss.
2. The operator creates a second Secret with the same password. I kept wondering where this extra password was coming from until I compared the base64 values and saw they were identical.
3. Both secrets live in `postgres-operator` namespace. I wasted time searching other namespaces, thinking the exporter credentials would be somewhere else.
4. The password comes from Key Vault, not generated by the operator. You have to create it in Key Vault first, manually.

## Looking back

I could have just created a superuser for monitoring. Would have been way faster. But doing it this way means:
- If monitoring credentials leak, attackers can't modify data
- The password is in Key Vault, not hardcoded anywhere
- Everything is declared in Git
- Reproducible across all environments

Took longer, but worth it.

---

*Reference: [Zalando Postgres Operator - User Management](https://postgres-operator.readthedocs.io/en/refactoring-sidecars/user/)*
