---
title: "CrowdSec WAF on Kubernetes"
date: "14.01.2026"
description: "Needed a WAF for public APIs. Chose CrowdSec (open-source). Hit three integration issues: PostgreSQL namespace, client IP preservation, log collection. Documenting the fixes."
tags: ["Kubernetes", "Security", "WAF", "CrowdSec", "PostgreSQL"]
readTime: "10 min read"
image: ""
---

# CrowdSec WAF on Kubernetes

Had a project where some APIs needed to be public - no authentication. Security risk. Needed a WAF.

Evaluated options. CloudFlare and AWS WAF are expensive (per-request pricing). CrowdSec is open-source with community threat intelligence. Went with CrowdSec.

This documents the integration issues I hit and how I fixed them.

## CrowdSec components

CrowdSec has a distributed architecture. Four main pieces:

- **LAPI**: Central brain. Stores ban decisions, provides API for queries, syncs with community threat feeds.
- **Agent**: Detective. Reads logs, parses attack patterns, reports bad IPs to LAPI.
- **AppSec**: Real-time inspector. Analyzes HTTP payloads for SQL injection, XSS, etc.
- **Bouncer**: Security guard. Sits in front of your app (nginx in my case), checks every request against LAPI.

The separation is nice - detection and enforcement are independent. Can scale each part separately.

![CrowdSec Architecture](/images/articles/crowdsec-architecture.png)

## Traffic flow

Normal request:

![Normal Request Flow](/images/articles/crowdsec-normal-request.png)

1. Request hits nginx
2. Lua bouncer checks LAPI: "is this IP banned?"
3. AppSec checks request payload for attacks
4. Both pass → forward to backend

Blocked attack:

![Blocked Attack Flow](/images/articles/crowdsec-blocked-attack.png)

1. Request hits nginx
2. AppSec detects SQL injection in payload
3. Reports to LAPI, IP gets banned
4. Returns 403 to attacker
5. Future requests from that IP are blocked immediately

## Issue 1: PostgreSQL StatefulSet not created

CrowdSec docs recommend PostgreSQL for production (instead of default SQLite). Used Zalando postgres-operator.

Created the PostgreSQL CR in `crowdsec` namespace. Nothing happened. Operator logs showed:

```
{"cluster-name":"crowdsec/crowdsec-postgres","msg":"pod disruption budget ... created"}
{"cluster-name":"crowdsec/crowdsec-postgres","msg":"defined CPU limit 0 for postgres container is below required minimum"}
```

Then silence. No StatefulSet, no pods.

Tried:
- Restart operator → no effect
- Add resource limits → no effect
- Add optional fields → no effect

### Fix

Moved PostgreSQL to `postgres-operator` namespace:

```yaml
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: crowdsec-postgres
  namespace: postgres-operator  # was: crowdsec
spec:
  preparedDatabases:
    crowdsec:
      defaultUsers: true
      secretNamespace: crowdsec  # credentials still go to crowdsec ns
```

StatefulSet appeared immediately.

Root cause unknown. Some namespace permission issue with the operator. Moving to operator's namespace fixed it.

## Issue 2: Wrong IP in logs

Ran pentests after deployment. CrowdSec Console showed all attacks from same IP - the load balancer's internal IP, not actual attacker IPs.

Setup: Hetzner LB with PROXY Protocol enabled.

```yaml
controller:
  config:
    use-proxy-protocol: "true"
  service:
    annotations:
      load-balancer.hetzner.cloud/uses-proxyprotocol: "true"
```

PROXY Protocol was configured. But wrong IP appeared.

### Root cause

Had `use-forwarded-headers: "true"` in nginx config. This trusts X-Forwarded-For headers.

Problem: Hetzner LB sets X-Forwarded-For to its internal IP. When both PROXY Protocol and use-forwarded-headers are enabled, nginx prioritizes X-Forwarded-For.

### Fix

Remove `use-forwarded-headers`:

```yaml
controller:
  config:
    use-proxy-protocol: "true"
    compute-full-forwarded-for: "true"
    # use-forwarded-headers: removed
```

Actual client IPs appeared after this.

## Issue 3: Agent not collecting logs

Default CrowdSec Agent runs as DaemonSet, mounts `/var/log` from host, reads container logs directly.

Agent pods started fine but collected zero logs.

Problem: containerd log paths are `/var/log/pods/<namespace>_<pod-name>_<uid>/<container>/`. The UID is dynamic. Pattern matching doesn't work reliably.

### Fix

Already had Loki for centralized logging. Switched Agent to use Loki as datasource:

```yaml
agent:
  isDeployment: true
  hostVarLog: false
  
  additionalAcquisition:
    - source: loki
      url: "http://loki-distributed-query-frontend.monitoring:3100"
      query: '{namespace="nginx-public", container="controller"}'
      labels:
        type: nginx
        program: nginx
```

Agent becomes a Deployment instead of DaemonSet. Queries Loki for logs instead of reading from disk.

Bonus: resource usage dropped ~67%. DaemonSet runs on every node. Deployment runs one pod.

## PostgreSQL config

LAPI config for PostgreSQL backend:

```yaml
config:
  config.yaml.local: |
    db_config:
      type: postgresql
      user: crowdsec_owner_user
      password: "${DB_PASSWORD}"
      db_name: crowdsec
      host: crowdsec-postgres.postgres-operator.svc.cluster.local
      port: 5432
      sslmode: require
```

Password comes from Secret created by postgres-operator.

Note: switching from SQLite to PostgreSQL requires re-registering machines and bouncers. With `auto_registration` enabled, just restart Agent and AppSec pods.

## Verification

Ran pentests again after fixing all issues.

This time:
- Attacker IPs appeared correctly in Console
- Attack requests got 403 responses
- IPs appeared in LAPI decision list
- Subsequent requests from banned IPs blocked immediately

WAF working as intended.

## What I learned

1. **postgres-operator namespace quirks**: If StatefulSet creation silently fails, try deploying in `postgres-operator` namespace with `secretNamespace` pointing elsewhere.

2. **PROXY Protocol vs X-Forwarded-For**: They conflict. With PROXY Protocol, don't use `use-forwarded-headers: true`.

3. **Loki as log source**: Simpler than hostPath mounts. If you have centralized logging, use it.

4. **PostgreSQL for production**: SQLite is fine for testing. PostgreSQL gives persistence and horizontal scaling.

## References

- [CrowdSec Docs](https://docs.crowdsec.net/)
- [CrowdSec Helm Chart](https://github.com/crowdsecurity/helm-charts)
- [Ingress NGINX Bouncer Guide](https://docs.crowdsec.net/u/bouncers/ingress-nginx/)
- [CrowdSec AppSec QuickStart](https://docs.crowdsec.net/docs/appsec/quickstart/)
- [Zalando Postgres Operator](https://postgres-operator.readthedocs.io/)
- [NGINX Ingress ConfigMap](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)
- [Hetzner LB PROXY Protocol](https://docs.hetzner.cloud/cloud/load-balancers/overview/#proxy-protocol)
