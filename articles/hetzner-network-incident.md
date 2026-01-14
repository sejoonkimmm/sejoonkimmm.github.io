---
title: "Hetzner Network Issues and Why We Keep Backups Elsewhere"
date: "24.09.2025"
description: "Hetzner's network had problems in their Falkenstein datacenter. Our services stayed up because we split workloads across regions and keep critical data in Azure."
tags: ["Hetzner", "High Availability", "Incident Response", "Azure", "Multi-Region"]
readTime: "8 min read"
---

# Hetzner Network Issues and Why We Keep Backups Elsewhere

Last Tuesday, Hetzner had network issues in their Falkenstein datacenter. Servers were up, but connectivity was intermittent. Some packets got through, most didn't. Our monitoring showed services timing out randomly.

We run Kubernetes on Hetzner dedicated servers because it's cheap - €40/month for a decent 6-core machine with 64GB RAM. Compared to managed Kubernetes on Azure, we save about 60% on compute costs. But you get what you pay for, and sometimes that includes network problems.

## What broke

Around 11 AM, our monitoring started showing elevated latency and packet loss to servers in fsn1 (Falkenstein). Not a complete outage - about 30% of requests were succeeding, the rest timing out.

Our setup:
- 3 control plane nodes in fsn1
- 5 worker nodes: 3 in fsn1, 2 in nbg1 (Nuremberg)
- PostgreSQL primary in fsn1, replica in nbg1
- Ingress controllers in both locations

When fsn1 had problems, traffic shifted to nbg1 nodes automatically. The NGINX Ingress in Nuremberg took over. Users saw some slow requests but nothing actually broke.

## Why it worked

We deliberately split nodes across Hetzner datacenters. Not because we planned for this specific incident, but because we learned the hard way that keeping everything in one location is risky.

Six months ago, Hetzner had a power issue in fsn1 that took down half our cluster for 2 hours. After that, we spread nodes across fsn1 and nbg1. Different physical locations, different network paths, different power infrastructure.

**Pod topology constraints** ensure critical services run in both locations:

```yaml
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: api
```

This tells Kubernetes to spread pods evenly across zones. If one zone goes down, you still have pods running elsewhere.

**Database replication** across datacenters using Zalando PostgreSQL operator:

```yaml
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: main-db
spec:
  numberOfInstances: 2
  postgresql:
    parameters:
      max_connections: "200"
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: topology.kubernetes.io/zone
          operator: In
          values:
          - fsn1
          - nbg1
```

Primary database in fsn1, standby replica in nbg1. If fsn1 becomes unreachable, we can promote the nbg1 replica to primary. Didn't need to do this during the incident because the database was still accessible, just slow.

## What we got wrong

Even though services stayed up, our deployment pipeline broke. We use ArgoCD for GitOps, and it runs in fsn1. When fsn1 network was flaky, ArgoCD couldn't reliably sync from GitHub or apply changes to the cluster.

This wasn't a crisis because we weren't deploying anything critical, but it was annoying. Had to wait 3 hours for Hetzner to fix their network before we could deploy a feature we'd finished.

**Lesson**: Control plane services like ArgoCD should also be redundant. We've since configured ArgoCD with 2 replicas spread across datacenters.

Also, our monitoring in Grafana showed confusing results during the incident. Prometheus scraped metrics from both datacenters, but when fsn1 was flaky, it would sometimes succeed, sometimes fail. Graphs looked noisy with gaps.

We now have separate Prometheus instances per datacenter that federate to a central Prometheus. This way we can see which specific datacenter has issues instead of getting averaged-out metrics.

## The Azure backup strategy

We use Hetzner for compute because it's cheap. But we don't trust it for critical data storage. Database backups go to Azure Blob Storage every night.

Why Azure and not Hetzner Storage Box?

1. **Geographic diversity**: Our backups physically exist outside Hetzner infrastructure. If Hetzner has a major incident, we can restore from Azure.

2. **Reliability**: Azure Blob Storage has 99.999999999% durability. Hetzner is great for compute, but I trust Microsoft more for long-term data storage.

3. **Integration**: We already use Azure Key Vault for secrets. Having backups in the same cloud environment makes restore procedures simpler.

Our backup script runs as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -Fc postgresql://... > /tmp/backup.dump
              az storage blob upload \
                --account-name backups \
                --container-name postgres \
                --name backup-$(date +%Y%m%d).dump \
                --file /tmp/backup.dump
```

Backups are encrypted at rest in Azure, retained for 30 days, with lifecycle policies to move old backups to cool storage for cost savings.

## Cost comparison

Running Kubernetes on Hetzner is significantly cheaper than managed solutions:

**Hetzner setup:**
- 8 dedicated servers × €45/month = €360/month
- Additional 100TB traffic = €10/month
- **Total: ~€370/month**

**Azure AKS equivalent:**
- 8 D4s_v3 nodes (4 vCPU, 16GB) = ~€900/month
- Load balancer = €20/month
- Egress traffic = €150/month
- **Total: ~€1,070/month**

We save about €700/month by self-managing on Hetzner. That pays for a lot of operational overhead.

**But** we spend about €50/month on Azure services:
- Blob Storage for backups = €15/month
- Key Vault = €5/month
- Small VM for bastion/jumpbox = €30/month

So real savings are €650/month, or about €7,800/year.

## Tradeoffs

**What you give up with Hetzner:**
- No SLA. When something breaks, it's fixed when it's fixed.
- Network quality is generally good but not guaranteed.
- You manage everything - no managed control plane, no automatic upgrades.
- Support is decent but not enterprise-level.

**What you gain:**
- Much lower costs
- Root access to physical servers if needed
- Freedom to configure however you want
- Learning experience (you actually understand Kubernetes because you built it)

For our scale and risk tolerance, it works. If we were handling financial transactions or healthcare data, we'd probably pay for managed services and enterprise SLAs. But for our use case, Hetzner's price/performance ratio makes sense.

## Incident timeline

- 11:00 AM - Network issues begin in fsn1
- 11:05 AM - Monitoring alerts fire for increased latency
- 11:10 AM - Confirm Hetzner status page shows incident
- 11:15 AM - Verify services still responding via nbg1
- 11:30 AM - Notice ArgoCD having sync issues
- 2:00 PM - Hetzner reports issue resolved
- 2:15 PM - Verify all metrics back to normal
- 2:30 PM - Post-incident review meeting

Total customer impact: Some users experienced slow requests for about 3 hours. No complete service outages. No data loss.

## What we improved after

1. **ArgoCD redundancy**: Now runs 2 replicas in different datacenters
2. **Monitoring clarity**: Separate Prometheus per datacenter
3. **Runbooks**: Documented procedure for promoting database replicas
4. **Alerting**: Tuned alerts to distinguish between "one datacenter slow" vs "everything down"

The incident validated our multi-datacenter approach. Spending a bit more for geographic redundancy within Hetzner was worth it.
