import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const certificationsDirectory = path.join(process.cwd(), 'certifications');

export interface CertificationWithContent {
  slug: string;
  title: string;
  date: string;
  provider: string;
  description: string;
  credentialId: string;
  expiryDate?: string | null;
  verificationUrl?: string | null;
  skills: string[];
  level: string;
  logo: string;
  content: string;
}

export interface CertificationMetadata {
  slug: string;
  title: string;
  date: string;
  provider: string;
  description: string;
  credentialId: string;
  expiryDate?: string | null;
  verificationUrl?: string | null;
  skills: string[];
  level: string;
  logo: string;
}

export function getAllCertificationSlugs(): string[] {
  if (!fs.existsSync(certificationsDirectory)) {
    return [];
  }
  
  const fileNames = fs.readdirSync(certificationsDirectory);
  return fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => fileName.replace(/\.md$/, ''));
}

export function getCertificationBySlug(slug: string): CertificationWithContent | null {
  try {
    const fullPath = path.join(certificationsDirectory, `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    return {
      slug,
      title: data.title || '',
      date: data.date || '',
      provider: data.provider || '',
      description: data.description || '',
      credentialId: data.credentialId || '',
      expiryDate: data.expiryDate || null,
      verificationUrl: data.verificationUrl || null,
      skills: data.skills || [],
      level: data.level || '',
      logo: data.logo || '',
      content,
    };
  } catch (error) {
    console.error(`Error reading certification ${slug}:`, error);
    return null;
  }
}

export function getAllCertificationsFromMarkdown(): CertificationMetadata[] {
  const slugs = getAllCertificationSlugs();
  
  // Helper function to parse different date formats for sorting
  const parseCertificationDate = (dateString: string): Date => {
    // If it's German format (DD.MM.YYYY)
    if (dateString.includes('.')) {
      const [day, month, year] = dateString.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Default to ISO format
    return new Date(dateString);
  };
  
  const certifications = slugs
    .map(slug => {
      const certification = getCertificationBySlug(slug);
      if (!certification) return null;
      
      const { content, ...metadata } = certification;
      // Ensure undefined values are converted to null for proper typing
      const processedMetadata: CertificationMetadata = {
        ...metadata,
        expiryDate: metadata.expiryDate || null,
        verificationUrl: metadata.verificationUrl || null,
      };
      return processedMetadata;
    })
    .filter((certification): certification is CertificationMetadata => certification !== null)
    .sort((a, b) => {
      // Sort by date in descending order
      return parseCertificationDate(b.date).getTime() - parseCertificationDate(a.date).getTime();
    });
    
  return certifications;
}
