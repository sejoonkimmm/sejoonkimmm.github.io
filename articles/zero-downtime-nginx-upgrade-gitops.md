---
title: 'Zero-Downtime Helm App Upgrade in Production'
date: '2025-09-03'
description: 'How to upgrade a Helm-managed application in production with zero downtime using GitOps and Kubernetes RollingUpdate strategy'
tags: ['Kubernetes', 'Helm', 'GitOps', 'ArgoCD', 'Production']
readTime: '7 min read'
slug: 'zero-downtime-nginx-upgrade-gitops'
---

# Zero-Downtime Helm App Upgrade in Production

We were running the CloudCops platform with live user traffic and needed to upgrade our Helm application from version 4.12.1 to 4.13.1 in production. The problem: if I just changed the image tag, ArgoCD would pick it up and deploy immediately. The old pod would die, the new one would start, and users would hit errors in between.

This is how I set up the upgrade to happen with zero downtime.

---

## The Problem

Our CloudCops Helm config looked like this:

```yaml
# values.yaml
replicaCount: 1

image:
  repository: cloudcops/app
  tag: 4.12.1
```

With only 1 replica, upgrading from 4.12.1 to 4.13.1 would go like this:

1. Update the image tag in `values.yaml` and push to Git
2. ArgoCD detects the change and starts deploying
3. Old pod gets terminated, new pod starts
4. During that gap, the service is down
5. Users get errors

One replica means zero overlap between old and new. That's the core issue.

---

## Solution: RollingUpdate Strategy

Kubernetes has a RollingUpdate strategy that solves this. The idea is simple: start new pods before killing old ones.

### 1. Updated Helm Values

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

### 2. What each setting does

| Setting | Value | What it means |
|---------|-------|---------|
| `replicaCount` | 2 | You need at least 2 pods for zero downtime |
| `maxSurge` | 1 | Kubernetes can temporarily run replicas + 1 pods during the update |
| `maxUnavailable` | 0 | Every pod must stay available during the update |
| `readinessProbe` | - | New pods only get traffic after they pass the health check |

The `maxUnavailable: 0` setting is the important one. It tells Kubernetes: don't take any existing pod down until the new one is ready to handle traffic.

---

## Deployment Process (GitOps)

### Step 1: Push the change

```bash
# Update Helm values
vim values.yaml

# Commit changes
git add values.yaml
git commit -m "feat: upgrade cloudcops app 4.12.1 → 4.13.1 with zero-downtime"
git push origin main
```

### Step 2: ArgoCD takes over

Once ArgoCD sees the Git change, it:

1. Creates a new pod running 4.13.1
2. Waits for the readiness probe to pass
3. Starts routing traffic to the new pod
4. Terminates one old 4.12.1 pod
5. Creates the second new pod
6. Terminates the last old pod

At every point in this process, at least 2 pods are running and accepting traffic. No gap. No errors.

---

## What the deployment looked like

I watched it happen on the CloudCops platform with live traffic:

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

Upgrade from 4.12.1 to 4.13.1 with zero downtime. No users noticed.

---

## Key Takeaways

1. You need at least 2 replicas for zero-downtime deployments. With 1 replica, there's always a gap.
2. `maxUnavailable: 0` is the setting that prevents downtime during updates.
3. Readiness probes matter. Without them, Kubernetes might send traffic to a pod that isn't ready yet.
4. GitOps makes this repeatable: push to Git, ArgoCD syncs, same process every time.
5. We ran this on CloudCops with live traffic. It worked.

---

## References

- [Kubernetes Deployment Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Helm Chart Best Practices](https://helm.sh/docs/chart_best_practices/)

---

With the right Kubernetes settings and Helm config, zero-downtime deployments in production aren't hard. Two replicas, `maxUnavailable: 0`, readiness probes, and you're there. We've been using this on CloudCops since, and it's been reliable.
