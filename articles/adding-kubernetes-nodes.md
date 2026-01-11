---
title: "Adding Nodes to Kubernetes Cluster When Traffic Grew"
date: "17.12.2025"
description: "Traffic increased 40% over 3 months. Nodes were running at 75% CPU. Ordered 2 new Hetzner servers and added them to the cluster. Took about 4 hours from ordering to nodes serving traffic."
tags: ["Kubernetes", "Scaling", "Capacity Planning", "Hetzner", "kubeadm"]
readTime: "6 min read"
image: ""
---

# Adding Nodes to Kubernetes Cluster When Traffic Grew

Our traffic has been growing steadily. Started the year at about 1000 requests/minute, now we're at 1400. CPU usage on worker nodes went from 50% average to 75%.

Time to add capacity. Ordered 2 more Hetzner dedicated servers and joined them to the Kubernetes cluster.

Process took about 4 hours total:
- 30 minutes to order and provision servers
- 2 hours waiting for servers to be ready
- 1 hour to install Kubernetes and join cluster
- 30 minutes watching pods redistribute

## When to scale

We monitor node CPU and memory usage. Added capacity when:
- Average CPU > 70% for more than a week
- Peak CPU regularly exceeds 85%
- Memory usage > 80%

Could wait longer, but adding nodes proactively is less stressful than doing it during an incident.

## Ordering Hetzner servers

Logged into Hetzner Robot, ordered 2 × AX42:
- 6 cores (12 threads)
- 64GB RAM
- 512GB NVMe
- €45/month each

Selected same datacenter (fsn1) as existing nodes for lower latency.

Servers provisioned in about 30 minutes. Received email with SSH root password.

## Initial server setup

SSH'd into new servers and did basic setup:

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

Installed same Kubernetes version as existing cluster (1.29.2):

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

From a control plane node, generated join token:

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

Took about 30 seconds. Nodes joined the cluster.

Verified from control plane:

```bash
kubectl get nodes
```

New nodes showed up as `NotReady` initially. After ~1 minute they became `Ready` once networking was configured.

## Labeling nodes

Added labels to identify node locations:

```bash
kubectl label node worker-6 topology.kubernetes.io/zone=fsn1
kubectl label node worker-7 topology.kubernetes.io/zone=fsn1
```

Also added role labels:

```bash
kubectl label node worker-6 node-role.kubernetes.io/worker=worker
kubectl label node worker-7 node-role.kubernetes.io/worker=worker
```

## Watching pods migrate

Kubernetes didn't immediately move pods to new nodes. Existing pods stayed where they were.

But new pods started scheduling on the new nodes. Over the next hour, as pods restarted naturally or we did rolling updates, workload gradually distributed across all 7 worker nodes (was 5, now 7).

To speed this up, could have drained old nodes to force pod rescheduling:

```bash
kubectl drain worker-1 --ignore-daemonsets
kubectl uncordon worker-1
```

But we didn't need to. Natural churn redistributed pods within a day.

## Capacity after scaling

Before:
- 5 worker nodes × 6 cores = 30 cores total
- Average 75% CPU = 22.5 cores used

After:
- 7 worker nodes × 6 cores = 42 cores total
- Average 54% CPU = 22.5 cores used

Went from 75% to 54% utilization. Plenty of headroom for continued growth.

## Cost impact

Added 2 servers at €45/month each = €90/month increase.

New total: 8 servers (3 control plane + 5 workers → 3 control plane + 7 workers) = €360/month.

Wait, that's the same cost as before we downsized in October. We removed 3 nodes then, now added 2 back. Net -1 node but higher utilization.

Actually we're doing better than before:
- October: 8 nodes at 40% utilization
- December: 7 nodes at 54% utilization

Same capacity, but using it more efficiently.

## Capacity planning

Track these metrics monthly:
- CPU usage (average and peak)
- Memory usage
- Request rate trends
- Pod count

Our request rate has grown about 12% per month for the last 3 months. If this continues, we'll need to add capacity again in about 5 months.

Planning capacity is easier with self-managed infrastructure. With managed Kubernetes, you pay per node hour. With Hetzner dedicated servers, you pay per month, so adding nodes is a predictable €45/month cost.

## Removing nodes later

If traffic drops, we can remove nodes:

```bash
# Drain the node
kubectl drain worker-7 --ignore-daemonsets --delete-emptydir-data

# Remove from cluster
kubectl delete node worker-7

# On the node itself
kubeadm reset

# Cancel Hetzner server
```

Hetzner servers have 1-month minimum commitment. If we add a node and realize we don't need it, we're stuck paying for the month.

But €45 isn't a huge waste if we misjudge capacity. Cloud providers charge that in a few days.

## Auto-scaling limitations

Cloud Kubernetes has cluster autoscaling - automatically add/remove nodes based on load.

With self-managed on Hetzner dedicated servers, autoscaling isn't possible. Servers take hours to provision, not seconds.

This means:
- Have to plan capacity proactively
- Keep buffer capacity for traffic spikes
- Can't scale down quickly if traffic drops

Tradeoff for lower costs. For predictable workloads, manual scaling works fine.

## Lessons

1. Add capacity before you're at 90% utilization
2. Joining nodes to kubeadm clusters is straightforward
3. Pods naturally redistribute over time
4. Label nodes for topology awareness
5. Manual capacity planning works for steady growth

Adding 2 nodes took about 4 hours of actual work. Most of that was waiting for servers to provision.

The scaling process is documented now, so next time will be even faster.
