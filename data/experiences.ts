import { Experience } from '@/types';

export const experiences: Experience[] = [
  {
    id: 'army-aviation-flight-engineer',
    title: 'Flight Engineer',
    organization: 'Army Aviation',
    role: 'Flight Engineer & UH-60 Crew Chief',
    period: '2018 - 2020',
    description: 'Served as a flight engineer in Army Aviation, responsible for aircraft maintenance and flight operations.',
    image: '/images/experiences/army-aviation.jpg',
    logo: '/logos/army-aviation.svg',
    tags: ['Aviation', 'Leadership', 'Operations'],
  },
  {
    id: '42seoul-student-council-president',
    title: 'Student Council President',
    organization: '42 Seoul',
    role: 'Student Council President',
    period: '2021 - 2022',
    description: 'Led student council initiatives and community engagement at 42 Seoul programming school.',
    image: '/images/experiences/42seoul.jpg',
    logo: '/logos/42seoul.svg',
    tags: ['Leadership', 'Community', 'Education'],
  },
  {
    id: 'volkswagen-seame-working-student',
    title: 'Working Student',
    organization: 'VolksWagen SEA:ME',
    role: 'Automotive Software Developer',
    period: '2023 - 2024',
    description: 'Worked as a working student on automotive software development projects at VolksWagen SEA:ME program.',
    image: '/images/experiences/volkswagen.jpg',
    logo: '/logos/volkswagen.svg',
    tags: ['Automotive', 'Software Development', 'Innovation'],
  },
];

export function getExperiences(): Experience[] {
  return experiences;
}

export function getExperienceById(id: string): Experience | undefined {
  return experiences.find(exp => exp.id === id);
}
