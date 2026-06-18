import { useMemo, useState } from 'react';

import ArticleCard from '@/components/ArticleCard';
import { getAllArticles } from '@/lib/articles';
import { Article } from '@/types';

import styles from '@/styles/ArticlesPage.module.css';

interface ArticlesPageProps {
  articles: Article[];
}

const ArticlesPage = ({ articles }: ArticlesPageProps) => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(articles.flatMap((a) => a.tags))).sort((a, b) => a.localeCompare(b)),
    [articles]
  );

  const shown = activeTag ? articles.filter((a) => a.tags.includes(activeTag)) : articles;

  return (
    <div className={styles.layout}>
      <h1 className={styles.pageTitle}>My Articles</h1>
      <p className={styles.pageSubtitle}>
        Technical insights and tutorials about DevOps, Kubernetes, AWS, and infrastructure automation practices.
      </p>

      <div className={styles.tagFilter} role="group" aria-label="Filter articles by tag">
        <button
          type="button"
          className={activeTag === null ? styles.tagActive : styles.tagChip}
          onClick={() => setActiveTag(null)}
        >
          All ({articles.length})
        </button>
        {tags.map((tag) => (
          <button
            type="button"
            key={tag}
            className={activeTag === tag ? styles.tagActive : styles.tagChip}
            onClick={() => setActiveTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className={styles.container}>
        {shown.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
};

export async function getStaticProps() {
  const articles = getAllArticles();

  return {
    props: {
      title: 'Articles',
      articles,
    },
    revalidate: false, // Static content, no need to revalidate
  };
}

export default ArticlesPage;
