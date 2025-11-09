---
title: "Migration Diary Part 2: Moving Logs from Grafana Cloud to Kubernetes"
date: "09.09.2025"
description: "Setting up Loki and Alloy for log aggregation in our Kubernetes cluster. Learning what all those Loki components actually do."
tags: ["Kubernetes", "Logging", "Loki", "Alloy", "Grafana", "Azure", "Observability"]
readTime: "10 min read"
image: ""
---

# Migration Diary Part 2: Moving Logs from Grafana Cloud to Kubernetes

After moving our metrics to our own cluster (see Part 1), the next obvious step was logs. We were still sending logs to Grafana Cloud, which felt weird now that everything else was local.

The setup was similar - deploy Loki for log storage, use Alloy to collect logs from our pods, view everything in Grafana. But logs are trickier than metrics. You generate way more of them, and storing them gets expensive fast.

*This is Part 2 about logging. Part 1 covered our metrics migration.*

## What I needed to figure out

With metrics, you can throw them in Prometheus and call it a day. Logs are different. You need to think about:

- How do you collect logs from dozens of pods without killing performance?
- Where do you store potentially gigabytes of logs per day?
- How do you make old logs searchable without keeping everything in memory?
- How do you keep costs reasonable when you're generating logs constantly?

I knew I wanted Loki because it's designed for Kubernetes logs and integrates with Grafana. But I didn't really understand how it worked internally.

## The stack: Loki + Alloy

**Loki** handles storage and querying. Think of it like Prometheus but for logs. It doesn't index the full log content (which would be expensive), it just indexes labels. This makes it way cheaper to run.

**Alloy** is Grafana's log collector. It runs as a DaemonSet on every node, reads container logs, and ships them to Loki. It's the newer version of Grafana Agent.

The flow is: Container logs → Alloy (running on each node) → Loki → Grafana for viewing

## Understanding Loki components

Here's what took me a while to understand - Loki isn't just one thing. It's actually multiple components that work together. When you deploy it, you're running several different services:

### Distributor
First stop for incoming logs. Alloy sends logs here. The distributor validates them, makes sure they're formatted correctly, and then forwards them to ingesters. It's basically the front door.

### Ingester
Takes logs from the distributor and writes them to storage. But it doesn't write immediately - it batches logs in memory first, compresses them into "chunks", and then flushes those chunks to storage. This batching is way more efficient than writing every single log line individually.

Ingesters keep recent chunks in memory so queries for recent logs are fast. After a chunk is old enough and compressed, it gets written to long-term storage.

### Querier
Handles log queries from Grafana. When you search for logs, the querier figures out where they are - some might still be in ingesters' memory, others might be in long-term storage. It fetches from both and returns the results.

### Query Frontend
Sits in front of queriers and makes them more efficient. It splits large queries into smaller time ranges, caches results, and parallelizes the work. This means searching through a day of logs doesn't hammer a single querier.

### Compactor
This one's important for keeping costs down. Over time you accumulate thousands of small index files from all the log chunks. The compactor runs periodically and merges these into larger, more efficient files. It also handles deleting old logs based on your retention policy.

Without the compactor, your index would grow forever and queries would get slower as they scan through thousands of tiny files.

### Ruler
Evaluates alert rules on your logs. Similar to Prometheus Alertmanager but for log-based alerts. We're not using this yet but it's there.

### Index Gateway (optional)
In high-scale setups, this component handles index queries separately to reduce load on storage. We're not using it - our scale doesn't need it yet.

## Why all these components?

At first I was confused why Loki needed so many moving parts. But it makes sense when you think about the scale.

If you have 50 pods each generating logs, and you're ingesting thousands of log lines per second, you can't just write them one by one to disk. You need:
- Batching (ingester)
- Efficient querying across time ranges (query frontend)
- Index maintenance so queries don't slow down over time (compactor)
- Separation of recent vs old data (ingesters vs storage)

Each component handles one part of this problem.

## Deploying Loki in "simple scalable" mode

Loki has different deployment modes. I went with "simple scalable" which runs:
- Write path: Distributor + Ingester
- Read path: Query Frontend + Querier
- Backend: Compactor

This gives you horizontal scaling (you can add more ingesters or queriers) without the complexity of running every component separately.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: loki
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://grafana.github.io/helm-charts
    chart: loki
    targetRevision: 6.6.4
    helm:
      values: |
        loki:
          commonConfig:
            replication_factor: 1
          storage:
            type: azure
            azure:
              accountName: # from Azure
              accountKey: # from secret
              containerName: loki-chunks
        write:
          replicas: 2
        read:
          replicas: 2
        backend:
          replicas: 1
```

## Storing logs in Azure Storage Account

Here's the part that made this cost-effective - I'm not storing logs on expensive Kubernetes persistent volumes. I'm using Azure Blob Storage.

Loki writes chunks and indexes to blob storage, which costs way less than keeping everything on SSDs attached to Kubernetes nodes. We're paying like $0.02 per GB per month for blob storage versus $0.10+ per GB for persistent volumes.

The trade-off is that querying old logs is slightly slower since they're in blob storage instead of local disk. But for most queries (which are for recent logs), the ingesters have data in memory anyway, so it's fast.

I created a separate storage account and blob container just for Loki. Then passed the credentials via a Kubernetes secret so Loki can write directly to blob storage.

## Setting up Alloy

Alloy was simpler than I expected. It runs as a DaemonSet (one pod per node) and automatically discovers all containers running on that node.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: alloy
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://grafana.github.io/helm-charts
    chart: alloy
    targetRevision: 0.3.2
    helm:
      values: |
        alloy:
          configMap:
            content: |
              discovery.kubernetes "pods" {
                role = "pod"
              }

              discovery.relabel "pods" {
                targets = discovery.kubernetes.pods.targets
                // Add pod labels as Loki labels
              }

              loki.source.kubernetes "pods" {
                targets    = discovery.relabel.pods.output
                forward_to = [loki.write.default.receiver]
              }

              loki.write "default" {
                endpoint {
                  url = "http://loki-gateway/loki/api/v1/push"
                }
              }
```

Alloy reads logs from `/var/log/pods` on each node, which is where Kubernetes writes all container logs. It adds useful labels like pod name, namespace, container name, and then ships the logs to Loki.

## What I learned about labels

Loki's whole design is based on labels. Unlike traditional logging systems that index every word in your logs, Loki only indexes labels. When you query, you filter by labels first, then grep through the matching logs.

This means choosing good labels matters. We use:
- `namespace` - which Kubernetes namespace
- `pod` - pod name
- `container` - container name within the pod
- `app` - application label from Kubernetes

You want enough labels to narrow down your search, but not so many that you create a ton of unique streams. Each unique combination of labels creates a new "stream" in Loki, and too many streams hurt performance.

## How it's working

The setup's been running for a few weeks now. Logs from all our pods flow into Loki, we can query them in Grafana just like we did with Grafana Cloud.

Retention is set to 30 days. After that, the compactor deletes old chunks from blob storage. We're generating about 10-15GB of logs per day (after compression), which costs us maybe $0.20/day to store in Azure.

Compare that to what we were paying Grafana Cloud for log ingestion and storage - we're saving about as much as we did on metrics. And we have full control over retention policies.

## What I'd improve

If I were doing this again, I'd spend more time on log filtering before they reach Loki. Not every log line is useful. A lot of our pods generate debug logs that we never actually look at. We're storing them anyway.

Alloy can filter logs before sending them to Loki - dropping debug lines, removing sensitive data, etc. I should set that up to reduce storage costs even more.

I'd also set up alerts based on logs earlier. Loki's ruler component can do things like "alert if you see ERROR more than 10 times in 5 minutes". We have that for metrics, should have it for logs too.

## Wrapping up

Moving logs turned out to be more complex than metrics, but not as bad as I expected. The key was understanding that Loki is really multiple components working together, and each one solves a specific problem in the log pipeline.

Using Azure Blob Storage instead of local volumes made this way cheaper than keeping everything in Grafana Cloud. And having logs in the same Grafana instance as our metrics is convenient - I can correlate them in the same dashboard.

The observability migration is complete now. Metrics and logs both running in our cluster, all managed through ArgoCD, total cost is probably 10% of what we were paying for Grafana Cloud.

---

*For more details on Loki components and architecture, check out the [official documentation](https://grafana.com/docs/loki/latest/fundamentals/architecture/)*
