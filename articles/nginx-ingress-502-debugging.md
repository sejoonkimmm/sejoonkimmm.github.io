---
title: "Debugging Random 502 Errors from NGINX Ingress"
date: "12.11.2025"
description: "Users reported occasional 502 errors. Logs showed NGINX couldn't reach backend pods. Took a day to find the issue - pod readiness probes were too aggressive and marking healthy pods as not ready."
tags: ["Kubernetes", "NGINX", "Debugging", "Ingress", "502 Error"]
readTime: "6 min read"
image: ""
---

# Debugging Random 502 Errors from NGINX Ingress

Started getting reports of random 502 errors from users. Not frequent - maybe 1 in every 500 requests. But annoying and unpredictable.

502 means NGINX Ingress couldn't connect to the backend pod. Either the pod is down, or NGINX thinks it's down, or there's a network issue.

Took me a full day to track down. The problem was readiness probes marking healthy pods as not ready.

## The symptoms

Users would occasionally see this:

```
502 Bad Gateway
nginx/1.21.6
```

Looking at NGINX Ingress logs:

```
[error] 123#123: *456 connect() failed (111: Connection refused) while connecting to upstream
```

"Connection refused" means NGINX tried to send a request to a pod, but the pod wasn't listening.

## Checking the pods

Listed pods for the affected service:

```bash
kubectl get pods -l app=api
```

All pods showing `Running` and `2/2` ready. No pods restarting, no obvious problems.

Checked pod logs - no errors, just normal request handling.

So pods are running and healthy, but NGINX occasionally can't connect to them.

## NGINX Ingress endpoint list

NGINX Ingress maintains a list of backend pod IPs. Checked what NGINX thinks the backends are:

```bash
kubectl exec -it -n ingress-nginx ingress-nginx-controller-xxx -- cat /etc/nginx/nginx.conf | grep upstream
```

Found the upstream block:

```nginx
upstream default-api-80 {
    server 10.244.1.45:8080;
    server 10.244.2.78:8080;
    server 10.244.3.12:8080;
}
```

Three pods, matching what kubectl showed. But occasionally one would disappear from this list, causing 502s when NGINX tried to route to it.

## Readiness probe configuration

Checked the deployment:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 2
  successThreshold: 1
  failureThreshold: 3
```

Readiness probe hits `/health` every 5 seconds. If 3 consecutive probes fail, the pod is marked not ready and removed from service endpoints.

This looked fine. But I checked the `/health` endpoint response times:

```bash
kubectl exec -it api-pod -- curl -w "%{time_total}\n" -o /dev/null http://localhost:8080/health
```

Sometimes it responded in 0.01s. Sometimes 1.5s. Sometimes 2.5s.

The timeout is 2 seconds. So occasionally the health check times out, not because the pod is unhealthy, but because it's busy processing requests and the health check is slow to respond.

After 3 timeouts (15 seconds), the pod gets marked not ready and removed from NGINX's upstream list. Then it becomes healthy again and gets added back.

During the brief period when it's marked not ready, any in-flight requests to that pod get 502 errors.

## The fix

Increased readiness probe timeout and failure threshold:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 5  # increased from 2
  successThreshold: 1
  failureThreshold: 5  # increased from 3
```

Now the health check has 5 seconds to respond, and needs to fail 5 times (25 seconds) before the pod is marked not ready.

This gives the pod more leeway during high load. If it's temporarily slow, it won't get immediately removed from the load balancer.

Deployed the change. 502 errors stopped.

## Why health checks were slow

The `/health` endpoint checked database connectivity:

```python
@app.route('/health')
def health():
    # Check database
    db.execute('SELECT 1')
    return 'OK'
```

Under load, database connections could take 1-2 seconds to acquire from the pool. This made the health check slow.

Better approach - separate liveness and readiness:

**Liveness**: Is the process alive?
```python
@app.route('/healthz')
def liveness():
    return 'OK'  # just return immediately
```

**Readiness**: Can it handle requests?
```python
@app.route('/ready')
def readiness():
    # Check database with timeout
    try:
        db.execute('SELECT 1', timeout=3)
        return 'OK'
    except:
        return 'Not ready', 503
```

Liveness is fast and doesn't check dependencies. Readiness checks dependencies but has a higher timeout.

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  timeoutSeconds: 1
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  timeoutSeconds: 5
  failureThreshold: 5
```

## Monitoring probe failures

Added Prometheus metrics to track health check failures:

```python
from prometheus_client import Counter

health_check_failures = Counter('health_check_failures_total', 'Health check failures')

@app.route('/ready')
def readiness():
    try:
        db.execute('SELECT 1', timeout=3)
        return 'OK'
    except Exception as e:
        health_check_failures.inc()
        logger.warning(f"Readiness check failed: {e}")
        return 'Not ready', 503
```

Now we can graph health check failures in Grafana and see if pods are frequently becoming not ready.

## Debugging tips

**Check NGINX Ingress logs:**
```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller -f
```

**Check Service endpoints:**
```bash
kubectl get endpoints service-name
```

Shows which pod IPs are currently in the service. If a pod is not ready, it won't be listed.

**Check pod events:**
```bash
kubectl describe pod pod-name
```

Look for `Readiness probe failed` events.

**Test health endpoint manually:**
```bash
kubectl exec -it pod-name -- curl -v http://localhost:8080/health
```

**Check NGINX upstream config:**
```bash
kubectl exec -it -n ingress-nginx ingress-nginx-controller-xxx -- cat /etc/nginx/nginx.conf
```

## Lessons

1. Readiness probes need generous timeouts - pods under load are slow to respond
2. Health checks should be fast - don't do expensive operations
3. Separate liveness (is process alive) from readiness (can handle traffic)
4. Monitor probe failures to catch flapping pods
5. 502 errors are usually about connectivity, not application errors

After fixing readiness probes, 502 errors dropped to zero. The issue wasn't that pods were unhealthy - it was that we were marking healthy pods as unhealthy because they were slow to respond to health checks.
