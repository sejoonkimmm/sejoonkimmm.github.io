import { Experience } from '@/types';

export const experiences: Experience[] = [
  {
    id: 'cloudcops-devops-engineer',
    title: 'Sejoon Kim as a DevOps Engineer',
    organization: 'CloudCops GmbH',
    role: 'DevOps Engineer',
    period: 'March 2025 - Present',
    location: 'Bielefeld, Germany',
    description: 'Building reliable, cost-effective infrastructure for B2C services. Achieved 90% cost reduction in monitoring, 98% CVE reduction, and 53% configuration overhead reduction through GitOps automation.',
    logo: '/logos/cloudcops.svg',
    tags: ['Kubernetes', 'ArgoCD', 'Cost Optimization', 'Security', 'GitOps'],
  },
  {
    id: 'seame-devops-intern',
    title: 'Sejoon Kim as a DevOps Engineer Intern',
    organization: 'SEA:ME',
    role: 'DevOps Engineer Intern',
    period: 'July 2024 - January 2025',
    location: 'Wolfsburg, Germany',
    description: 'Worked as a DevOps Engineer Intern on automotive software development projects at SEA:ME program.',
    logo: '/logos/volkswagen.svg',
    tags: ['Automotive', 'DevOps', 'Infrastructure'],
  },
  {
    id: '42seoul-student-council-president',
    title: 'Sejoon Kim as a Student Council President',
    organization: '42 Seoul',
    role: 'Student Council President',
    period: 'November 2022 - June 2024',
    location: 'Seoul, Korea',
    description: 'Led student council initiatives and community engagement at 42 Seoul programming school.',
    logo: '/logos/42seoul.svg',
    tags: ['Leadership', 'Community', 'Education'],
  },
  {
    id: 'army-aviation-flight-engineer',
    title: 'Sejoon Kim as a Military Officer (IT & Security Administrator)',
    organization: 'Republic of Korea Army Aviation',
    role: 'IT & Security Administrator (NCO)',
    period: 'July 2017 - August 2022',
    location: 'Chungcheong, Korea',
    description: 'Ran IT admin and security compliance for an aviation battalion. Managed DELIS (military logistics system), handled equipment inventory, and kept things running on the security side.',
    logo: '/logos/army-aviation.svg',
    tags: ['IT Administration', 'Security', 'ERP Systems', 'Compliance'],
  },
];

export function getExperiences(): Experience[] {
  return experiences;
}

export function getExperienceById(id: string): Experience | undefined {
  return experiences.find(exp => exp.id === id);
}
