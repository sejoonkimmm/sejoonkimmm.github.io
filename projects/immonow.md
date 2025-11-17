---
title: "app.immonow.at"
date: "August 2025 - Present"
description: "Secure DevSecOps infrastructure with automated vulnerability management. Achieved 98% CVE reduction and 90% cost savings on monitoring through Prometheus and Grafana self-hosting."
tags: ["DevSecOps", "Kubernetes", "Trivy", "Grafana", "Prometheus", "Security", "GitLab", "ArgoCD"]
readTime: "6 min read"
image: "/images/projects/immonow.jpg"
---

# app.immonow.at - DevSecOps Platform

Building secure, observable infrastructure for Raiffeisen Immobilien's real estate platform with automated vulnerability management and cost-effective monitoring.

## Project Overview

app.immonow.at is Raiffeisen Immobilien's real estate platform serving users across Austria. As the DevSecOps Engineer on this project, I implemented comprehensive security automation using Trivy Operator, cost-optimized monitoring infrastructure, and secure testing environments.

## Key Achievements

### 98% CVE Reduction
Automated vulnerability management through Trivy Operator:
- Deployed Trivy Operator via Helm chart managed by ArgoCD
- Automated continuous vulnerability scanning across all container images
- Created real-time vulnerability tracking with Prometheus metrics
- Reduced active CVEs from 150+ to less than 5
- **Impact**: Dramatically improved security posture with zero manual intervention

### 90% Cost Savings on Monitoring
Migrated from SaaS to self-hosted observability stack:
- Built self-hosted Grafana infrastructure on Kubernetes
- Integrated Prometheus for metrics collection from Trivy Operator
- Configured Loki for centralized log aggregation
- Maintained 100% feature parity with previous SaaS solution
- **Impact**: Reduced costs from $500/month to $50/month

### Automated Security Reporting
Established comprehensive security visibility:
- Created Grafana dashboards tracking CVE counts by severity (Critical, High, Medium, Low)
- Implemented compliance score calculations and tracking
- Integrated Slack notifications for daily vulnerability reports
- Built automated alerting for critical security findings
- **Impact**: Security team response time reduced from 24 hours to under 1 hour

### Secure Testing Environments
Enabled safe penetration testing:
- Designed isolated staging environments with production-like configurations
- Implemented network segmentation for security testing
- Created automated environment provisioning workflows
- Established clear security testing protocols and runbooks
- **Impact**: Enabled regular penetration testing without production risk

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   ArgoCD     │─deploys→│ Trivy        │                 │
│  │              │         │ Operator     │                 │
│  │  (GitOps)    │         │  (Helm)      │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                         │
│                                   │ scans                   │
│                                   ↓                         │
│  ┌──────────────────────────────────────────┐              │
│  │     Container Images in all Namespaces   │              │
│  └──────────────────────────────────────────┘              │
│                      │                                       │
│                      │ exports metrics                      │
│                      ↓                                       │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  Prometheus  │←────────│   Grafana    │                 │
│  │              │         │              │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                         │
└───────────────────────────────────┼─────────────────────────┘
                                    │
                                    ↓
                            ┌──────────────┐
                            │    Slack     │
                            │ Notifications│
                            └──────────────┘
```

### Technology Stack

```yaml
Platform Components:
  GitOps & Deployment:
    - ArgoCD for GitOps continuous delivery
    - Helm charts for package management
    - GitLab CI/CD for build and test pipelines

  Security Automation:
    - Trivy Operator for vulnerability scanning
    - Kubernetes security policies
    - Network policies for isolation

  Monitoring & Observability:
    - Self-hosted Grafana for visualization
    - Prometheus for metrics collection
    - Loki for log aggregation
    - Alertmanager for alert routing

  Infrastructure:
    - Kubernetes 1.28+
    - Multi-namespace architecture
    - RBAC for access control
```

## Implementation Details

### Trivy Operator Deployment

Trivy Operator was deployed using Helm charts managed through ArgoCD:

**Key Configuration Aspects:**
- **Scan Coverage**: All namespaces except system namespaces (kube-system, kube-public, etc.)
- **Scan Schedule**: Continuous scanning with configurable intervals
- **Severity Levels**: Tracking CRITICAL, HIGH, MEDIUM, and LOW vulnerabilities
- **Metrics Export**: Prometheus metrics endpoint for monitoring integration
- **Resource Limits**: Optimized CPU and memory allocation for efficient scanning

**ArgoCD Application Structure:**
```yaml
# Conceptual structure (actual code confidential)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: trivy-operator
  namespace: argocd
spec:
  project: security
  source:
    repoURL: <git-repository>
    targetRevision: main
    path: charts/trivy-operator
    helm:
      values: |
        # Custom values for scanning configuration
        # Prometheus integration settings
        # Resource limits and schedules
  destination:
    server: https://kubernetes.default.svc
    namespace: trivy-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Prometheus Integration

Trivy Operator exports metrics that Prometheus scrapes:

**Key Metrics Collected:**
- `trivy_image_vulnerabilities` - Number of vulnerabilities by severity
- `trivy_image_scan_duration` - Time taken for image scans
- `trivy_vulnerability_id` - Specific CVE identifiers
- Custom labels for filtering by namespace, image, severity

**Prometheus Configuration Concept:**
```yaml
# Conceptual scrape config
scrape_configs:
  - job_name: 'trivy-operator'
    kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
            - trivy-system
    relabel_configs:
      # Service discovery and label management
      # Metric path configuration
```

### Grafana Dashboards

Created comprehensive security dashboards tracking:

**Dashboard 1: CVE Overview**
- Total active CVEs across all images
- CVE count by severity (Critical, High, Medium, Low)
- Trend analysis over time (30 days, 90 days)
- Top 10 most vulnerable container images

**Dashboard 2: Compliance Score**
- Overall security compliance percentage
- Per-namespace compliance scores
- Image vulnerability density
- Remediation time tracking

**Dashboard 3: Security Trends**
- New CVEs discovered daily
- CVEs remediated over time
- Mean time to remediation (MTTR)
- Security posture improvement metrics

**Key Visualizations:**
- Gauge panels for compliance scores
- Time series graphs for CVE trends
- Bar charts for severity distribution
- Table panels for detailed CVE listings

### Slack Integration

Automated daily security reports to Slack:

**Report Contents:**
- Total CVE count by severity
- New CVEs discovered in last 24 hours
- Critical vulnerabilities requiring immediate attention
- Compliance score changes
- Direct links to Grafana dashboards for details

**Alert Conditions:**
- Critical CVE detected: Immediate notification
- High CVE count threshold exceeded: Hourly alerts
- Compliance score drops below threshold: Daily summary
- Scan failures: Immediate engineering team notification

### GitLab CI/CD Integration

GitLab pipelines handle:
- Container image building
- Integration testing
- Deployment to Kubernetes via GitOps workflow
- Configuration validation

**Pipeline Stages:**
1. Build: Compile and package application
2. Test: Run automated test suites
3. Security: Additional security checks
4. Deploy: Update GitOps repository for ArgoCD sync

## Challenges & Solutions

### Challenge 1: 150+ Active CVEs Across Production
**Problem**: Inherited legacy infrastructure with numerous unpatched vulnerabilities

**Solution:**
- Deployed Trivy Operator for automated continuous scanning
- Prioritized remediation by severity and exploitability
- Created dashboards providing visibility to entire team
- Automated alerting for new critical vulnerabilities
- **Result**: 98% CVE reduction (150+ → <5) within 2 months

### Challenge 2: $500/month Monitoring Costs
**Problem**: Grafana SaaS costs scaling unsustainably with data ingestion

**Solution:**
- Analyzed actual resource requirements vs SaaS pricing tiers
- Deployed self-hosted Grafana on existing Kubernetes infrastructure
- Migrated all dashboards, alert rules, and data sources
- Leveraged existing Prometheus for metrics storage
- **Result**: 90% cost reduction while improving customization flexibility

### Challenge 3: Lack of Security Visibility
**Problem**: Security team had no real-time insight into vulnerability landscape

**Solution:**
- Built comprehensive Grafana dashboards with multiple views
- Calculated compliance scores based on vulnerability data
- Integrated Slack for proactive notifications
- Created executive summary reports for leadership
- **Result**: Security response time improved from 24h to <1h

### Challenge 4: Unsafe Production Testing
**Problem**: No secure environment for penetration testing activities

**Solution:**
- Designed isolated staging environments with network policies
- Implemented production-like data without sensitive information
- Created clear protocols for security testing workflows
- Automated environment provisioning and cleanup
- **Result**: Enabled safe, regular penetration testing without risk

## Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Active CVEs | 150+ | <5 | 98% reduction |
| Monitoring Cost | $500/month | $50/month | 90% savings |
| Security Response Time | 24 hours | <1 hour | 96% faster |
| Vulnerability Scan Coverage | 40% | 100% | Full coverage |
| Mean Time to Remediation | 45 days | 3 days | 93% faster |

## Technologies Used

### Security & Scanning
- **Trivy Operator**: Kubernetes-native vulnerability scanner
- **Helm**: Package management for Trivy deployment
- **ArgoCD**: GitOps-based deployment automation
- **Kubernetes Security Policies**: Runtime security enforcement

### Monitoring & Observability
- **Grafana**: Self-hosted visualization platform
- **Prometheus**: Metrics collection and time-series database
- **Loki**: Log aggregation and querying
- **Alertmanager**: Alert routing and notification management

### CI/CD & Automation
- **GitLab CI/CD**: Build, test, and deployment pipelines
- **ArgoCD**: GitOps continuous delivery
- **Helm**: Kubernetes package management
- **Slack API**: Notification and reporting integration

## Skills Demonstrated

### DevSecOps Practices
- Automated vulnerability management at scale
- Security-as-Code with GitOps workflows
- Compliance monitoring and reporting
- Incident response automation

### Kubernetes Security
- Operator pattern implementation and management
- Multi-tenant security isolation
- RBAC and network policy design
- Secret management best practices

### Observability Engineering
- Custom Grafana dashboard development
- Prometheus metrics design and collection
- Alert rule design and threshold tuning
- Cost-effective monitoring architecture

### Cost Optimization
- SaaS vs self-hosted cost analysis
- Infrastructure resource optimization
- ROI-focused architectural decisions
- Cloud cost management strategies

## Business Impact

- **Enhanced Security Posture**: 98% reduction in active vulnerabilities
- **Significant Cost Savings**: $5,400 annual savings on monitoring infrastructure
- **Improved Operational Efficiency**: 96% faster security incident response
- **Enabled Compliance**: Regular penetration testing without production risk
- **Executive Visibility**: Real-time security metrics for informed decision-making

## Key Learnings

1. **Automation Scales Security**: Manual vulnerability tracking doesn't scale beyond small deployments
2. **Visibility Drives Action**: Dashboards and metrics motivate teams to prioritize security
3. **Self-Hosting Can Be Cost-Effective**: With proper infrastructure, self-hosted solutions often provide better ROI
4. **GitOps Enhances Security**: Declarative configuration management improves auditability
5. **Integration Amplifies Value**: Slack notifications transformed metrics into actionable insights

## Future Enhancements

- **Policy-as-Code**: Implement OPA (Open Policy Agent) for automated compliance enforcement
- **Runtime Security**: Integrate Falco for runtime threat detection
- **Advanced Remediation**: Automate patching workflows for low-risk vulnerabilities
- **Extended Compliance**: Add support for CIS Benchmarks and custom compliance frameworks
- **Multi-Cluster Security**: Extend Trivy Operator deployment across additional clusters

---

**Note**: This project involves confidential client infrastructure. Technical descriptions are generalized to protect proprietary information while demonstrating key concepts and achievements.
