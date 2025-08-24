export interface Project {
  title: string;
  description: string;
  logo: string;
  link: string;
  slug: string;
}

export const projects: Project[] = [
  {
    title: 'Myperfectstay',
    description:
      'Discover creative websites and developers. A portal for you to share your projects.',
    logo: '/logos/driwwwle.svg',
    link: 'https://github.com/sejoonkimmm/Myperfectstay',
    slug: 'myperfectstay',
  },
  {
    title: 'car-instrument',
    description:
      'A Visual Studio Code themed developer portfolio built with Next.js and CSS Modules.',
    logo: '/logos/vsc.svg',
    link: 'https://github.com/sejoonkimmm/car-instrument',
    slug: 'car-instrument',
  },
  {
    title: 'Inception-of-things',
    description:
      'A simple and elegant way to track your subscriptions and save money.',
    logo: '/logos/subtrackt.svg',
    link: 'https://github.com/sejoonkimmm/Inception-of-things',
    slug: 'inception-of-things',
  },
  {
    title: 'ft_transcendence',
    description:
      'VSCode extension to track and deploy your Coolify applications.',
    logo: '/logos/coolify.svg',
    link: 'https://github.com/sejoonkimmm/ft_transcendence',
    slug: 'ft_transcendence',
  },
];
