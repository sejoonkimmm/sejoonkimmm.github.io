import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article } from '@/types';

const articlesDirectory = path.join(process.cwd(), 'articles');

export function getAllArticles(): Article[] {
  const fileNames = fs.readdirSync(articlesDirectory);
  
  // Helper function to parse German date format
  const parseDate = (dateString: string): Date => {
    if (dateString.includes('.')) {
      const [day, month, year] = dateString.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(dateString);
  };

  const articles = fileNames
    .filter((name: string) => name.endsWith('.md'))
    .map((name: string) => {
      const slug = name.replace(/\.md$/, '');
      const fullPath = path.join(articlesDirectory, name);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      
      return {
        id: slug,
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        readTime: data.readTime,
        tags: data.tags || [],
      } as Article;
    })
    .sort((a: Article, b: Article) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  return articles;
}

export function getArticleBySlug(slug: string): Article & { content: string } {
  const fullPath = path.join(articlesDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  
  return {
    id: slug,
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    readTime: data.readTime,
    tags: data.tags || [],
    content,
  };
}

export function getAllArticleSlugs(): Array<{ params: { slug: string } }> {
  const fileNames = fs.readdirSync(articlesDirectory);
  return fileNames
    .filter((name: string) => name.endsWith('.md'))
    .map((name: string) => ({
      params: {
        slug: name.replace(/\.md$/, ''),
      },
    }));
}