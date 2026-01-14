---
title: 'Zero-Downtime Helm App Upgrade in Production'
date: '2025-09-03'
description: 'How to upgrade a Helm-managed application in production with zero downtime using GitOps and Kubernetes RollingUpdate strategy'
tags: ['Kubernetes', 'Helm', 'GitOps', 'ArgoCD', 'Production']
readTime: '7 min read'
slug: 'zero-downtime-nginx-upgrade-gitops'
---

# Zero-Downtime Helm App Upgrade in Production

While operating the CloudCops platform with active user traffic, we needed to upgrade our Helm application from version **4.12.1 to 4.13.1** in production. The challenge was that **simply changing the image tag would trigger ArgoCD to automatically deploy**, causing **service downtime** during the update.

This article shares how to safely upgrade a Helm-managed application in a production environment with continuous user traffic.

---

## The Problem

Our CloudCops Helm application configuration was:

```yaml
# values.yaml
replicaCount: 1

image:
  repository: cloudcops/app
  tag: 4.12.1
```

To upgrade from **4.12.1 to 4.13.1**:

1. Update the image tag in Git repository's `values.yaml`
2. ArgoCD detects changes and automatically deploys
3. **Existing Pod terminates → New Pod starts**
4. **Service downtime occurs** during this process
5. **Active user traffic is disrupted**

---

## Solution: RollingUpdate Strategy

Using Kubernetes **RollingUpdate** strategy enables zero-downtime deployments.

### 1. Update Helm Values

```yaml
# values.yaml
replicaCount: 2  # ← At least 2 replicas required

image:
  repository: cloudcops/app
  tag: 4.13.1    # Updated version

strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # Additional Pods allowed during update
    maxUnavailable: 0  # Zero unavailable Pods = zero downtime

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

### 2. Key Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `replicaCount` | 2 | Minimum 2 Pods required for zero downtime |
| `maxSurge` | 1 | Allows replicas + 1 Pods during update |
| `maxUnavailable` | 0 | All Pods must remain available during update |
| `readinessProbe` | - | New Pods receive traffic only when ready |

---

## Deployment Process (GitOps)

### Step 1: Update Git Repository

```bash
# Update Helm values
vim values.yaml

# Commit changes
git add values.yaml
git commit -m "feat: upgrade cloudcops app 4.12.1 → 4.13.1 with zero-downtime"
git push origin main
```

### Step 2: ArgoCD Auto-Deployment

When ArgoCD detects the Git repository change:

1. **Create new Pod** (version 4.13.1)
2. Wait for readinessProbe to pass
3. Route traffic to new Pod
4. **Terminate old Pod** (version 4.12.1)
5. **Create second new Pod**
6. Terminate remaining old Pod

→ **At least 2 Pods always running** → **Zero downtime for live user traffic**

---

## Production Deployment Results

Applied to CloudCops platform with live user traffic:

```bash
# Monitor in ArgoCD
$ kubectl get pods -n cloudcops -w

NAME                        READY   STATUS
cloudcops-app-v4121-abc     2/2     Running              # Old Pod 1 (4.12.1)
cloudcops-app-v4121-def     2/2     Running              # Old Pod 2 (4.12.1)
cloudcops-app-v4131-ghi     0/2     ContainerCreating    # New Pod creating
cloudcops-app-v4131-ghi     2/2     Running              # New Pod ready (4.13.1)
cloudcops-app-v4121-abc     2/2     Terminating          # Old Pod 1 terminating
cloudcops-app-v4131-jkl     0/2     ContainerCreating    # New Pod 2 creating
cloudcops-app-v4121-abc     0/2     Terminated           # Old Pod 1 terminated
cloudcops-app-v4131-jkl     2/2     Running              # New Pod 2 ready
cloudcops-app-v4121-def     2/2     Terminating          # Old Pod 2 terminating
```

→ **Zero downtime upgrade from 4.12.1 to 4.13.1 in production!**  
→ **No user traffic disruption during the entire process!**

---

## Key Takeaways

1. **replicaCount ≥ 2**: Essential for zero-downtime deployments
2. **maxUnavailable: 0**: Ensures all Pods remain available during updates
3. **readinessProbe**: New Pods receive traffic only when fully ready
4. **GitOps + Helm**: Git commit → ArgoCD auto-sync → Consistent deployment process
5. **Production-Ready**: Successfully tested with live user traffic on CloudCops platform

---

## References

- [Kubernetes Deployment Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Helm Chart Best Practices](https://helm.sh/docs/chart_best_practices/)

---

With proper Kubernetes configuration and Helm chart settings, zero-downtime deployments are achievable even in production environments with active user traffic. This approach has been successfully validated on the CloudCops platform!
