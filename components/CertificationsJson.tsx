import styles from '@/styles/CertificationsJson.module.css';

const certificationsJsonData = `{
  "certifications": {
    "metadata": {
      "version": "2.1.0",
      "lastUpdated": "2025-01-15T10:30:00Z",
      "totalCount": 5,
      "validCertifications": 5,
      "expiredCertifications": 0
    },
    "devops_engineer": {
      "name": "Sejoon Kim",
      "role": "DevOps Engineer & Cloud Architect",
      "location": "Berlin, Germany",
      "specializations": [
        "Infrastructure as Code",
        "Container Orchestration", 
        "CI/CD Automation",
        "Cloud Architecture",
        "Security & Compliance"
      ]
    },
    "active_certifications": [
      {
        "id": "pdcc-2025-winner",
        "name": "Porsche Digital Campus Challenge 2025 Final Winner",
        "provider": "Porsche Digital",
        "level": "Expert",
        "issueDate": "2025-01-15",
        "expiryDate": null,
        "credentialId": "PDCC-2025-WINNER",
        "status": "active",
        "achievement": "1st Place Winner",
        "skills": [
          "Innovation",
          "Digital Transformation",
          "Problem Solving",
          "Technology Leadership"
        ],
        "logo": "/porsche-digital.svg",
        "prestigious": true
      },
      {
        "id": "aws-devops-professional",
        "name": "AWS Certified DevOps Engineer - Professional",
        "provider": "Amazon Web Services",
        "level": "Professional",
        "issueDate": "2024-08-15",
        "expiryDate": "2027-08-15",
        "credentialId": "DOP-C02-789456",
        "status": "active",
        "exam": "DOP-C02",
        "skills": [
          "AWS",
          "DevOps",
          "CI/CD",
          "Infrastructure as Code",
          "Monitoring",
          "Security"
        ],
        "logo": "https://images.credly.com/size/340x340/images/bd31ef42-d460-493e-8503-39592aaf0458/image.png",
        "verificationUrl": "https://www.credly.com/badges/example"
      },
      {
        "id": "kubernetes-cka",
        "name": "Certified Kubernetes Administrator (CKA)",
        "provider": "Cloud Native Computing Foundation",
        "level": "Professional",
        "issueDate": "2024-05-20",
        "expiryDate": "2027-05-20",
        "credentialId": "CKA-567890",
        "status": "active",
        "skills": [
          "Kubernetes",
          "Container Orchestration",
          "kubectl",
          "Pod Management",
          "Networking",
          "Storage"
        ],
        "logo": "https://images.credly.com/size/340x340/images/8b8ed108-e77d-4396-ac59-2504583b9d54/cka_from_cncfsite__281_29.png",
        "verificationUrl": "https://www.credly.com/badges/example"
      },
      {
        "id": "azure-solutions-architect-expert",
        "name": "Microsoft Azure Solutions Architect Expert",
        "provider": "Microsoft",
        "level": "Expert",
        "issueDate": "2024-03-10",
        "expiryDate": "2026-03-10",
        "credentialId": "AZ-305-123456",
        "status": "active",
        "exam": "AZ-305",
        "skills": [
          "Azure",
          "Solution Architecture",
          "Cloud Design",
          "Security",
          "Cost Optimization",
          "Migration"
        ],
        "logo": "https://images.credly.com/size/340x340/images/987adb7e-49be-4e24-b67e-55986bd3fe66/azure-solutions-architect-expert-600x600.png",
        "verificationUrl": "https://www.credly.com/badges/example"
      },
      {
        "id": "azure-administrator-associate",
        "name": "Microsoft Azure Administrator Associate",
        "provider": "Microsoft",
        "level": "Associate",
        "issueDate": "2023-11-25",
        "expiryDate": "2025-11-25",
        "credentialId": "AZ-104-654321",
        "status": "active",
        "exam": "AZ-104",
        "skills": [
          "Azure",
          "Virtual Machines",
          "Storage",
          "Networking",
          "Identity Management",
          "Monitoring"
        ],
        "logo": "https://images.credly.com/size/340x340/images/336eebfc-0ac3-4553-9a67-b402f491f185/azure-administrator-associate-600x600.png",
        "verificationUrl": "https://www.credly.com/badges/example"
      }
    ],
    "career_summary": {
      "totalYearsExperience": "3+",
      "currentRole": "working with CloudCops",
      "availability": "open to opportunities",
      "preferredContact": "email",
      "responseTime": "24-48 hours",
      "uptime_goal": "99.9%"
    }
  }
}`;

const CertificationsJson = () => {
  const lines = certificationsJsonData.split('\n');

  const getLineType = (line: string): string => {
    const trimmed = line.trim();
    
    if (trimmed.includes('"id":') || trimmed.includes('"name":') || trimmed.includes('"provider":')) return 'key-important';
    if (trimmed.startsWith('"') && trimmed.includes('":')) return 'key';
    if (trimmed.includes('"active"') || trimmed.includes('"Expert"') || trimmed.includes('true')) return 'value-success';
    if (trimmed.includes('null') || trimmed.includes('false')) return 'value-null';
    if (trimmed.includes('"2024-') || trimmed.includes('"2025-') || trimmed.includes('"2026-') || trimmed.includes('"2027-')) return 'value-date';
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('"') && trimmed.endsWith('","'))) return 'value-string';
    if (trimmed.match(/^\d+$/) || trimmed.includes('"3+"') || trimmed.includes('"99.9%"')) return 'value-number';
    if (trimmed === '{' || trimmed === '}' || trimmed === '[' || trimmed === ']') return 'bracket';
    return 'default';
  };

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <div className={styles.filename}>
          <span className={styles.fileIcon}>📋</span>
          certifications.json
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

export default CertificationsJson;