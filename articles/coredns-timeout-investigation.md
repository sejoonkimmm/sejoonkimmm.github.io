---
title: "DNS Lookups Were Timing Out Randomly in Kubernetes"
date: "10.12.2025"
description: "Applications occasionally failed DNS lookups with 5-second timeouts. Checked CoreDNS logs, CPU usage, network - everything looked fine. Turned out to be conntrack table exhaustion on worker nodes."
tags: ["Kubernetes", "DNS", "CoreDNS", "Debugging", "Networking"]
readTime: "7 min read"
---

# DNS Lookups Were Timing Out Randomly in Kubernetes

Started seeing occasional DNS timeout errors in application logs:

```
Error: Failed to resolve api.example.com: Temporary failure in name resolution
```

Happened maybe 1% of DNS requests. Most lookups worked fine, but occasionally one would timeout after 5 seconds.

Users didn't notice because our apps retry failed requests. But it was annoying and pointed to an underlying issue.

Took me 2 days to track down. Problem was conntrack table exhaustion, not CoreDNS.

## Checking CoreDNS

First suspected CoreDNS (Kubernetes DNS server). Checked if pods were healthy:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

All CoreDNS pods running and ready. No restarts.

Checked logs:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100
```

No errors. Just normal DNS queries being handled.

Checked CPU and memory:

```bash
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

CPU at 5%, memory at 50MB. Plenty of headroom.

So CoreDNS itself was fine. Problem must be elsewhere.

## Testing DNS resolution

Created a debug pod to test DNS:

```bash
kubectl run debug --image=busybox --rm -it -- sh
```

Inside the pod:

```bash
# Test DNS resolution
nslookup api.example.com
```

Most of the time it worked instantly. Occasionally it hung for 5 seconds then timed out.

Tried querying CoreDNS directly:

```bash
nslookup api.example.com 10.96.0.10
```

(10.96.0.10 is our CoreDNS service IP)

Same issue - occasional timeouts.

## Checking network connectivity

Maybe packets were getting dropped somewhere. Tested with tcpdump:

```bash
kubectl exec -it coredns-pod -n kube-system -- tcpdump -i any port 53
```

Saw DNS queries coming in, but for the timed-out requests, there was no response from CoreDNS. The query arrived but no answer was sent.

This was weird. CoreDNS received the query (it's in the tcpdump) but didn't respond.

## Connection tracking (conntrack)

Linux uses conntrack to track network connections. Kubernetes uses iptables rules that depend on conntrack.

Checked conntrack table on worker nodes:

```bash
ssh worker-node-1
sysctl net.netfilter.nf_conntrack_count
sysctl net.netfilter.nf_conntrack_max
```

Output:

```
net.netfilter.nf_conntrack_count = 65519
net.netfilter.nf_conntrack_max = 65536
```

The conntrack table was 99% full. When it fills up, new connections get dropped.

This explained the DNS timeouts. When a pod tries to make a DNS query and the conntrack table is full, the connection can't be established and the query times out.

## Why was conntrack table full?

Checked what was using conntrack entries:

```bash
conntrack -L | head -20
```

Saw thousands of entries for old connections in TIME_WAIT state. These were connections that had closed but were still in conntrack waiting to be cleaned up.

Our applications make a lot of short-lived HTTP requests. Each request creates a conntrack entry. The default timeout for TIME_WAIT is 120 seconds.

With high request volume, conntrack entries accumulated faster than they expired.

## The fix

Increased conntrack table size:

```bash
# On each worker node
sysctl -w net.netfilter.nf_conntrack_max=262144
sysctl -w net.netfilter.nf_conn track_buckets=65536

# Make it permanent
echo "net.netfilter.nf_conntrack_max=262144" >> /etc/sysctl.conf
echo "net.netfilter.nf_conntrack_buckets=65536" >> /etc/sysctl.conf
sysctl -p
```

This quadrupled the conntrack table size. DNS timeouts stopped.

Also reduced TIME_WAIT timeout:

```bash
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30
echo "net.netfilter.nf_conntrack_tcp_timeout_time_wait=30" >> /etc/sysctl.conf
```

This clears old conntrack entries faster.

## Better solution: Connection pooling

The real issue is our apps were creating too many short-lived connections. Better to reuse connections via connection pooling.

Updated HTTP client config in applications:

```python
# Before: New connection for every request
import requests
response = requests.get('https://api.example.com/endpoint')

# After: Reuse connections
session = requests.Session()
response = session.get('https://api.example.com/endpoint')
```

Session reuses TCP connections. This reduces conntrack entries by 90%.

Same fix in other languages:

```go
// Go
client := &http.Client{
  Transport: &http.Transport{
    MaxIdleConns: 100,
    MaxIdleConnsPerHost: 10,
  },
}
```

```javascript
// Node.js
const http = require('http');
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50
});

axios.get(url, { httpAgent: agent });
```

## Monitoring conntrack usage

Added Prometheus metrics for conntrack:

```yaml
# node-exporter collects these automatically
node_nf_conntrack_entries
node_nf_conntrack_entries_limit
```

Created alert:

```yaml
- alert: ConntrackTableNearFull
  expr: node_nf_conntrack_entries / node_nf_conntrack_entries_limit > 0.9
  for: 5m
  annotations:
    summary: "Conntrack table is {{ $value }}% full on {{ $labels.instance }}"
```

Now we get alerted before conntrack fills up completely.

## CoreDNS configuration tweaks

While investigating, also improved CoreDNS config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
          lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
        }
        prometheus :9153
        forward . /etc/resolv.conf {
          max_concurrent 1000  # increased from default
        }
        cache 30  # cache DNS responses for 30 seconds
        loop
        reload
        loadbalance
    }
```

Changes:
- Increased `max_concurrent` to handle more parallel queries
- Added `cache 30` to reduce upstream queries

## Why this was hard to debug

DNS timeouts are tricky because:
- They're intermittent (only when conntrack is full)
- CoreDNS looks healthy (it is healthy)
- Error happens at network layer, not application layer
- No obvious errors in logs

The clue was that queries were received but not answered. This pointed to connection tracking issues rather than DNS server issues.

## Other DNS problems we've seen

**External DNS resolution slow:**

CoreDNS was fast for internal services but slow for external domains. Fixed by using Google/Cloudflare DNS instead of our ISP's DNS:

```yaml
forward . 8.8.8.8 1.1.1.1
```

**ndots causing extra queries:**

Kubernetes sets `ndots:5` in resolv.conf. This means queries for `api.example.com` first try `api.example.com.default.svc.cluster.local`, then `api.example.com.svc.cluster.local`, etc.

Reduced ndots to 2 in pod DNS config:

```yaml
dnsConfig:
  options:
  - name: ndots
    value: "2"
```

This reduced DNS query volume by 60%.

**CoreDNS pod count:**

We had 2 CoreDNS pods. Increased to 3 for better distribution:

```bash
kubectl scale deployment coredns -n kube-system --replicas=3
```

## Lessons

1. DNS timeouts aren't always a DNS problem
2. Conntrack table size matters for high-connection workloads
3. Use connection pooling to reduce conntrack entries
4. Monitor conntrack usage
5. Intermittent issues require patient debugging

After increasing conntrack limits and adding connection pooling, DNS timeouts dropped to zero. The issue wasn't CoreDNS at all - it was Linux connection tracking exhaustion.
