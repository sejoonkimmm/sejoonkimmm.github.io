export interface Project {
  title: string;
  description: string;
  logo: string;
  link: string;
  slug: string;
  role: string;
  organization: string;
}

export const projects: Project[] = [
  {
    title: 'Myperfectstay',
    description:
      'GitOps-based Kubernetes infrastructure automation. Reduced configuration overhead by 53% through ArgoCD restructuring and achieved zero-downtime deployments with preview environments.',
    logo: '/logos/cloudcops.svg',
    link: '/projects/myperfectstay',
    slug: 'myperfectstay',
    role: 'DevOps Engineer',
    organization: 'CloudCops GmbH',
  },
  {
    title: 'app.immonow.at',
    description:
      'Secure DevSecOps infrastructure with automated vulnerability management. Achieved 98% CVE reduction and 90% cost savings on monitoring through Prometheus and Grafana self-hosting.',
    logo: '/logos/raiffeisen.svg',
    link: '/projects/immonow',
    slug: 'immonow',
    role: 'DevSecOps Engineer',
    organization: 'Raiffeisen Immobilien',
  },
  {
    title: 'Azure Infrastructure Automation',
    description:
      'Enterprise Azure automation reducing App Registration deployment time by 85%. Modernized IaC practices with Helm-based Terraform modules and integrated Jira workflows.',
    logo: '/logos/azure.svg',
    link: '/projects/azure-automation',
    slug: 'azure-automation',
    role: 'DevOps Engineer',
    organization: 'CloudCops GmbH',
  },
  {
    title: 'car-instrument',
    description:
      'Automated CI/CD pipeline for vehicle instrument cluster deployment. Code changes automatically build and deploy to physical vehicle hardware.',
    logo: '/logos/vsc.svg',
    link: 'https://github.com/sejoonkimmm/Car-instrument',
    slug: 'car-instrument',
    role: 'DevOps Engineer',
    organization: 'SEA:ME',
  },
  {
    title: 'Inception-of-things',
    description:
      'Kubernetes deployment and orchestration project using K3s and K3d for automated infrastructure setup.',
    logo: '/logos/subtrackt.svg',
    link: 'https://github.com/sejoonkimmm/Inception-of-things',
    slug: 'inception-of-things',
    role: 'DevOps',
    organization: '42Wolfsburg',
  },
  {
    title: 'ft_transcendence',
    description:
      'Real-time multiplayer Pong game with chat system, built with modern web technologies and containerized deployment.',
    logo: '/logos/coolify.svg',
    link: 'https://github.com/sejoonkimmm/ft_transcendence',
    slug: 'ft_transcendence',
    role: 'DevOps & Team Leader',
    organization: '42Wolfsburg',
  },
];
