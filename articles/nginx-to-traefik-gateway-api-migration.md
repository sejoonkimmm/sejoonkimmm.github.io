---
title: "Migrating Production Ingress from nginx to Traefik Gateway API"
date: "06.06.2026"
description: "CVE-2025-1974 started it. Four months later, three clusters ran Traefik v3 on Gateway API with zero downtime. The honest version: what broke in stage, the certificate deadlock, and the nine days we deliberately did nothing."
tags: ["Kubernetes", "Traefik", "Gateway API", "ArgoCD", "cert-manager", "Networking"]
readTime: "10 min read"
---

# Migrating Production Ingress from nginx to Traefik Gateway API

In early 2025, CVE-2025-1974 hit ingress-nginx. Attackers could abuse the admission controller to run code inside the cluster. We patched it the same week. But the patch wasn't the real problem.

The real problem: nginx-ingress was drifting into maintenance mode, and our ingress config was full of annotations only nginx understands. We needed an ingress we could defend for the next five years.

This is how we moved three production k3s clusters (dev, stage, prod) from nginx-ingress to Traefik v3 on the Kubernetes Gateway API. It took from mid January to mid May. Blog posts usually show you the clean final architecture. This one also shows what broke in stage, the certificate deadlock, and the nine days where the smartest move was to do nothing.

## Why Gateway API

The old Ingress API has one extension point: annotations. Annotations are untyped strings, and every controller invents its own. Your ingress config quietly becomes controller-specific.

Gateway API replaces this with typed resources: Gateway, HTTPRoute, and friends. The config is portable and easy to validate. Moving controllers later stops being a rewrite.

## January: start with the module, not the controller

All three clusters get their ArgoCD setup from one Terraform module. So the migration didn't start with Traefik. It started with reworking that module around Gateway API and HTTPRoute.

The rework took longer than planned and shipped as a new major version (3.0.0) in late March. But it meant every later step was one module version bump, not three hand-edited clusters.

## February: Kong vs NGINX Fabric vs Envoy vs Traefik

The evaluation ticket was literally called "Kong Gateway vs NGINX Fabric". We spiked four candidates against real production traffic patterns:

| Candidate | Notes from our spike |
|---|---|
| Kong Gateway | Full API platform. More product than we needed |
| NGINX Gateway Fabric | Gateway API support was still early |
| Envoy Gateway | Strong, but more moving parts to operate |
| Traefik v3 | Native Gateway API support, fits a small team |

We went with Traefik v3.

## Test where breaking things is free

We didn't try the new ingress in stage first. We tried it in our per-PR preview environments. Every pull request gets its own namespace and subdomain, and everything gets torn down automatically after a few days. It's the cheapest place to break routing: nobody depends on it, and rollback means closing a PR.

Two backend PRs existed only to validate routing through Traefik. Only after that did we touch dev and stage.

## March 23: stage breaks anyway

Stage still found problems that preview environments couldn't. The same day the dev and stage migration moved to testing, we opened an urgent follow-up ticket: three fixes for rollout issues discovered in stage.

The one worth retelling is ordering. ArgoCD applied everything at once. The Gateway and HTTPRoute resources landed before their CRDs were registered, and the sync got stuck on reconcile errors. The fix is sync waves. Lower waves apply first:

```yaml
# Gateway API CRDs
argocd.argoproj.io/sync-wave: "-250"

# Traefik itself (the controller)
argocd.argoproj.io/sync-wave: "-190"

# Gateway and HTTPRoute resources
argocd.argoproj.io/sync-wave: "0"
```

CRDs first. Then the controller that watches them. Then the resources it should reconcile. Obvious in hindsight, less obvious while staging is red.

## Late March: the certificate trap

This one cost us two weeks of calendar time.

cert-manager answers Let's Encrypt HTTP-01 challenges by routing the challenge request to a temporary solver pod. Our ClusterIssuer used the ingress solver, so challenge traffic still expected nginx. Traefik never saw it. We had to add a second issuer with the gatewayHTTPRoute solver and remove duplicate parentRefs from the ClusterIssuer.

And there was a deadlock waiting in the merge order. The new issuer had to be applied to the stage cluster by hand BEFORE merging. Otherwise cert-manager starts re-issuing certificates against a solver path that doesn't exist yet, and the renewal never finishes. The ticket still has the warning note with the exact kubectl command in it.

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

## April and May: prod in four phases, with a pause in the middle

By the time prod came up, dev and stage had been running Traefik for weeks, and nginx was already gone there.

A single-commit migration would have meant 5 to 15 minutes of downtime: ArgoCD auto-sync plus prune deletes the nginx Ingress resources before the Traefik load balancer, DNS, and TLS are ready. We didn't want to explain that to anyone. So the prod ticket was written as four phases:

| Phase | What happens | What it protects against |
|---|---|---|
| 1. Deploy | Traefik, its CRDs, external-dns and cert-manager wiring go live. No traffic moves | Config and CRD problems show up early |
| 2. Dual-stack | Ingress and HTTPRoute both enabled for every service | Real traffic validates Traefik before we commit |
| 3. DNS cutover | Route53 points at the Traefik load balancer. TTL lowered in advance. Watch for 1-2 hours | Rollback is one DNS change away |
| 4. Remove nginx | Only after a soak period (days of watching) | Nothing is left on nginx by now |

During dual-stack we also smoke-tested the preview system's wildcard routing against the new prod Traefik.

The honest part: between writing the plan and executing it, the ticket went back to Todo and sat there for nine days. The title even says "cooldown phase". Nothing was wrong. We just weren't in a hurry. Work resumed at the end of April, and the ticket closed on May 11.

The detail people forget: lower your DNS TTL before the cutover, not during it. If the TTL is 3600 and you cut over, your rollback option also takes an hour to propagate.

## The two services that fought back

Seven services moved. Five were boring (good). Two were not:

- The WebSocket service. Long-lived connections don't like controller switches. We moved it during dual-stack and watched connection drains closely.
- Prometheus and Alertmanager behind OAuth2-proxy. The forward-auth chain had to be rebuilt as middleware and tested end to end. A broken redirect here locks you out of your own monitoring.

## What the timeline actually looked like

| When | What happened |
|---|---|
| Jan 19 | ArgoCD module rework starts |
| Feb 17 | Controller evaluation: Kong vs NGINX Fabric vs Envoy vs Traefik |
| Feb to Mar | Preview environments validate Traefik routing, then dev and stage migrate |
| Mar 23 | Stage reveals rollout issues. Urgent fix ticket, same day |
| Mar 24 to 26 | nginx removed from dev and stage |
| Mar 26 to Apr 8 | Certificate issuer trap found and fixed |
| Mar 31 | Prod migration written up as four phases |
| Apr 20 to 29 | Deliberate pause (the "cooldown phase") |
| May 11 | Prod done. nginx gone everywhere |

Four months of calendar time. Active work was much less. Most of the calendar went to reviews, soak periods, and one deliberate pause. That ratio felt wrong at the time. It was correct.

## Results

- **Zero downtime** across all four phases
- All **three clusters** now run Traefik v3 on Gateway API
- The migration became a template: we later applied the same pattern to a second, unrelated production cluster for a client
- Ingress config is now typed resources instead of annotation strings. Reviews got easier

## Notes if you're doing this

1. Rework your deployment module first. Clusters should consume a version bump, not hand edits
2. Test routing where breaking is free (disposable preview environments), then stage, then prod
3. Sync waves: CRDs, then controller, then routes
4. The certificate solver is its own migration. Plan the issuer switch and the apply order, or you get a re-issuance deadlock
5. Lower DNS TTL days in advance
6. Move WebSocket and auth-proxied services last, during dual-stack, with eyes on them
7. Don't let ArgoCD prune the old controller until the new one has held production traffic for a while

We started this because of a CVE. We finished with an ingress layer we can explain line by line. Fair trade.
