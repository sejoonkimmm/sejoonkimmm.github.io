---
title: "Adding Nodes to Kubernetes Cluster When Traffic Grew"
date: "17.12.2025"
description: "Traffic increased 40% over 3 months. Nodes were running at 75% CPU. Ordered 2 new Hetzner servers and added them to the cluster. Took about 4 hours from ordering to nodes serving traffic."
tags: ["Kubernetes", "Scaling", "Capacity Planning", "Hetzner", "kubeadm"]
readTime: "6 min read"
---

# Adding Nodes to Kubernetes Cluster When Traffic Grew

Our traffic has been climbing. Started the year at about 1000 requests/minute, now we're at 1400. CPU usage on worker nodes went from 50% average to 75%.

Time to add capacity. I ordered 2 more Hetzner dedicated servers and joined them to the Kubernetes cluster.

The whole process took about 4 hours:
- 30 minutes to order and provision servers
- 2 hours waiting for servers to be ready (went and got coffee)
- 1 hour to install Kubernetes and join the cluster
- 30 minutes watching pods redistribute

## When to scale

We monitor node CPU and memory. I decided to add capacity when:
- Average CPU stayed above 70% for more than a week
- Peak CPU regularly hit 85%+
- Memory usage was above 80%

Could have waited longer, but adding nodes before things get tight is way less stressful than doing it during an outage.

## Ordering Hetzner servers

Logged into Hetzner Robot, ordered 2 x AX42:
- 6 cores (12 threads)
- 64GB RAM
- 512GB NVMe
- 45 euro/month each

I picked the same datacenter (fsn1) as our existing nodes to keep latency low.

Servers were ready in about 30 minutes. Got an email with the SSH root password.

## Initial server setup

SSH'd in and did the basics:

```bash
# Update system
apt update && apt upgrade -y

# Set hostname
hostnamectl set-hostname worker-6
echo "worker-6" > /etc/hostname

# Add SSH key
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAA..." >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Disable password auth
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd

# Install basic tools
apt install -y curl vim htop
```

## Installing Kubernetes

Installed the same Kubernetes version as the existing cluster (1.29.2):

```bash
# Disable swap (required for kubelet)
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

# Load kernel modules
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Set sysctl params
cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
net.netfilter.nf_conntrack_max = 262144
EOF

sysctl --system

# Install containerd
apt install -y containerd
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml
systemctl restart containerd
systemctl enable containerd

# Install kubeadm, kubelet, kubectl
apt-get install -y apt-transport-https ca-certificates curl
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
  gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | \
  tee /etc/apt/sources.list.d/kubernetes.list

apt update
apt install -y kubelet=1.29.2-00 kubeadm=1.29.2-00 kubectl=1.29.2-00
apt-mark hold kubelet kubeadm kubectl

systemctl enable kubelet
```

## Joining the cluster

From a control plane node, I generated a join token:

```bash
kubeadm token create --print-join-command
```

Output:

```
kubeadm join 10.0.0.1:6443 --token abc123.xyz789 \
  --discovery-token-ca-cert-hash sha256:1234abcd...
```

Ran this on the new worker nodes:

```bash
kubeadm join 10.0.0.1:6443 --token abc123.xyz789 \
  --discovery-token-ca-cert-hash sha256:1234abcd...
```

Took about 30 seconds. Both nodes joined.

Verified from the control plane:

```bash
kubectl get nodes
```

New nodes showed up as `NotReady` at first. After about a minute they switched to `Ready` once networking was set up.

## Labeling nodes

Added labels so we know where nodes are:

```bash
kubectl label node worker-6 topology.kubernetes.io/zone=fsn1
kubectl label node worker-7 topology.kubernetes.io/zone=fsn1
```

And role labels:

```bash
kubectl label node worker-6 node-role.kubernetes.io/worker=worker
kubectl label node worker-7 node-role.kubernetes.io/worker=worker
```

## Watching pods migrate

Kubernetes didn't move existing pods to the new nodes right away. That's normal. Pods stay where they are unless something forces them to move.

New pods started scheduling on the new nodes though. Over the next hour, as pods restarted naturally or we did rolling updates, work gradually spread across all 7 worker nodes (up from 5).

If I wanted to speed things up, I could have drained old nodes:

```bash
kubectl drain worker-1 --ignore-daemonsets
kubectl uncordon worker-1
```

Didn't bother. Natural churn redistributed pods within a day.

## Capacity after scaling

Before:
- 5 worker nodes x 6 cores = 30 cores total
- Average 75% CPU = 22.5 cores used

After:
- 7 worker nodes x 6 cores = 42 cores total
- Average 54% CPU = 22.5 cores used

Same workload, but now we have breathing room.

## Cost impact

Added 2 servers at 45 euro/month each = 90 euro/month more.

New total: 8 servers (3 control plane + 5 workers became 3 control plane + 7 workers) = 360 euro/month.

Wait, that's the same cost as before we downsized in October. We removed 3 nodes then, now added 2 back. Net -1 node but higher utilization.

Actually we're doing better:
- October: 8 nodes at 40% utilization
- December: 7 nodes at 54% utilization

Same capacity, using it better.

## Capacity planning

I track these monthly:
- CPU usage (average and peak)
- Memory usage
- Request rate trends
- Pod count

Our request rate has grown about 12% per month for the last 3 months. If that holds, we'll need more capacity in about 5 months.

Planning capacity is easier with self-managed infrastructure. With managed Kubernetes, you pay per node hour. With Hetzner dedicated servers, it's a flat 45 euro/month, so adding nodes is predictable.

## Removing nodes later

If traffic drops, removing nodes is straightforward:

```bash
# Drain the node
kubectl drain worker-7 --ignore-daemonsets --delete-emptydir-data

# Remove from cluster
kubectl delete node worker-7

# On the node itself
kubeadm reset

# Cancel Hetzner server
```

Hetzner servers have a 1-month minimum commitment. If we add a node and don't need it, we're stuck paying for that month.

But 45 euro isn't a big deal if we misjudge. Cloud providers charge that in a few days.

## Auto-scaling limitations

Cloud Kubernetes has cluster autoscaling where nodes get added and removed automatically based on load.

With self-managed Hetzner dedicated servers, that's not an option. Servers take hours to provision, not seconds.

So we have to plan ahead, keep some buffer for traffic spikes, and accept that we can't scale down quickly. That's the tradeoff for lower costs. For predictable workloads, manual scaling works fine.

## Lessons

1. Add capacity before you hit 90% utilization
2. Joining nodes to kubeadm clusters is straightforward
3. Pods naturally redistribute over time, no need to force it
4. Label nodes for topology awareness
5. Manual capacity planning works when growth is steady

The whole thing took about 4 hours of actual work. Most of that was waiting for servers to provision.

Now that it's documented, next time should be faster.
