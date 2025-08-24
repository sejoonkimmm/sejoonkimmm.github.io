---
title: "Managing Secrets in Kubernetes with External Secrets Operator"
date: "2025-08-24"
description: "A comprehensive guide to implementing External Secrets Operator for secure secret management in Kubernetes clusters"
tags: ["Kubernetes", "DevOps", "Security", "External Secrets", "AWS", "Secret Management"]
readTime: "8 min read"
---

# Managing Secrets in Kubernetes with External Secrets Operator



Kubernetes secret management has always been a challenge in production environments. While Kubernetes provides native Secret objects, they come with limitations - secrets are stored in etcd in base64 encoding (not encryption by default), and managing secrets across multiple environments becomes complex.

## The Problem with Native Kubernetes Secrets

Traditional Kubernetes secrets have several drawbacks:

- **Security concerns**: Secrets are stored in etcd as base64-encoded data
- **Manual management**: Creating and updating secrets requires manual intervention
- **Environment drift**: Keeping secrets in sync across multiple clusters is difficult
- **Audit trail**: Limited visibility into secret access and modifications

## Enter External Secrets Operator (ESO)

External Secrets Operator (ESO) is a Kubernetes operator that integrates external secret management systems with Kubernetes. It fetches secrets from external APIs and creates Kubernetes secrets automatically.

### Key Benefits

1. **Centralized secret management**: Use external systems like AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault
2. **Automatic synchronization**: Secrets are automatically updated when changed externally
3. **Enhanced security**: Secrets remain encrypted in external systems
4. **GitOps compatibility**: Secret configurations can be managed through Git

## Implementation with AWS Secrets Manager

Let's implement ESO with AWS Secrets Manager in a real-world scenario.

### Prerequisites

- Kubernetes cluster (EKS recommended for AWS integration)
- AWS CLI configured with appropriate permissions
- Helm 3.x installed

### Step 1: Install External Secrets Operator

```bash
# Add the External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io

# Install ESO
helm install external-secrets external-secrets/external-secrets -n \
external-secrets-system --create-namespace
```

### Step 2: Create AWS IAM Role and Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": "arn:aws:secretsmanager:region:account:secret:your-secret-name/*"
        }
    ]
}
```

### Step 3: Configure SecretStore

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        serviceAccount:
          name: external-secrets-sa
```

### Step 4: Create ExternalSecret

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: prod/database
      property: username
  - secretKey: password
    remoteRef:
      key: prod/database
      property: password
```

## Best Practices

### 1. Use ClusterSecretStore for Organization-Wide Secrets

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: global-aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        serviceAccount:
          name: external-secrets-sa
          namespace: external-secrets-system
```

### 2. Implement Secret Rotation

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-secret
spec:
  refreshInterval: 30m  # Check for updates every 30 minutes
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secret
    creationPolicy: Owner
    deletionPolicy: Retain
```

### 3. Use Template for Complex Secret Formats

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: config-secret
spec:
  target:
    name: app-config
    template:
      type: Opaque
      data:
        config.yaml: |
          database:
            host: {{ .host }}
            port: {{ .port }}
            username: {{ .username }}
            password: {{ .password }}
  data:
  - secretKey: host
    remoteRef:
      key: prod/database
      property: host
  - secretKey: port
    remoteRef:
      key: prod/database
      property: port
```

## Monitoring and Troubleshooting

### Monitor ESO Health

```bash
# Check operator status
kubectl get pods -n external-secrets-system

# View ExternalSecret status
kubectl get externalsecret -A

# Check events for troubleshooting
kubectl describe externalsecret database-credentials
```

### Common Issues

1. **Authentication failures**: Verify IAM roles and service account configuration
2. **Secret not found**: Check secret names and paths in external systems
3. **Refresh issues**: Verify network connectivity and permissions

## Advanced Features

### Multi-Tenancy with Namespace Isolation

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: tenant-a-secrets
  namespace: tenant-a
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        serviceAccount:
          name: tenant-a-sa
```

### Secret Generators for Dynamic Secrets

```yaml
apiVersion: external-secrets.io/v1alpha1
kind: SecretGenerator
metadata:
  name: password-generator
spec:
  kind: Password
  spec:
    length: 32
    digits: 5
    symbols: 5
```

## Conclusion

External Secrets Operator provides a robust solution for managing secrets in Kubernetes environments. By integrating with external secret management systems, it enhances security, reduces operational overhead, and enables GitOps workflows.

Key takeaways:
- ESO bridges the gap between external secret stores and Kubernetes
- Automatic synchronization reduces manual secret management
- Enhanced security through encryption at rest in external systems
- GitOps compatibility enables declarative secret management

As Kubernetes environments continue to grow in complexity, tools like External Secrets Operator become essential for maintaining security and operational efficiency.

---

*This article was written based on real-world implementation experience with External Secrets Operator in production Kubernetes environments.*
