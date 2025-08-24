import { Certification } from '@/types';

const certifications: Certification[] = [
  {
    id: 'porsche-digital-campus-challenge-2025',
    name: 'Porsche Digital Campus Challenge 2025 Final Winner',
    provider: 'Porsche Digital',
    description: 'Participated as the German representative team in the Brand Experience category and achieved 1st place among 196 teams.',
    logo: '/logos/porsche-digital.svg',
    issueDate: '2025-01-15',
    credentialId: 'PDCC-2025-WINNER',
    skills: ['Innovation', 'Digital Transformation', 'Problem Solving', 'Technology Leadership'],
    level: 'Expert',
  },
  {
    id: 'aws-devops-professional',
    name: 'AWS Certified DevOps Engineer - Professional',
    provider: 'Amazon Web Services',
    description: 'Validates technical expertise in provisioning, operating, and managing distributed application systems on the AWS platform (DOP-C02)',
    logo: '/logos/dop_icon.png',
    issueDate: '2024-08-15',
    expiryDate: '2027-08-15',
    credentialId: 'DOP-C02-789456',
    verificationUrl: 'https://www.credly.com/badges/example',
    skills: ['AWS', 'DevOps', 'CI/CD', 'Infrastructure as Code', 'Monitoring', 'Security'],
    level: 'Professional',
  },
  {
    id: 'kubernetes-cka',
    name: 'Certified Kubernetes Administrator (CKA)',
    provider: 'Cloud Native Computing Foundation',
    description: 'Demonstrates the ability to perform the responsibilities of Kubernetes administrator',
    logo: '/logos/cka_icon.png',
    issueDate: '2024-05-20',
    expiryDate: '2027-05-20',
    credentialId: 'CKA-567890',
    verificationUrl: 'https://www.credly.com/badges/example',
    skills: ['Kubernetes', 'Container Orchestration', 'kubectl', 'Pod Management', 'Networking', 'Storage'],
    level: 'Associate',
  },
  {
    id: 'azure-solution-architect-expert',
    name: 'Microsoft Azure Solutions Architect Expert',
    provider: 'Microsoft',
    description: 'Expertise in designing solutions that run on Azure (AZ-305)',
    logo: '/logos/305_icon.webp',
    issueDate: '2024-03-10',
    expiryDate: '2026-03-10',
    credentialId: 'AZ-305-123456',
    verificationUrl: 'https://www.credly.com/badges/example',
    skills: ['Azure', 'Solution Architecture', 'Cloud Design', 'Security', 'Cost Optimization', 'Migration'],
    level: 'Expert',
  },
  {
    id: 'azure-administrator-associate',
    name: 'Microsoft Azure Administrator Associate',
    provider: 'Microsoft',
    description: 'Skills to implement, monitor, and maintain Microsoft Azure solutions (AZ-104)',
    logo: '/logos/104_icon.svg',
    issueDate: '2023-11-25',
    expiryDate: '2025-11-25',
    credentialId: 'AZ-104-654321',
    verificationUrl: 'https://www.credly.com/badges/example',
    skills: ['Azure', 'Virtual Machines', 'Storage', 'Networking', 'Identity Management'],
    level: 'Associate',
  },
];

export function getCertifications(): Certification[] {
  return certifications.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
}

export function getCertificationById(id: string): Certification | undefined {
  return certifications.find(cert => cert.id === id);
}