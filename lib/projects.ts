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
  
  // Helper function to parse different date formats for sorting
  const parseProjectDate = (dateString: string): Date => {
    // If it's a month range, extract the end date for sorting
    if (dateString.includes(' - ')) {
      const endDate = dateString.split(' - ')[1];
      const monthMap: { [key: string]: number } = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3,
        'May': 4, 'June': 5, 'July': 6, 'August': 7,
        'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      
      const parts = endDate.split(' ');
      if (parts.length === 2) {
        const month = monthMap[parts[0]];
        const year = parseInt(parts[1]);
        return new Date(year, month);
      }
    }
    
    // If it's German format (DD.MM.YYYY)
    if (dateString.includes('.')) {
      const [day, month, year] = dateString.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Default to ISO format
    return new Date(dateString);
  };
  
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
      return parseProjectDate(b.date).getTime() - parseProjectDate(a.date).getTime();
    });
    
  return projects;
}
