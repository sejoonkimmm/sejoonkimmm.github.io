import { Certification } from '@/types';

const certifications: Certification[] = [
  {
    id: 'azure-solution-architect-expert',
    name: 'Microsoft Azure Solutions Architect Expert',
    provider: 'Microsoft',
    description: 'Expertise in designing solutions that run on Azure (AZ-305)',
    logo: '/logos/305_icon.webp',
    issueDate: '2025-09-01',
    expiryDate: '2026-08-31',
    credentialId: '',
    verificationUrl: '',
    skills: ['Azure', 'Solution Architecture', 'Cloud Design', 'Security', 'Cost Optimization', 'Migration'],
    level: 'Expert',
  },
  {
    id: 'aws-devops-professional',
    name: 'AWS Certified DevOps Engineer - Professional',
    provider: 'Amazon Web Services',
    description: 'Validates technical expertise in provisioning, operating, and managing distributed application systems on the AWS platform (DOP-C02)',
    logo: '/logos/dop_icon.png',
    issueDate: '2024-09-01',
    expiryDate: '2027-09-01',
    credentialId: '',
    verificationUrl: '',
    skills: ['AWS', 'DevOps', 'CI/CD', 'Infrastructure as Code', 'Monitoring', 'Security'],
    level: 'Professional',
  },
  {
    id: 'kubernetes-cka',
    name: 'Certified Kubernetes Administrator (CKA)',
    provider: 'Cloud Native Computing Foundation',
    description: 'Demonstrates the ability to perform the responsibilities of Kubernetes administrator',
    logo: '/logos/cka_icon.png',
    issueDate: '2024-07-01',
    expiryDate: '2026-07-01',
    credentialId: '',
    verificationUrl: '',
    skills: ['Kubernetes', 'Container Orchestration', 'kubectl', 'Pod Management', 'Networking', 'Storage'],
    level: 'Associate',
  },
  {
    id: 'azure-administrator-associate',
    name: 'Microsoft Azure Administrator Associate',
    provider: 'Microsoft',
    description: 'Skills to implement, monitor, and maintain Microsoft Azure solutions (AZ-104)',
    logo: '/logos/104_icon.svg',
    issueDate: '2025-08-01',
    expiryDate: '2026-08-01',
    credentialId: '',
    verificationUrl: '',
    skills: ['Azure', 'Virtual Machines', 'Storage', 'Networking', 'Identity Management'],
    level: 'Associate',
  },
  {
    id: 'porsche-digital-campus-challenge-2025',
    name: 'Porsche Digital Campus Challenge 2025 Final Winner',
    provider: 'Porsche Digital',
    description: 'Participated as the German representative team in the Brand Experience category and achieved 1st place among 196 teams.',
    logo: '/logos/porsche.webp',
    issueDate: '2025-02-01',
    credentialId: '',
    verificationUrl: 'https://campus.porsche.digital/projects/digital-campus',
    skills: ['Innovation', 'Digital Transformation', 'Problem Solving', 'Technology Leadership'],
    level: 'Expert',
  },
];

export function getCertifications(): Certification[] {
  return certifications;
}

export function getCertificationById(id: string): Certification | undefined {
  return certifications.find(cert => cert.id === id);
}