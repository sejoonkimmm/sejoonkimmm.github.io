import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article } from '@/types';

const articlesDirectory = path.join(process.cwd(), 'articles');

export function getAllArticles(): Article[] {
  const fileNames = fs.readdirSync(articlesDirectory);
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
        cover_image: data.cover_image,
        date: data.date,
        readTime: data.readTime,
        tags: data.tags || [],
      } as Article;
    })
    .sort((a: Article, b: Article) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    cover_image: data.cover_image,
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