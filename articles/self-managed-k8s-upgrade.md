---
title: "Upgrading a Self-Managed Kubernetes Cluster Without Managed Services"
date: "01.10.2025"
description: "Moving from Kubernetes 1.28 to 1.29 on bare metal Hetzner servers. No managed control plane to click 'upgrade' - we had to do it manually. Notes on what actually happened."
tags: ["Kubernetes", "Bare Metal", "Hetzner", "Cluster Management", "kubeadm"]
readTime: "10 min read"
image: ""
---

# Upgrading a Self-Managed Kubernetes Cluster Without Managed Services

We run Kubernetes on Hetzner dedicated servers. Not managed Kubernetes - actual bare metal servers with Kubernetes installed via kubeadm. This means when it's time to upgrade, there's no "click here to upgrade" button. You have to do it yourself.

Last week we went from 1.28.5 to 1.29.2. Took about 6 hours total, mostly waiting and watching. No downtime for users, but there were some tense moments.

## Why we even bother

Kubernetes 1.28 goes out of support soon, and we need to stay within 2 minor versions of the latest release to get security patches. Plus 1.29 has some scheduling improvements we wanted.

With managed Kubernetes (AKS, EKS, GKE), the provider handles control plane upgrades and you just upgrade the worker nodes. With self-managed, you do everything:
- Upgrade control plane nodes
- Update kubeadm, kubelet, kubectl
- Upgrade worker nodes
- Hope nothing breaks

## Pre-upgrade preparation

**Take a full backup of etcd.** This is your "oh shit" recovery option if everything goes wrong:

```bash
ETCDCTL_API=3 etcdctl snapshot save backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

Copied the snapshot to Azure Blob Storage just in case the server itself dies.

**Document current state:**
```bash
kubectl version
kubectl get nodes -o wide
kubectl get pods --all-namespaces | grep -v Running
```

Saved all this output to a file. If things break, you want to know what "working" looked like.

**Check deprecations:**
```bash
kubectl-convert --help
pluto detect-all-in-cluster
```

Used Pluto to scan for deprecated API versions. Found 2 Ingress resources still using the old API that would stop working in 1.29. Updated them before starting the upgrade.

## Control plane upgrade

We have 3 control plane nodes for high availability. Upgraded them one at a time so the API server stayed available.

**First control plane node:**

SSH into the first control plane node and upgrade kubeadm:

```bash
apt-mark unhold kubeadm
apt update
apt install -y kubeadm=1.29.2-00
apt-mark hold kubeadm
```

Check what the upgrade will do:

```bash
kubeadm upgrade plan
```

This shows all the component versions that will change. Read through it carefully. Look for warnings about breaking changes.

Apply the upgrade:

```bash
kubeadm upgrade apply v1.29.2
```

This took about 8 minutes. Kubeadm updates the static pod manifests for api-server, controller-manager, scheduler, etcd. The pods restart automatically.

Watched the pods restart:

```bash
watch kubectl get pods -n kube-system
```

Everything came back up. API server was briefly unavailable (< 30 seconds) but the other 2 control plane nodes kept serving requests.

Upgrade kubelet and kubectl on the same node:

```bash
apt-mark unhold kubelet kubectl
apt install -y kubelet=1.29.2-00 kubectl=1.29.2-00
apt-mark hold kubelet kubectl

systemctl daemon-reload
systemctl restart kubelet
```

Node came back as Ready after about 20 seconds.

**Second and third control plane nodes:**

Repeated the same process on the other control plane nodes, but used `kubeadm upgrade node` instead of `kubeadm upgrade apply`:

```bash
kubeadm upgrade node

apt-mark unhold kubelet kubectl
apt install -y kubelet=1.29.2-00 kubectl=1.29.2-00
apt-mark hold kubelet kubectl

systemctl daemon-reload
systemctl restart kubelet
```

Each node took about 5 minutes. Did them one at a time, waiting for each to be fully healthy before touching the next.

## Worker node upgrades

We have 5 worker nodes. Upgraded them one by one to avoid disrupting services.

For each worker node:

**1. Drain the node:**

```bash
kubectl drain worker-node-1 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --grace-period=30
```

This safely evicts all pods from the node. Pods with PodDisruptionBudgets will only evict if the budget allows it. Took 2-5 minutes per node depending on how many pods were running.

**2. SSH to the node and upgrade:**

```bash
apt-mark unhold kubeadm kubelet kubectl
apt update
apt install -y \
  kubeadm=1.29.2-00 \
  kubelet=1.29.2-00 \
  kubectl=1.29.2-00
apt-mark hold kubeadm kubelet kubectl

kubeadm upgrade node

systemctl daemon-reload
systemctl restart kubelet
```

**3. Uncordon the node:**

```bash
kubectl uncordon worker-node-1
```

Pods start scheduling back to the node immediately.

**4. Verify:**

```bash
kubectl get node worker-node-1
```

Should show v1.29.2 and status Ready.

Repeated this for all 5 worker nodes. Took about 45 minutes total.

## Things that went wrong

**Calico CNI compatibility:** After upgrading the first worker node, pods on that node couldn't reach the API server. They were getting connection timeouts.

Turns out our Calico version (3.26) has known issues with Kubernetes 1.29. Had to upgrade Calico to 3.27 first:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

After upgrading Calico, networking worked fine on the upgraded nodes.

**Cert-manager webhook timing out:** After control plane upgrade, cert-manager started throwing errors about the webhook timing out. The cert-manager pods were still running but couldn't validate resources.

Fixed by restarting the cert-manager pods:

```bash
kubectl rollout restart deployment cert-manager -n cert-manager
kubectl rollout restart deployment cert-manager-webhook -n cert-manager
```

No idea why this was necessary, but it worked.

**Prometheus scraping failures:** Prometheus temporarily lost some metrics during the worker node drains. When a node gets drained, pods move to other nodes and get new IP addresses. Prometheus service discovery took 30-60 seconds to update, so we had small gaps in metrics.

Not a real problem - just cosmetic gaps in Grafana graphs. But good to know it happens.

## Post-upgrade verification

Ran through a checklist:

- [ ] All nodes showing v1.29.2: `kubectl get nodes`
- [ ] All pods running: `kubectl get pods --all-namespaces | grep -v Running`
- [ ] Check critical services responding: curl endpoints
- [ ] Logs not showing errors: `kubectl logs -n kube-system -l component=kube-apiserver --tail=50`
- [ ] Monitoring scraping metrics correctly: check Grafana
- [ ] Ingress routing traffic: test public endpoints
- [ ] Cert-manager issuing certificates: check logs

Everything passed. Cluster was healthy on 1.29.2.

## Rollback plan (we didn't need it)

If the upgrade had broken critical services, the plan was:

1. Restore etcd from the backup snapshot
2. Downgrade kubeadm, kubelet, kubectl to 1.28.5
3. Run `kubeadm upgrade apply v1.28.5` on control plane
4. Restart kubelet on all nodes

This would revert the cluster to the old version. We tested this procedure on a throwaway cluster before doing the production upgrade, so we knew it worked.

Kubernetes doesn't officially support downgrades, but restoring etcd and downgrading the binaries has worked for us in the past.

## Why self-managed Kubernetes is annoying

**Manual work:** Managed Kubernetes providers handle control plane upgrades for you. With self-managed, you have to upgrade kubeadm, kubelet, and kubectl on every single node.

**More risk:** If you mess up the etcd upgrade or break something in the control plane, you're responsible for fixing it. No support ticket to file.

**Time consuming:** This upgrade took 6 hours including prep and verification. With managed Kubernetes, it would take maybe 2 hours (mostly watching worker nodes upgrade automatically).

**Etcd management:** You have to backup and manage etcd yourself. If etcd gets corrupted, your cluster is gone unless you have backups.

## Why we still do it

**Cost:** Managed Kubernetes on Azure would cost us about €1,000/month for equivalent resources. We pay €360/month for Hetzner servers. That's €640/month saved (€7,680/year).

**Control:** We can configure the control plane however we want. Need custom admission controllers? Change API server flags? No problem.

**Learning:** Running self-managed Kubernetes forces you to understand how it actually works. This knowledge is useful when debugging issues.

**Flexibility:** We're not locked into a specific cloud provider's implementation. If we want to migrate, we just point kubeadm at new servers.

For our scale and budget, self-managed makes sense. If we were 10x bigger or handling critical data, we'd probably pay for managed services. But at our size, the cost savings justify the operational overhead.

## Upgrade frequency

We try to upgrade every 3-4 months to stay current. Kubernetes releases a new minor version every 4 months, so this keeps us within 1 version of the latest.

Skipping versions is tempting but makes upgrades harder. If you go from 1.27 to 1.30, you have to deal with 3 versions worth of breaking changes at once. Better to upgrade incrementally.

Next upgrade will be to 1.30, probably in January. By then we'll have 3 months of 1.29 production experience and will know if there are any lurking issues.

## Final thoughts

Self-managed Kubernetes isn't for everyone. But if you're cost-sensitive, technically capable, and willing to trade some operational burden for flexibility, it works.

The key is having runbooks, backups, and a tested rollback procedure. Never upgrade production without knowing how to undo it.
