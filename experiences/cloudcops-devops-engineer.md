---
title: "Sejoon Kim as a DevOps Engineer"
organization: "CloudCops GmbH"
role: "DevOps Engineer"
period: "March 2025 - Present"
location: "Bielefeld, Germany"
description: "DevOps and backend engineering across CloudCops' product portfolio on Kubernetes. Cut infrastructure cost 82% with a cloud migration, active CVEs 98% through security automation, and monitoring cost 90% by self-hosting observability."
logo: "/logos/cloudcops.svg"
tags: ["Kubernetes", "ArgoCD", "GitOps", "Security", "Cost Optimization", "Python"]
---

# Sejoon Kim as a DevOps Engineer - CloudCops GmbH

Building infrastructure that teams can trust, and since 2026, the backend features that run on it.

## About CloudCops

CloudCops GmbH is a German DevOps company that operates its own product portfolio alongside client work: a travel platform, a fintech platform for a banking-sector client, and several smaller products. Small team, real production traffic, no separation between "the person who builds it" and "the person who gets paged for it".

## Role Overview

I joined in March 2025 as a DevOps Engineer working across the portfolio: Kubernetes platforms, GitOps deployment, observability, and security automation. Since early 2026 I additionally own backend feature work on the travel platform (Python / Django), which means I now ship features onto infrastructure I also operate.

## Key Projects

### Travel agency platform in Dubai (B2B, B2C)

**Context**: CloudCops product | **Timeline**: March 2025 - Present

The platform's biggest infrastructure decision was leaving managed cloud. I led the migration from Azure AKS to self-managed Kubernetes on Hetzner Cloud: kubeadm HA control plane, Cilium CNI, MetalLB with the Hetzner Cloud Controller Manager. Azure-managed primitives had to be replaced one by one (AAD pod identity with cert-manager plus Vault, managed PostgreSQL with self-hosted PostgreSQL with WAL archiving and point-in-time recovery, Velero for PVC backup and restore).

- **82% monthly cost reduction** in post-migration steady state
- Database cutover via PostgreSQL streaming replication with lag validation, holding write unavailability to roughly 5-10 minutes instead of a full-stack outage

Other work on this platform:

- **Ingress migration**: nginx-ingress to Traefik v3 on Kubernetes Gateway API across three k3s clusters, executed as a 4-phase zero-downtime rollout (deploy, dual-stack, DNS cutover with pre-lowered TTL, nginx removal), triggered by CVE-2025-1974
- **P1 incident and the fix**: PostgreSQL, RabbitMQ, and Typesense had co-scheduled onto one node, which went NotReady under memory pressure and spiked error rates ~400x. I split the cluster into system / workload / data / monitoring nodepools with workload taints, PodAntiAffinity, and zone-aware TopologySpreadConstraints so the failure mode is now blocked at the scheduler level
- **Per-PR preview environments**: ArgoCD ApplicationSet listening to GitHub pull request events, PII-sanitized staging snapshots, per-PR subdomain ingress, namespace resource quotas, 7-day auto-teardown
- **Cluster lifecycle**: soak-gated Kubernetes 1.33 to 1.35 upgrades across dev, stage, and prod
- **Security**: CrowdSec WAF on ingress with scenario tuning to avoid CGNAT false positives
- **Observability**: Tempo distributed tracing with object-storage backend, Traefik request dashboards in Grafana

### Backend feature work on the travel platform (2026)

- **Passport-scanning booking feature, end-to-end**: evaluated 7 OCR options (on-device, cloud, and specialized vendors) with a working demo, selected Azure Document Intelligence, and built the Python / Django OCR backend API
- **GDPR compliance layer for passport data**: field-level encryption at rest, admin-access audit logging, participant consent records, and 30-day retention auto-cleanup via Celery beat, designed from a cross-jurisdiction compliance document I authored
- **Reliability fix**: moved blocking 30-second OCR calls off gunicorn sync workers (which were starving the worker pool under load) onto dedicated Celery async workers with a Redis-backed task contract

### Fintech platform (B2C)

**Context**: banking-sector client | **Timeline**: March 2025 - Present

- **98% CVE reduction**: Trivy adoption end-to-end. Trivy Operator for runtime scanning, a CI gate where Critical findings block merge and High warns, and Renovate-driven base image updates
- **90% monitoring cost reduction**: migrated from Grafana SaaS to self-hosted kube-prometheus-stack (Prometheus, Grafana, Alertmanager, Loki) with full observability retained
- **P2 incident, resolved in 1h35m**: a single expired Azure Service Principal simultaneously broke ArgoCD OIDC, Grafana OIDC, Alertmanager OAuth2-Proxy, and External Secrets Operator. I authored a 4-module Terragrunt recovery runbook, then eliminated the failure class with a daily GitHub Actions workflow alerting on credentials expiring within 30/14/7 days
- **Secure staging environments** for penetration testing and vulnerability management
- **Dual CI ecosystems**: the client stack runs GitLab and GitLab CI on Azure AKS, so my daily work spans GitLab CI here and GitHub Actions on CloudCops products
- **Pattern reuse**: replicated the Gateway API ingress migration from the travel platform cluster, the first concrete proof that our platform layer works across unrelated tenants

### Azure Infrastructure Automation

**Context**: CloudCops internal | **Timeline**: March 2025 - December 2025

- **85% time reduction**: automated Azure App Registration from a manual 4-step workflow into single-push deployment, eliminating manual errors in permission configuration
- **IaC modernization**: reworked script-based Terraform ArgoCD modules into a Helm-based architecture with Gateway API support, version control, and rollback

## Impact & Metrics

| Metric | Result |
|--------|--------|
| Infrastructure cost (travel platform) | 82% reduction via AKS to self-managed migration |
| Active CVEs (fintech client) | 98% reduction |
| Monitoring cost (fintech client) | 90% reduction |
| Azure App Registration time | 85% reduction |
| P2 identity-cascade incident | Recovered in 1h35m, failure class eliminated |

## Technologies & Tools

- **Kubernetes**: k3s, kubeadm, Helm, ArgoCD and ApplicationSet, Cilium, MetalLB, Gateway API, Traefik, cert-manager, Velero
- **IaC & CI/CD**: Terraform, Terragrunt, GitHub Actions, Renovate, Docker
- **Observability**: Prometheus, Grafana, Alertmanager, Loki, Tempo, Sentry
- **Security**: Trivy, CrowdSec, OAuth2-Proxy, Vault, External Secrets Operator
- **Data**: PostgreSQL, MongoDB, RabbitMQ, Redis, Typesense
- **Backend**: Python, Django, Celery
- **Cloud**: Microsoft Azure, Hetzner Cloud

## Reflection

Three things this job keeps teaching me:

1. **Incidents are tuition.** The P1 taught us scheduler-level isolation, the P2 taught us credential lifecycle automation. Both failure classes are now structurally blocked, not just patched.
2. **Platform patterns should be built for reuse.** The Gateway API migration was designed once and applied to two unrelated clusters. That is the difference between doing ops and building a platform.
3. **Operating what you build changes how you build.** Owning backend features on infrastructure I also run made me write more boring, more observable code. The pager is an excellent code reviewer.
