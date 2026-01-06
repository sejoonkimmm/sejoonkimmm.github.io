---
title: "Sejoon Kim as a DevOps Engineer"
organization: "CloudCops GmbH"
role: "DevOps Engineer"
period: "March 2025 - Present"
location: "Bielefeld, Germany"
description: "Building reliable, cost-effective infrastructure for B2C services. Achieved 90% cost reduction in monitoring, 98% CVE reduction, and 53% configuration overhead reduction through GitOps automation."
image: ""
logo: "/logos/cloudcops.svg"
tags: ["Kubernetes", "ArgoCD", "Cost Optimization", "Security", "GitOps"]
---

# Sejoon Kim as a DevOps Engineer - CloudCops GmbH

Building reliable, cost-effective infrastructure that teams can trust.

## About CloudCops

CloudCops GmbH is a DevOps consulting company specializing in cloud infrastructure, Kubernetes orchestration, and GitOps practices. Working with enterprise clients across various industries, CloudCops delivers scalable, secure, and cost-effective solutions.

## Role Overview

As a DevOps Engineer at CloudCops from March 2025 to present, I work on multiple client projects, implementing modern DevOps practices, automating infrastructure, and optimizing cloud costs while maintaining high reliability and security standards.

## Key Projects

### Myperfectstay - GitOps Infrastructure
**Client**: CloudCops GmbH | **Timeline**: March 2025 - Present

#### Achievements
- **53% Configuration Overhead Reduction**: Restructured ArgoCD repositories with shared ConfigMaps and environment-specific consolidation
- **Zero-Downtime Migrations**: Implemented auto_release_id system maintaining CI/CD integrity during major architectural changes
- **Unified CI/CD**: Consolidated frontend and backend pipelines from separate repositories into centralized GitHub Actions
- **Preview Environments**: Established mobile and frontend preview environments accelerating development feedback loops

#### Technologies
- **Orchestration**: Kubernetes, ArgoCD, Helm
- **CI/CD**: GitHub Actions, Docker
- **Infrastructure**: Azure, Terraform
- **Monitoring**: Prometheus, Grafana, Loki

### app.immonow.at - DevSecOps Platform
**Client**: Raiffeisen Immobilien | **Timeline**: August 2025 - Present

#### Achievements
- **98% CVE Reduction**: Automated vulnerability detection and patching via Trivy Operator
- **90% Cost Savings**: Migrated from Grafana SaaS to self-hosted solution with Prometheus integration ($500/month → $50/month)
- **Automated Security Reporting**: Built Grafana dashboards with Slack integration for daily vulnerability tracking
- **Secure Testing Environments**: Designed staging environments enabling safe penetration testing and vulnerability management

#### Technologies
- **Security**: Trivy Operator, Kubernetes Security Policies
- **Monitoring**: Self-hosted Grafana, Prometheus, Alertmanager
- **Infrastructure**: Kubernetes, Helm Charts
- **Automation**: GitHub Actions, Slack API

### Azure Infrastructure Automation
**Client**: CloudCops GmbH | **Timeline**: March 2025 - Present

#### Achievements
- **85% Time Reduction**: Automated Azure App Registration from manual 4-step workflow to single-push deployment
- **Modernized IaC**: Reworked script-based Terraform ArgoCD modules to Helm-based architecture with version control
- **Enhanced Project Management**: Migrated from Notion/GitHub Issues to integrated Jira workflows with autolink functionality
- **Standardized Deployments**: Enabled better rollback capabilities and standardized deployment patterns

#### Technologies
- **Cloud**: Azure (App Registrations, RBAC, Resource Management)
- **IaC**: Terraform, Helm, ArgoCD
- **Project Management**: Jira API, GitHub Actions
- **Automation**: Python, Bash scripting

## Impact & Metrics

### Cost Optimization
| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Monitoring Costs | $500/month | $50/month | 90% reduction |
| Deployment Time | 4 manual steps | 1-click deploy | 85% faster |
| Configuration Files | 100+ configs | 47 configs | 53% reduction |

### Security & Reliability
- **Vulnerability Management**: 98% active CVE reduction through automation
- **Zero-Downtime Deployments**: 100% uptime during major infrastructure migrations
- **Preview Environments**: 3-5x faster development feedback loops
- **Automated Testing**: Secure staging environments for penetration testing

## Technologies & Tools

### Container Orchestration
- Kubernetes (1.28+)
- ArgoCD for GitOps
- Helm for package management
- Docker for containerization

### CI/CD & Automation
- GitHub Actions
- Terraform for Infrastructure as Code
- Bash/Python for automation scripts
- Jira API integration

### Security & Monitoring
- Trivy Operator for vulnerability scanning
- Prometheus for metrics collection
- Grafana for visualization and dashboards
- Loki for log aggregation
- Alertmanager for alerting
- Slack integration for notifications

### Cloud Platforms
- Microsoft Azure (Primary)
  - Azure App Registrations
  - Azure RBAC
  - Azure Resource Management
- AWS (Secondary)

## Key Learnings & Growth

### DevOps Philosophy
- **Cost-Conscious Engineering**: Every optimization funds the next feature
- **Security by Default**: Automated vulnerability management prevents issues at scale
- **GitOps Excellence**: Infrastructure as code enables reproducibility and rollback
- **Observability First**: Comprehensive monitoring prevents outages before they happen

### Technical Depth
- **Kubernetes Mastery**: Deep understanding of ConfigMaps, Secrets, RBAC, and networking
- **ArgoCD Patterns**: Advanced repository structuring and release management strategies
- **Security Automation**: Implementing shift-left security with Trivy and policy enforcement
- **Cost Optimization**: Balancing performance, reliability, and cloud spend

### Enterprise Client Work
- **Multi-Client Management**: Juggling Myperfectstay and Raiffeisen Immobilien simultaneously
- **Stakeholder Communication**: Translating technical improvements into business value
- **Risk Management**: Making critical infrastructure changes without downtime
- **Documentation Excellence**: Creating clear runbooks and architectural diagrams

## Challenges & Solutions

### Challenge: 90% Cost Reduction Without Sacrificing Observability
**Problem**: Grafana SaaS costs scaling unsustainably with usage

**Solution**:
- Deployed self-hosted Grafana on Kubernetes cluster
- Integrated Prometheus for metrics collection
- Configured Loki for log aggregation
- Maintained all dashboards and alerting capabilities
- **Result**: $500/month → $50/month while improving customization

### Challenge: Zero-Downtime ArgoCD Repository Restructuring
**Problem**: Major repository restructuring risked breaking existing deployments

**Solution**:
- Implemented auto_release_id identification system
- Created migration strategy with phased rollout
- Maintained backward compatibility during transition
- **Result**: 53% configuration reduction with 100% uptime

### Challenge: 98% CVE Reduction Across Multiple Clusters
**Problem**: Manual vulnerability patching couldn't keep pace with discoveries

**Solution**:
- Deployed Trivy Operator across all Kubernetes clusters
- Automated image scanning in CI/CD pipelines
- Created Grafana dashboard for CVE tracking
- Integrated Slack notifications for critical vulnerabilities
- **Result**: Active CVEs reduced from 150+ to <5

### Challenge: Azure App Registration Manual Bottleneck
**Problem**: 4-step manual process causing delays and errors

**Solution**:
- Analyzed existing workflow and permission requirements
- Built automation using Azure CLI and Terraform
- Created GitHub Actions workflow for single-push deployment
- Eliminated human errors in permission configuration
- **Result**: 85% time reduction per request

## Skills Developed

### Infrastructure as Code
- Advanced Terraform module design
- Helm chart development and customization
- ArgoCD Application and ApplicationSet patterns
- GitOps workflow optimization

### Kubernetes Expertise
- Multi-cluster management
- ConfigMap and Secret management strategies
- RBAC policy design
- Network policy implementation
- Resource optimization and cost management

### Security & Compliance
- Vulnerability scanning automation
- Container security best practices
- RBAC and access control
- Secure secret management
- Compliance reporting

### CI/CD Architecture
- GitHub Actions workflow design
- Multi-stage pipeline optimization
- Container registry management
- Release automation strategies

### Observability
- Prometheus metric design
- Grafana dashboard development
- Log aggregation with Loki
- Alert rule configuration
- Incident response workflows

## Professional Growth

### Leadership & Communication
- **Client Management**: Regular stakeholder updates and technical presentations
- **Cross-Team Collaboration**: Coordinating with frontend, backend, and product teams
- **Knowledge Sharing**: Creating documentation and conducting internal training
- **Incident Response**: Leading post-mortem analysis and improvement initiatives

### Business Impact
- **Cost Optimization**: Delivering measurable savings while improving capabilities
- **Risk Mitigation**: Reducing security vulnerabilities and deployment risks
- **Efficiency Gains**: Automating manual processes and reducing operational overhead
- **Scalability**: Building infrastructure that grows with business needs

## Industry Insights

Working at CloudCops provided valuable insights into:
- The critical importance of cost optimization in cloud infrastructure
- How security automation enables scaling without sacrificing safety
- The power of GitOps for infrastructure reliability and reproducibility
- Balancing innovation velocity with operational stability
- The value of comprehensive observability in preventing incidents

## Reflection

This experience reinforced my belief that:
- **The best DevOps work is invisible** - until something needs to scale, recover, or deploy
- **Automation compounds** - every automated process saves time repeatedly
- **Observability prevents incidents** - comprehensive monitoring stops problems before users notice
- **Cost consciousness matters** - every optimization funds future capabilities
- **Documentation is infrastructure** - clear runbooks and diagrams are as important as code

These principles guide my approach to building reliable, cost-effective, and secure infrastructure that teams can trust.

## What's Next

Currently focused on:
- **Multi-Cluster GitOps**: Scaling ArgoCD patterns across multiple environments
- **FinOps Practices**: Implementing cost allocation and optimization strategies
- **Zero-Trust Security**: Advancing security posture with network policies and service mesh
- **Platform Engineering**: Building internal developer platforms for improved productivity
