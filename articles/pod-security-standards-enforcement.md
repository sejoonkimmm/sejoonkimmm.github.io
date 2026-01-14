---
title: "Enforcing Pod Security Standards Broke Half Our Deployments"
date: "26.11.2025"
description: "Enabled Pod Security Standards in Kubernetes. Immediately broke 6 out of 12 applications because they were running as root or using privileged containers. Spent 2 days fixing them all."
tags: ["Kubernetes", "Security", "Pod Security", "PSS", "Container Security"]
readTime: "7 min read"
---

# Enforcing Pod Security Standards Broke Half Our Deployments

Kubernetes 1.25 deprecated PodSecurityPolicy and replaced it with Pod Security Standards. We finally enabled PSS in enforce mode last week.

Immediately broke 6 applications that couldn't start because they violated security policies. Spent 2 days fixing containers that were running as root, using privileged mode, or mounting host paths unnecessarily.

## Pod Security Standards levels

Kubernetes defines 3 security levels:

**Privileged**: No restrictions. Containers can do anything.

**Baseline**: Minimal restrictions. Blocks the most dangerous stuff (privileged containers, host namespaces, etc.) but allows running as root.

**Restricted**: Strictest. Requires running as non-root, drops all capabilities, read-only root filesystem.

We enabled Baseline for most namespaces and Restricted for applications.

## Enabling PSS

Added labels to namespaces:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

- `enforce`: Blocks pods that violate the policy
- `audit`: Logs violations but allows pods
- `warn`: Shows warnings during kubectl apply

Started with `warn` mode to see what would break. Found 6 applications that violated Restricted policy.

## Violation 1: Running as root

Most containers ran as root by default. Our API service Dockerfile:

```dockerfile
FROM python:3.11-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

This runs as root (UID 0). PSS Restricted policy requires running as non-root.

Fixed by adding a user:

```dockerfile
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 app

COPY --chown=app:app . /app
WORKDIR /app

USER app
RUN pip install --user -r requirements.txt

CMD ["python", "app.py"]
```

Had to also adjust file permissions so the app user could read its files.

## Violation 2: Writable root filesystem

PSS Restricted requires read-only root filesystem. Our app tried to write logs to `/app/logs/`.

Fixed by writing logs to stdout instead:

```python
# Before
logging.basicConfig(filename='/app/logs/app.log')

# After
logging.basicConfig(stream=sys.stdout)
```

Logs now go to stdout where Kubernetes collects them. Better anyway - logs shouldn't be stored in containers.

For apps that needed to write temporary files, mounted an emptyDir:

```yaml
volumes:
- name: tmp
  emptyDir: {}

volumeMounts:
- name: tmp
  mountPath: /tmp
```

emptyDir is writable even with read-only root filesystem.

## Violation 3: Privileged container

Our monitoring agent (node-exporter) ran in privileged mode:

```yaml
securityContext:
  privileged: true
```

This was because it needed to read host metrics from `/proc` and `/sys`.

Fixed by removing privileged mode and mounting specific host paths:

```yaml
securityContext:
  privileged: false
  capabilities:
    add:
    - SYS_TIME  # only capability it actually needed

volumeMounts:
- name: proc
  mountPath: /host/proc
  readOnly: true
- name: sys
  mountPath: /host/sys
  readOnly: true

volumes:
- name: proc
  hostPath:
    path: /proc
- name: sys
  hostPath:
    path: /sys
```

This is still not Restricted (because it uses hostPath), but it's Baseline-compliant and way better than privileged.

## Violation 4: Host network

Our NGINX Ingress controller used host network:

```yaml
hostNetwork: true
```

This violates Baseline policy. But Ingress controllers legitimately need host network to bind to ports 80/443.

Solution: Exempted the ingress-nginx namespace from PSS:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
  labels:
    pod-security.kubernetes.io/enforce: privileged
```

Some system components need more permissions. That's fine - just isolate them in their own namespace.

## Violation 5: Unnecessary capabilities

One service had this:

```yaml
securityContext:
  capabilities:
    add:
    - ALL
```

Someone added this because the app wasn't working, and giving it all capabilities "fixed" it. But this is a huge security hole.

Debugged what capability was actually needed. Turned out the app needed to bind to port 80, which requires `NET_BIND_SERVICE`.

Fixed:

```yaml
securityContext:
  capabilities:
    drop:
    - ALL
    add:
    - NET_BIND_SERVICE
```

Always drop ALL capabilities first, then add only what's needed.

## Violation 6: SELinux options

One deployment had custom SELinux options that aren't allowed in Restricted mode:

```yaml
securityContext:
  seLinuxOptions:
    type: spc_t
```

We don't actually use SELinux in our cluster. Removed this entirely. Pod started fine.

## Final security context

After fixes, most pods look like this:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL

# If app needs to write files
volumes:
- name: tmp
  emptyDir: {}
volumeMounts:
- name: tmp
  mountPath: /tmp
```

Clean, secure, PSS Restricted-compliant.

## Rolling out PSS

Don't enable enforce mode immediately in production. We did:

1. **Audit mode** (1 week): Log violations, don't block anything
2. **Warn mode** (1 week): Show warnings during deployment
3. **Fix violations** in dev/staging
4. **Enforce mode** in production

This gave us time to fix issues without breaking production.

## PSS vs PSP

PodSecurityPolicy (PSP) was more flexible but also more complex. You could define custom policies with granular controls.

Pod Security Standards (PSS) is simpler - just 3 levels. Less flexible but easier to understand and configure.

If you need custom policies beyond the 3 levels, use OPA Gatekeeper or Kyverno for policy enforcement.

## Monitoring PSS violations

Kubernetes audit logs show PSS violations:

```bash
kubectl get events --all-namespaces | grep PodSecurity
```

We send these events to our logging system (Loki) and alert if violations occur in production.

Also added a Prometheus metric:

```promql
kube_pod_security_policy_violations_total
```

Graph this in Grafana to see violation trends.

## Lessons

1. Don't run containers as root - create a non-root user
2. Read-only root filesystem forces better practices (no writing logs to disk)
3. Drop all capabilities, add back only what's needed
4. Test with warn/audit mode before enforcing
5. Some system components need exemptions (ingress, monitoring)

Pod Security Standards caught real security issues we didn't know we had. Applications running as root with all capabilities are way more dangerous than they need to be.

The 2 days spent fixing violations was worth it for the security improvement.
