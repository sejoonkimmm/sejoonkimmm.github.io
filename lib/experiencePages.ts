import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const experiencesDirectory = path.join(process.cwd(), 'experiences');

export interface ExperienceWithContent {
  id: string;
  title: string;
  organization: string;
  role: string;
  period: string;
  description: string;
  image: string;
  logo: string;
  tags: string[];
  content: string;
}

export function getExperienceBySlug(id: string): ExperienceWithContent | null {
  try {
    const fullPath = path.join(experiencesDirectory, `${id}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      id,
      title: data.title,
      organization: data.organization,
      role: data.role,
      period: data.period,
      description: data.description,
      image: data.image,
      logo: data.logo,
      tags: data.tags || [],
      content,
    };
  } catch (error) {
    console.error(`Error reading experience ${id}:`, error);
    return null;
  }
}

export function getAllExperienceSlugs(): string[] {
  try {
    const fileNames = fs.readdirSync(experiencesDirectory);
    return fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => fileName.replace(/\.md$/, ''));
  } catch (error) {
    console.error('Error reading experiences directory:', error);
    return [];
  }
}
