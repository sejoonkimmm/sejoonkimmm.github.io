---
title: "Migration Diary Part 1: Moving Metrics from Grafana Cloud to Kubernetes"
date: "07.09.2025"
description: "Moving our monitoring from Grafana Cloud to self-hosted Prometheus and Grafana on Kubernetes. Turns out most apps already had metrics support, just needed to enable it."
tags: ["Kubernetes", "Monitoring", "Prometheus", "Grafana", "ArgoCD", "GitOps", "Observability"]
readTime: "9 min read"
image: ""
---

# Migration Diary Part 1: Moving Metrics from Grafana Cloud to Kubernetes

For an internal project at work, we'd been using Grafana Cloud for monitoring. It worked fine, but every month I'd see the bill and think "why am I paying for this when we're already running Kubernetes?"

The whole setup felt kind of backwards. Metrics leave our cluster, travel to Grafana Cloud, then we query them from there. We were literally paying to make our monitoring slower.

So I spent a day moving everything to our own cluster. Most of the work was just enabling metrics that were already there - our ArgoCD apps had Prometheus support built in, I just hadn't turned it on. The bill went from whatever we were paying to basically nothing, since we're just using cluster resources we already had.

*Part 1 is about metrics. Part 2 will be about logs.*

## Why bother?

Look, Grafana Cloud isn't expensive. But we already had a Kubernetes cluster running with spare capacity, all our apps managed through ArgoCD, everything's already there.

And the data flow was just dumb - metrics leave our cluster, go to Grafana Cloud servers, then we pull them back when we want to look at dashboards. Paying for that round trip felt wasteful.

I did some basic math. Running Prometheus and Grafana in our cluster would cost us basically just storage and a bit of CPU - resources we're already paying for. Versus the Grafana Cloud bill. Turns out we'd save like 90% by keeping everything local.

## What I installed

I used `kube-prometheus-stack` - it's basically the standard monitoring setup for Kubernetes. It bundles Prometheus, Grafana, Alertmanager, and a bunch of exporters together. You install one Helm chart and get all of that.

I also added Blackbox Exporter. This is where whitebox vs blackbox monitoring matters.

**Whitebox** = monitoring from inside the app. The app exposes a `/metrics` endpoint and tells you what's happening internally - request rates, errors, queue sizes, whatever. You see the internal state.

**Blackbox** = monitoring from outside. Make actual HTTP requests or TCP connections like a user would. You don't see internal state, but you know if it actually works from the outside.

You need both. Whitebox tells you *why* something's failing. Blackbox tells you *if* it's failing from a user's perspective. Your metrics might look perfect internally, but if your SSL cert expired, users can't connect - blackbox catches that.

Blackbox Exporter probes external endpoints and checks SSL certs, DNS, HTTP availability, stuff like that.

```yaml
# Simplified version of what I deployed
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kube-prometheus-stack
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 79.2.1
    helm:
      values: |
        prometheus:
          prometheusSpec:
            storageSpec:
              volumeClaimTemplate:
                spec:
                  resources:
                    requests:
                      storage: 50Gi
        grafana:
          enabled: true
          adminPassword: # managed via Azure AD
```

## Turns out most apps were ready

Applications like PostgreSQL, NGINX Ingress, Redis, cert-manager, external-secrets-operator - they all have metrics endpoints. You just need to find the right Helm value and flip it to `true`.

For example, with PostgreSQL using the Zalando operator:

```yaml
# In the postgresql chart values
serviceMonitor:
  enabled: true  # This was literally all I needed
  interval: 30s
  namespace: monitoring
```

Once I enabled this, the exporter started exposing metrics, and Prometheus automatically discovered it through the ServiceMonitor.

Same pattern repeated for almost every application:

**NGINX Ingress Controller:**
```yaml
controller:
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
```

**cert-manager:**
```yaml
prometheus:
  enabled: true
  servicemonitor:
    enabled: true
```

**External Secrets Operator:**
```yaml
serviceMonitor:
  enabled: true
  interval: 30s
```

I didn't need to write custom exporters or figure out complicated configurations. The work was already done by the chart maintainers. I just needed to enable it.

## The Process

My approach was simple:

1. **Deploy kube-prometheus-stack** - This gave me the base monitoring infrastructure
2. **Go through each ArgoCD application** - Check the Helm chart values for anything related to `metrics`, `prometheus`, `serviceMonitor`, or `monitoring`
3. **Enable the metrics** - Usually just changing `enabled: false` to `enabled: true`
4. **Commit and push** - GitOps takes care of the rest
5. **Check Prometheus targets** - Verify that Prometheus discovered the new metrics endpoints

The whole migration took me about a day. Most of that time was spent going through documentation to find the right configuration keys for each application.

## What I Learned

**ServiceMonitors are powerful**

The `ServiceMonitor` custom resource is what connects your application to Prometheus. When you enable it in a Helm chart, it creates a ServiceMonitor object that tells Prometheus:
- Where to find your metrics endpoint
- How often to scrape it
- What labels to attach
- Which namespace it's in

Prometheus Operator watches for ServiceMonitors and automatically updates Prometheus configuration. No manual editing of prometheus.yml files.

**Most modern apps are metrics-ready**

If an application is designed to run on Kubernetes and has an official Helm chart, it probably already supports Prometheus metrics. Check the values.yaml file for these keywords:
- `metrics.enabled`
- `serviceMonitor.enabled`
- `prometheus.enabled`
- `monitoring.enabled`

**Understanding whitebox and blackbox monitoring**

The combination of kube-prometheus-stack (whitebox) and Blackbox Exporter (blackbox) gives us complete visibility. We can see what's happening inside our applications and verify that they work correctly from the outside. This dual approach catches issues that either method alone would miss.

## How it worked out

Better than expected honestly. The monitoring bill dropped to like 10% of what it was - we're just using cluster resources we already have. Metrics are faster since nothing leaves the cluster. And we can keep data as long as we want without paying per GB.

Everything's managed through ArgoCD now so it's all in Git. The whole migration took about a day, most of that was finding the right Helm chart keys. Once I got started it was pretty straightforward.

The hardest part was actually deciding to do it.

## Wrapping up

Moving from managed services to self-hosted always sounds scarier than it is. In this case the Kubernetes ecosystem made it pretty easy. Most apps already had metrics support, I just had to enable it.

If you're running Kubernetes and paying for external monitoring, check your Helm charts. You might be surprised how much observability is already there, just turned off.

Part 2 will be about moving our logging stack.

---

*For more details on the kube-prometheus-stack, check out the [official documentation](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)*
