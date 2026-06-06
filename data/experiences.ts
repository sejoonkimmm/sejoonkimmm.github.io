import { Experience } from '@/types';

export const experiences: Experience[] = [
  {
    id: 'cloudcops-devops-engineer',
    title: 'Sejoon Kim as a DevOps Engineer',
    organization: 'CloudCops GmbH',
    role: 'DevOps Engineer',
    period: 'March 2025 - Present',
    location: 'Bielefeld, Germany',
    description: 'DevOps and backend engineering across CloudCops product portfolio on Kubernetes. Cut infrastructure cost 82% with a cloud migration, active CVEs 98% through security automation, and monitoring cost 90% by self-hosting observability.',
    logo: '/logos/cloudcops.svg',
    tags: ['Kubernetes', 'ArgoCD', 'GitOps', 'Security', 'Cost Optimization', 'Python'],
  },
  {
    id: 'seame-devops-engineer',
    title: 'Sejoon Kim as a DevOps Engineer (Open Source Contributor)',
    organization: 'SEA:ME',
    role: 'DevOps Engineer, Open Source Contributor',
    period: 'July 2024 - December 2024',
    location: 'Wolfsburg, Germany',
    description: 'Open-source contributor on SEA:ME, a Volkswagen-sponsored in-vehicle infotainment project. Built the containerized ARM cross-compilation pipeline and CI that cut first-build onboarding from 1-2 days to 1-2 hours.',
    logo: '/logos/volkswagen.svg',
    tags: ['Automotive', 'Build Systems', 'CI/CD', 'Docker', 'Embedded'],
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
