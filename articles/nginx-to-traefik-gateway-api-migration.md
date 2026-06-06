---
title: "Migrating Production Ingress from nginx to Traefik Gateway API"
date: "06.06.2026"
description: "CVE-2025-1974 forced a decision: keep patching nginx-ingress or move on. We moved three clusters to Traefik v3 on Gateway API in four phases, with zero downtime. The plan, the gotchas, and the sync-wave trick."
tags: ["Kubernetes", "Traefik", "Gateway API", "ArgoCD", "Networking"]
readTime: "8 min read"
---

# Migrating Production Ingress from nginx to Traefik Gateway API

In early 2025, CVE-2025-1974 hit ingress-nginx. Attackers could abuse the admission controller to run code inside the cluster. We patched it the same week. But the patch wasn't the real problem.

The real problem: nginx-ingress was drifting into maintenance mode, and our ingress config was full of annotations only nginx understands. We needed an ingress we could defend for the next five years.

This post covers how we moved three production k3s clusters (dev, stage, prod) from nginx-ingress to Traefik v3 on the Kubernetes Gateway API. Four phases, zero downtime.

## Why Gateway API

The old Ingress API has one extension point: annotations. Annotations are untyped strings, and every controller invents its own. Your ingress config quietly becomes controller-specific.

Gateway API replaces this with typed resources: Gateway, HTTPRoute, and friends. The config is portable and easy to validate. Moving controllers later stops being a rewrite.

## Picking the controller

We tested four candidates against real production traffic patterns:

| Candidate | Notes from our spike |
|---|---|
| Kong Gateway | Full API platform. More product than we needed |
| NGINX Gateway Fabric | Gateway API support was still early |
| Envoy Gateway | Strong, but more moving parts to operate |
| Traefik v3 | Native Gateway API support, fits a small team |

We went with Traefik v3.

## The ArgoCD trap: CRDs before controllers before routes

Our first staging deploy failed in a confusing way. ArgoCD applied everything at once. The Gateway and HTTPRoute resources landed before their CRDs were registered, and the sync got stuck on reconcile errors.

The fix is sync waves. Lower waves apply first:

```yaml
# Gateway API CRDs
argocd.argoproj.io/sync-wave: "-250"

# Traefik itself (the controller)
argocd.argoproj.io/sync-wave: "-190"

# Gateway and HTTPRoute resources
argocd.argoproj.io/sync-wave: "0"
```

CRDs first. Then the controller that watches them. Then the resources it should reconcile. Obvious in hindsight, less obvious while staging is red.

## Translating nginx annotations into typed middleware

This was the most useful part of the whole migration. Our nginx config was a pile of annotations. Traefik makes you say what you actually mean, as typed Middleware resources.

| nginx annotation | Traefik equivalent |
|---|---|
| force-ssl-redirect | RedirectScheme middleware |
| proxy-body-size | Buffering middleware |
| custom-http-errors | Errors middleware |
| server-snippet | No equivalent. On purpose. |

Example:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: https-redirect
spec:
  redirectScheme:
    scheme: https
    permanent: true
```

The interesting one is `server-snippet`. It lets you inject raw nginx config, and raw config injection is exactly the kind of thing that keeps showing up in ingress CVEs. Traefik has no equivalent, so we rewrote each snippet as a typed resource. It cost us about a day, and the config is healthier for it.

## Why four phases instead of one commit

The naive way: one commit that removes nginx and adds Traefik. ArgoCD would prune nginx before Traefik holds traffic. Our estimate was 5 to 15 minutes of downtime. We didn't want to explain that to anyone.

So: four phases.

| Phase | What happens | What it protects against |
|---|---|---|
| 1. Deploy | Traefik runs next to nginx, takes no traffic | Config and CRD problems show up early |
| 2. Dual-stack | Both controllers serve traffic | Real traffic validates Traefik before we commit |
| 3. DNS cutover | Point DNS at Traefik. TTL lowered in advance | Rollback is one DNS change away |
| 4. Remove nginx | Only after a soak period (days of watching) | Nothing is left on nginx by now |

The detail people forget: lower your DNS TTL before phase 3, not during it. If the TTL is 3600 and you cut over, your rollback option also takes an hour to propagate.

## The two services that fought back

Seven services moved. Five were boring (good). Two were not:

- The WebSocket service. Long-lived connections don't like controller switches. We moved it during dual-stack and watched connection drains closely.
- Prometheus and Alertmanager behind OAuth2-proxy. The forward-auth chain had to be rebuilt as middleware and tested end to end. A broken redirect here locks you out of your own monitoring.

## Results

- **Zero downtime** across all four phases
- All **three clusters** (dev, stage, prod) now run Traefik v3 on Gateway API
- The migration became a template: we later applied the same pattern to a second, unrelated production cluster for a client
- Ingress config is now typed resources instead of annotation strings. Reviews got easier

## Notes if you're doing this

1. Write the annotation translation table before you start, not during. Grep every ingress for annotations and map each one
2. Sync waves: CRDs, then controller, then routes
3. Lower DNS TTL days in advance
4. Move WebSocket and auth-proxied services last, during dual-stack, with eyes on them
5. Don't let ArgoCD prune the old controller until the new one has held production traffic for a while

We started this because of a CVE. We finished with an ingress layer we can explain line by line. Fair trade.
