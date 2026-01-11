---
title: "Downsizing Hetzner Servers We Don't Need"
date: "08.10.2025"
description: "Looked at actual CPU and memory usage across our Kubernetes nodes. Found we were paying for servers we barely used. Saved €120/month by switching to smaller machines."
tags: ["Hetzner", "Cost Optimization", "Kubernetes", "Capacity Planning"]
readTime: "7 min read"
image: ""
---

# Downsizing Hetzner Servers We Don't Need

We've been running the same Hetzner server configuration for about a year. Eight AX42 dedicated servers - 6 cores, 64GB RAM each, €45/month. Total cost: €360/month.

I finally looked at actual resource usage. Turns out we're using about 40% of the CPU and 55% of the RAM on average. We're paying for capacity we don't need.

## The audit

Pulled Prometheus metrics for the past month and graphed CPU and memory usage across all nodes:

```promql
# CPU usage per node
100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage per node
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

Results:
- **CPU**: Peak usage 55%, average 38%
- **Memory**: Peak usage 68%, average 52%

Even at peak, we had plenty of headroom. We provisioned for growth that hasn't happened yet.

## What we were running

8 nodes total:
- 3 control plane nodes (running Kubernetes control plane components)
- 5 worker nodes (running application pods)

Each node: AX42 (6 cores, 64GB RAM, 512GB NVMe)

Actual pod resource requests:
- **Control plane pods**: ~2 CPU cores, ~8GB RAM per node
- **Application pods**: ~12 CPU cores total across all worker nodes, ~40GB RAM total

We had way more capacity than our workloads actually requested.

## The problem with over-provisioning

When we set up the cluster a year ago, we didn't know how much capacity we'd need. So we went big. The logic was "better too much than too little."

But this means we're paying for servers that spend most of their time idle. Kubernetes can't consolidate workloads onto fewer nodes automatically - if you have 5 worker nodes, Kubernetes will spread pods across all 5.

We're essentially paying €180/month (5 × €45 for worker nodes) for compute power we don't use.

## The new configuration

Switched from AX42 to cheaper options where it made sense:

**Control plane nodes** (3 nodes):
- Old: AX42 (6 cores, 64GB RAM) = €45/month each
- New: AX41 (4 cores, 32GB RAM) = €35/month each
- **Savings**: €10/month per node = €30/month total

Control plane pods don't need much resources. etcd, api-server, controller-manager, scheduler use maybe 2-3 cores and 8GB RAM total. Dropping to 4 cores and 32GB RAM is still plenty.

**Worker nodes** (5 nodes → 3 nodes):
- Kept 3 worker nodes as AX42 (6 cores, 64GB RAM)
- Decommissioned 2 nodes we didn't need
- **Savings**: €90/month

With 3 worker nodes instead of 5, we have 18 total cores and 192GB RAM. Our workloads currently use 12 cores and 40GB RAM. Still plenty of room for growth.

**Total monthly savings: €120 (€1,440/year)**

## The migration process

Can't just turn off servers while they're running production workloads. Had to carefully drain and decommission.

**Step 1: Add new control plane nodes**

Provisioned 3 new AX41 servers and joined them to the cluster as control plane nodes. Used kubeadm to configure them:

```bash
# On each new control plane node
kubeadm join <API-SERVER>:6443 \
  --token <TOKEN> \
  --discovery-token-ca-cert-hash <HASH> \
  --control-plane
```

Now we had 6 control plane nodes (3 old, 3 new). etcd automatically replicates to the new nodes.

**Step 2: Remove old control plane nodes**

For each old control plane node:

```bash
# Drain the node
kubectl drain control-plane-old-1 --ignore-daemonsets --delete-emptydir-data

# Remove from cluster
kubectl delete node control-plane-old-1

# On the node itself
kubeadm reset

# Remove etcd member
etcdctl member remove <MEMBER-ID>
```

Repeated for all 3 old control plane nodes. API server stayed available because we still had 3+ healthy control plane nodes at all times.

**Step 3: Consolidate worker nodes**

We had 5 worker nodes but only needed 3. Picked 2 nodes with the least load and drained them:

```bash
# Move all pods off these nodes
kubectl drain worker-5 --ignore-daemonsets --delete-emptydir-data
kubectl drain worker-4 --ignore-daemonsets --delete-emptydir-data
```

Pods rescheduled to the remaining 3 worker nodes. Checked CPU and memory usage - still had plenty of headroom.

Removed the drained nodes from the cluster:

```bash
kubectl delete node worker-4
kubectl delete node worker-5
```

Canceled the Hetzner server subscriptions for those 2 nodes.

**Step 4: Verify**

After migration:
- All pods running: `kubectl get pods --all-namespaces`
- Nodes healthy: `kubectl get nodes`
- Services responding normally
- Monitoring showing normal CPU/memory usage

Total migration time: about 3 hours. No downtime for users.

## Updated capacity

New setup:
- **Control plane**: 3 × AX41 (4 cores, 32GB RAM) = €105/month
- **Workers**: 3 × AX42 (6 cores, 64GB RAM) = €135/month
- **Total**: €240/month (down from €360/month)

Current utilization after consolidation:
- **CPU**: Peak 65%, average 48%
- **Memory**: Peak 75%, average 60%

Still have room for growth, but we're using capacity more efficiently.

## What about auto-scaling?

Cloud providers have auto-scaling for worker nodes. If you need more capacity, nodes automatically get added. If load drops, nodes get removed.

Hetzner doesn't have this. Dedicated servers have to be manually provisioned. Minimum commitment is 1 month.

This means we have to plan capacity manually. Can't rely on auto-scaling to handle spikes.

Our approach:
- Monitor trends monthly
- Keep 40-50% headroom for growth
- Add nodes when utilization consistently exceeds 70%
- Remove nodes if utilization drops below 40% for 3+ months

Not as elegant as auto-scaling, but it works and saves money.

## Risks with consolidation

**Less redundancy**: With 3 worker nodes instead of 5, losing 1 node means losing 33% of capacity instead of 20%.

We mitigated this by ensuring critical pods have anti-affinity rules to spread across nodes:

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          app: api
      topologyKey: kubernetes.io/hostname
```

This ensures we don't have all replicas of critical services on one node.

**Less buffer for traffic spikes**: If we suddenly get 2x traffic, we might hit capacity limits.

We monitor this closely and have a runbook for rapidly adding nodes if needed. Hetzner can provision new dedicated servers in about 24 hours.

## When not to optimize

If you're growing fast, over-provisioning makes sense. Adding capacity takes time with dedicated servers.

If your traffic is spiky, you need buffer capacity to handle bursts.

If you're running latency-sensitive workloads, having extra CPU headroom reduces noisy neighbor effects.

But if you're in steady state and not hitting capacity limits, you're probably paying for servers you don't need.

## Monthly review process

Now we review capacity monthly:

1. Pull Prometheus metrics for CPU and memory usage
2. Check if utilization exceeds 70% regularly
3. Look at growth trends (is usage increasing month-over-month?)
4. Decide if we need to add or remove nodes

Takes about 30 minutes per month. For €1,440/year in savings, that's worth it.

## The lesson

Don't set up infrastructure and forget about it. What made sense a year ago might not make sense now.

We over-provisioned initially because we didn't know our usage patterns. After a year of data, we knew we could safely downsize.

The flip side is also true - if we had under-provisioned initially, we would have hit capacity issues and needed to scale up.

Starting with more capacity is fine. But eventually you should look at what you actually use and adjust.
