import { useState, useEffect } from 'react';
import styles from '@/styles/TerraformCode.module.css';

const TerraformCode = () => {
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  const terraformLines = [
    { code: '# DevOps Engineer Infrastructure', type: 'comment' },
    { code: 'terraform {', type: 'block' },
    { code: '  required_version = ">= 1.0"', type: 'attribute' },
    { code: '  required_providers {', type: 'nested-block' },
    { code: '    aws = {', type: 'nested-block' },
    { code: '      source  = "hashicorp/aws"', type: 'attribute' },
    { code: '      version = "~> 5.0"', type: 'attribute' },
    { code: '    }', type: 'close' },
    { code: '  }', type: 'close' },
    { code: '}', type: 'close' },
    { code: '', type: 'blank' },
    { code: 'resource "aws_instance" "devops_engineer" {', type: 'resource' },
    { code: '  ami           = "ami-kim-sejoon-2024"', type: 'attribute' },
    { code: '  instance_type = "t3.large"', type: 'attribute' },
    { code: '', type: 'blank' },
    { code: '  tags = {', type: 'nested-block' },
    { code: '    Name         = "Sejoon Kim"', type: 'attribute' },
    { code: '    Role         = "DevOps & Site Reliability Engineer"', type: 'attribute' },
    { code: '    Company      = "CloudCops"', type: 'attribute' },
    { code: '    Certifications = [', type: 'list' },
    { code: '      "AWS DevOps Professional (DOP-C02)",', type: 'list-item' },
    { code: '      "Azure Solution Architect Expert (AZ-305)",', type: 'list-item' },
    { code: '      "Final winner of Porsche Digital Campus Challenge",', type: 'list-item' },
    { code: '      "Certified Kubernetes Administrator (CKA)",', type: 'list-item' },
    { code: '      "Azure Administrator Associate (AZ-104)"', type: 'list-item' },
    { code: '    ]', type: 'close' },
    { code: '    Status       = "available"', type: 'attribute' },
    { code: '    Environment  = "production"', type: 'attribute' },
    { code: '  }', type: 'close' },
    { code: '}', type: 'close' },
    { code: '', type: 'blank' },
    { code: 'output "contact_info" {', type: 'output' },
    { code: '  value = {', type: 'nested-block' },
    { code: '    github   = "github.com/sejoonkimmm"', type: 'attribute' },
    { code: '    linkedin = "linkedin.com/in/sejokimde"', type: 'attribute' },
    { code: '    email    = "skim.devops@gmail.com"', type: 'attribute' },
    { code: '  }', type: 'close' },
    { code: '}', type: 'close' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLineIndex((prev) => (prev + 1) % terraformLines.length);
    }, 2500); // Slightly slower for better readability

    return () => clearInterval(interval);
  }, [terraformLines.length]);

  return (
    <div className={styles.codeContainer}>
      <div className={styles.editorHeader}>
        <div className={styles.filename}>
          <span className={styles.fileIcon}>📄</span>
          main.tf
        </div>
        <div className={styles.editorButtons}>
          <div className={styles.button}></div>
          <div className={styles.button}></div>
          <div className={styles.button}></div>
        </div>
      </div>
      
      <div className={styles.editorContent}>
        <div className={styles.lineNumbers}>
          {terraformLines.map((_, index) => (
            <div
              key={index}
              className={`${styles.lineNumber} ${
                index === activeLineIndex ? styles.activeLine : ''
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>

        <div className={styles.codeEditor}>
          {terraformLines.map((line, index) => (
            <div
              key={index}
              className={`${styles.codeLine} ${styles[line.type]} ${
                index === activeLineIndex ? styles.highlightedLine : ''
              }`}
            >
              {line.code}
            </div>
          ))}
        </div>

        <div className={styles.overlayGlow}></div>
      </div>
    </div>
  );
};

export default TerraformCode;