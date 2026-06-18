import { GetServerSideProps } from 'next';
import { getAllArticles } from '@/lib/articles';
import { SITE_URL, SITE_NAME } from '@/lib/site';

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Articles use German date format (DD.MM.YYYY) or ISO.
const toRfc822 = (dateString: string): string => {
  if (dateString.includes('.')) {
    const [day, month, year] = dateString.split('.');
    return new Date(Number(year), Number(month) - 1, Number(day)).toUTCString();
  }
  return new Date(dateString).toUTCString();
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const articles = getAllArticles();

  const items = articles
    .map(
      (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${SITE_URL}/articles/${article.slug}</link>
      <guid>${SITE_URL}/articles/${article.slug}</guid>
      <pubDate>${toRfc822(article.date)}</pubDate>
      <description>${escapeXml(article.description || '')}</description>
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME} — Blog</title>
    <link>${SITE_URL}/articles</link>
    <description>DevOps, Kubernetes, AWS, and infrastructure automation.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function Feed() {
  return null;
}
