import { Experience } from '@/types';

export const experiences: Experience[] = [
  {
    id: 'army-aviation-flight-engineer',
    title: 'Sejoon Kim as a Flight Engineer',
    organization: 'Army Aviation',
    role: 'Flight Engineer & UH-60 Crew Chief',
    period: 'July 2017 - September 2022',
    description: 'Served as a flight engineer in Army Aviation, responsible for aircraft maintenance and flight operations.',
    image: '/images/experiences/blackhawk.jpg',
    logo: '/logos/army-aviation.svg',
    tags: ['Aviation', 'Leadership', 'Operations'],
  },
  {
    id: '42seoul-student-council-president',
    title: 'Sejoon Kim as a Student Council President',
    organization: '42 Seoul',
    role: 'Student Council President',
    period: 'November 2022 - June 2024',
    description: 'Led student council initiatives and community engagement at 42 Seoul programming school.',
    image: '/images/experiences/42seoul.jpg',
    logo: '/logos/42seoul.svg',
    tags: ['Leadership', 'Community', 'Education'],
  },
  {
    id: 'volkswagen-seame-working-student',
    title: 'Sejoon Kim as a DevOps Engineer',
    organization: 'VolksWagen SEA:ME',
    role: 'DevOps Engineer',
    period: 'July 2024 - January 2025',
    description: 'Worked as a DevOps Engineer on automotive software development projects at VolksWagen SEA:ME program.',
    image: '/images/experiences/volkswagen.jpg',
    logo: '/logos/volkswagen.svg',
    tags: ['Automotive', 'DevOps', 'Infrastructure'],
  },
];

export function getExperiences(): Experience[] {
  return experiences;
}

export function getExperienceById(id: string): Experience | undefined {
  return experiences.find(exp => exp.id === id);
}
