import { GetServerSideProps } from 'next';
import { getAllArticleSlugs } from '@/lib/articles';
import { getAllProjectSlugs } from '@/lib/projects';
import { getAllCertificationSlugs } from '@/lib/certificationPages';
import { getAllExperienceSlugs } from '@/lib/experiencePages';
import { SITE_URL } from '@/lib/site';

const staticPaths = [
  '',
  '/about',
  '/projects',
  '/articles',
  '/certifications',
  '/contact',
  '/github',
  '/settings',
];

const toUrl = (loc: string) => `  <url><loc>${SITE_URL}${loc}</loc></url>`;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const articles = getAllArticleSlugs().map((a) => `/articles/${a.params.slug}`);
  const projects = getAllProjectSlugs().map((slug) => `/projects/${slug}`);
  const certifications = getAllCertificationSlugs().map((slug) => `/certifications/${slug}`);
  const experiences = getAllExperienceSlugs().map((slug) => `/experiences/${slug}`);

  const paths = [...staticPaths, ...articles, ...projects, ...certifications, ...experiences];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(toUrl).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
