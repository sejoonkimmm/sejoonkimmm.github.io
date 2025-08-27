import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const projectsDirectory = path.join(process.cwd(), 'projects');

export interface ProjectWithContent {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readTime: string;
  image: string;
  content: string;
}

export interface ProjectMetadata {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readTime: string;
  image: string;
}

export function getAllProjectSlugs(): string[] {
  if (!fs.existsSync(projectsDirectory)) {
    return [];
  }
  
  const fileNames = fs.readdirSync(projectsDirectory);
  return fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => fileName.replace(/\.md$/, ''));
}

export function getProjectBySlug(slug: string): ProjectWithContent | null {
  try {
    const fullPath = path.join(projectsDirectory, `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    return {
      slug,
      title: data.title || '',
      date: data.date || '',
      description: data.description || '',
      tags: data.tags || [],
      readTime: data.readTime || '',
      image: data.image || '',
      content,
    };
  } catch (error) {
    console.error(`Error reading project ${slug}:`, error);
    return null;
  }
}

export function getAllProjects(): ProjectMetadata[] {
  const slugs = getAllProjectSlugs();
  
  const projects = slugs
    .map(slug => {
      const project = getProjectBySlug(slug);
      if (!project) return null;
      
      const { content, ...metadata } = project;
      return metadata;
    })
    .filter((project): project is ProjectMetadata => project !== null)
    .sort((a, b) => {
      // Sort by date in descending order
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
  return projects;
}
