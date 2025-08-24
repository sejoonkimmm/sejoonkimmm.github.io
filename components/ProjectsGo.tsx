import styles from '@/styles/ProjectsGo.module.css';

// DevOps Infrastructure Projects - update with your actual projects
const projectsData = `package main

import (
	"fmt"
	"log"
	"github.com/sejoonkim/devops-toolkit"
)

type Project struct {
	Name         string
	Description  string
	Technologies []string
	Status       string
	Repository   string
}

var projects = []Project{
	{
		Name:        "Kubernetes Multi-Cluster Management",
		Description: "Automated K8s cluster provisioning and management across AWS, Azure, and GCP",
		Technologies: []string{"Kubernetes", "Terraform", "ArgoCD", "Helm", "Prometheus"},
		Status:      "production",
		Repository:  "github.com/sejoonkim/k8s-multi-cluster",
	},
	{
		Name:        "CI/CD Pipeline Automation",
		Description: "End-to-end GitOps pipeline with automated testing, security scanning, and deployment",
		Technologies: []string{"Jenkins", "GitLab CI", "SonarQube", "Docker", "AWS CodePipeline"},
		Status:      "production",
		Repository:  "github.com/sejoonkim/cicd-automation",
	},
	{
		Name:        "Infrastructure as Code Templates",
		Description: "Reusable Terraform modules for cloud infrastructure provisioning",
		Technologies: []string{"Terraform", "AWS", "Azure", "GCP", "Ansible"},
		Status:      "active",
		Repository:  "github.com/sejoonkim/terraform-modules",
	},
	{
		Name:        "Monitoring & Observability Stack",
		Description: "Complete monitoring solution with metrics, logs, and distributed tracing",
		Technologies: []string{"Prometheus", "Grafana", "ELK Stack", "Jaeger", "AlertManager"},
		Status:      "production",
		Repository:  "github.com/sejoonkim/observability-stack",
	},
	{
		Name:        "Security Compliance Automation",
		Description: "Automated security scanning and compliance checking for cloud workloads",
		Technologies: []string{"Falco", "OPA Gatekeeper", "Trivy", "CIS Benchmarks", "STIG"},
		Status:      "beta",
		Repository:  "github.com/sejoonkim/security-compliance",
	},
	{
		Name:        "Cloud Cost Optimization",
		Description: "Automated cost analysis and optimization recommendations for multi-cloud environments",
		Technologies: []string{"Go", "AWS Cost Explorer API", "Azure Cost Management", "FinOps"},
		Status:      "active",
		Repository:  "github.com/sejoonkim/cloud-cost-optimizer",
	},
}

func main() {
	fmt.Println("=== DevOps Infrastructure Projects ===")
	
	for i, project := range projects {
		fmt.Printf("[%d] %s\\n", i+1, project.Name)
		fmt.Printf("    Description: %s\\n", project.Description)
		fmt.Printf("    Technologies: %v\\n", project.Technologies)
		fmt.Printf("    Status: %s\\n", project.Status)
		fmt.Printf("    Repository: %s\\n", project.Repository)
		fmt.Println()
	}
	
	log.Println("✅ All projects loaded successfully")
	log.Printf("📊 Total projects: %d", len(projects))
}`;

const ProjectsGo = () => {
  const lines = projectsData.split('\n');

  const getLineType = (line: string): string => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('package ') || trimmed.startsWith('import ')) return 'keyword';
    if (trimmed.startsWith('//')) return 'comment';
    if (trimmed.startsWith('type ') || trimmed.startsWith('var ') || trimmed.startsWith('func ')) return 'declaration';
    if (trimmed.includes('"') && !trimmed.startsWith('fmt.') && !trimmed.startsWith('log.')) return 'string';
    if (trimmed.startsWith('fmt.') || trimmed.startsWith('log.')) return 'function-call';
    if (trimmed.includes('{') || trimmed.includes('}') || trimmed === '(' || trimmed === ')') return 'bracket';
    if (trimmed.includes('Name:') || trimmed.includes('Description:') || trimmed.includes('Technologies:') || 
        trimmed.includes('Status:') || trimmed.includes('Repository:')) return 'field';
    if (trimmed.includes('[]string{') || trimmed.includes('Project{')) return 'type';
    return 'default';
  };

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <div className={styles.filename}>
          <span className={styles.fileIcon}>🐹</span>
          projects.go
        </div>
        <div className={styles.editorButtons}>
          <div className={styles.button}></div>
          <div className={styles.button}></div>
          <div className={styles.button}></div>
        </div>
      </div>
      
      <div className={styles.editorContent}>
        <div className={styles.lineNumbers}>
          {lines.map((_, index) => (
            <div key={index} className={styles.lineNumber}>
              {index + 1}
            </div>
          ))}
        </div>

        <div className={styles.codeEditor}>
          {lines.map((line, index) => {
            const lineType = getLineType(line);
            return (
              <div key={index} className={`${styles.codeLine} ${styles[lineType]}`}>
                {line || '\u00A0'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjectsGo;