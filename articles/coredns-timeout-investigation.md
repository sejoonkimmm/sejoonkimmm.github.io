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

Maybe 1% of DNS requests. Most lookups worked fine, but every now and then one would hang for 5 seconds and time out.

Users didn't notice because our apps retry failed requests. But it was annoying, and it pointed to something wrong underneath.

Took me 2 days to find the cause. It wasn't CoreDNS. It was conntrack table exhaustion.

## Checking CoreDNS

First thing I suspected was CoreDNS, the Kubernetes DNS server. Checked if pods were healthy:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

All CoreDNS pods running and ready. No restarts.

Checked logs:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=100
```

No errors. Just normal DNS queries being handled.

Checked resource usage:

```bash
kubectl top pods -n kube-system -l k8s-app=kube-dns
```

CPU at 5%, memory at 50MB. Not even close to being stressed.

So CoreDNS was fine. The problem was somewhere else.

## Testing DNS resolution

I created a debug pod to test DNS:

```bash
kubectl run debug --image=busybox --rm -it -- sh
```

Inside the pod:

```bash
# Test DNS resolution
nslookup api.example.com
```

Most of the time it worked instantly. But occasionally it hung for 5 seconds, then timed out. Unpredictable.

Tried querying CoreDNS directly:

```bash
nslookup api.example.com 10.96.0.10
```

(10.96.0.10 is our CoreDNS service IP)

Same thing. Occasional timeouts.

## Checking network connectivity

Maybe packets were getting dropped. I ran tcpdump:

```bash
kubectl exec -it coredns-pod -n kube-system -- tcpdump -i any port 53
```

I could see DNS queries coming in. But for the ones that timed out, CoreDNS never sent a response. The query arrived, but nothing came back.

That was weird. CoreDNS received the query (I could see it in tcpdump) but didn't answer. This narrowed things down.

## Connection tracking (conntrack)

Linux uses conntrack to track network connections. Kubernetes relies on iptables rules that depend on conntrack.

I checked the conntrack table on worker nodes:

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

The conntrack table was 99% full. When it fills up completely, new connections get dropped silently.

That explained everything. When a pod tries to make a DNS query and the conntrack table is full, the connection can't be tracked, so it gets dropped. Query times out after 5 seconds.

## Why was the conntrack table full?

Looked at what was filling it up:

```bash
conntrack -L | head -20
```

Thousands of entries sitting in TIME_WAIT state. These were connections that had already closed but were still taking up space in the table, waiting to be cleaned up.

Our applications make a lot of short-lived HTTP requests. Each one creates a conntrack entry. The default timeout for TIME_WAIT is 120 seconds. With high request volume, entries piled up faster than they expired.

## The fix

Increased the conntrack table size:

```bash
# On each worker node
sysctl -w net.netfilter.nf_conntrack_max=262144
sysctl -w net.netfilter.nf_conn track_buckets=65536

# Make it permanent
echo "net.netfilter.nf_conntrack_max=262144" >> /etc/sysctl.conf
echo "net.netfilter.nf_conntrack_buckets=65536" >> /etc/sysctl.conf
sysctl -p
```

This quadrupled the table size. DNS timeouts stopped immediately.

I also reduced the TIME_WAIT timeout:

```bash
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30
echo "net.netfilter.nf_conntrack_tcp_timeout_time_wait=30" >> /etc/sysctl.conf
```

Old entries now get cleaned up in 30 seconds instead of 120.

## The real fix: connection pooling

Increasing conntrack limits treats the symptom. The actual issue was our apps creating too many short-lived connections. Reusing connections via connection pooling is the proper fix.

Updated the HTTP client config in our applications:

```python
# Before: New connection for every request
import requests
response = requests.get('https://api.example.com/endpoint')

# After: Reuse connections
session = requests.Session()
response = session.get('https://api.example.com/endpoint')
```

Using a Session reuses TCP connections. This reduced conntrack entries by about 90%.

Same idea in other languages:

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

I added Prometheus alerts so this doesn't sneak up on us again:

```yaml
# node-exporter collects these automatically
node_nf_conntrack_entries
node_nf_conntrack_entries_limit
```

Alert rule:

```yaml
- alert: ConntrackTableNearFull
  expr: node_nf_conntrack_entries / node_nf_conntrack_entries_limit > 0.9
  for: 5m
  annotations:
    summary: "Conntrack table is {{ $value }}% full on {{ $labels.instance }}"
```

Now we get alerted before it fills up.

## CoreDNS config tweaks

While I was investigating, I also made some improvements to the CoreDNS config:

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

I increased `max_concurrent` to handle more parallel queries and added `cache 30` to reduce upstream lookups.

## Why this was hard to find

DNS timeouts are tricky to debug because:
- They're intermittent. Only happens when conntrack is full, which isn't constant.
- CoreDNS looks healthy. Because it is healthy. The problem is below it.
- The error happens at the network layer, not the application layer. No useful log messages.

The key clue was that queries were received by CoreDNS but never answered. That pointed away from DNS and toward connection tracking.

## Other DNS issues we've hit

Slow external DNS resolution: CoreDNS was fast for internal services but slow for external domains. Switching to Google/Cloudflare DNS fixed it:

```yaml
forward . 8.8.8.8 1.1.1.1
```

The ndots problem: Kubernetes sets `ndots:5` in resolv.conf by default. This means a query for `api.example.com` first tries `api.example.com.default.svc.cluster.local`, then `api.example.com.svc.cluster.local`, and so on. Five extra lookups before the real one.

I reduced ndots to 2 in pod DNS config:

```yaml
dnsConfig:
  options:
  - name: ndots
    value: "2"
```

This cut DNS query volume by 60%. A surprisingly big win.

CoreDNS pod count: We had 2 CoreDNS pods. Bumped it to 3 for better distribution:

```bash
kubectl scale deployment coredns -n kube-system --replicas=3
```

## Lessons

1. DNS timeouts aren't always a DNS problem
2. Conntrack table size matters when you have lots of short-lived connections
3. Connection pooling reduces conntrack entries dramatically
4. Monitor conntrack usage before it becomes a problem
5. Intermittent issues take patience

After bumping conntrack limits and adding connection pooling, DNS timeouts dropped to zero. The problem was never CoreDNS. It was Linux connection tracking running out of space.
