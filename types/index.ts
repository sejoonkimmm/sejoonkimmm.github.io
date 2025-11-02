export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  date: string;
  readTime: string;
  tags: string[];
  content?: string; // markdown content
}

export interface Project {
  title: string;
  description: string;
  logo: string;
  link: string;
  slug: string;
}

export interface Repo {
  id: number;
  name: string;
  description: string;
  language: string;
  watchers: number;
  forks: number;
  stargazers_count: number;
  html_url: string;
  homepage: string;
}

export interface User {
  login: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
}

export interface Certification {
  id: string;
  name: string;
  provider: string;
  description: string;
  logo: string;
  issueDate: string;
  expiryDate?: string;
  credentialId: string;
  verificationUrl?: string;
  skills: string[];
  level: 'Foundational' | 'Associate' | 'Professional' | 'Expert';
}

export interface Experience {
  id: string;
  title: string;
  organization: string;
  role: string;
  period: string;
  description: string;
  image: string;
  logo: string;
  tags: string[];
}
