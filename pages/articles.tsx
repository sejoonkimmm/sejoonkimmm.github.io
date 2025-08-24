import ArticleCard from '@/components/ArticleCard';
import { getAllArticles } from '@/lib/articles';
import { Article } from '@/types';

import styles from '@/styles/ArticlesPage.module.css';

interface ArticlesPageProps {
  articles: Article[];
}

const ArticlesPage = ({ articles }: ArticlesPageProps) => {
  return (
    <div className={styles.layout}>
      <h1 className={styles.pageTitle}>My Articles</h1>
      <p className={styles.pageSubtitle}>
        Insights and tutorials about web development, React, TypeScript, and modern JavaScript practices.
      </p>
      <div className={styles.container}>
        {articles.map((article) => (
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
      articles 
    },
    revalidate: false, // Static content, no need to revalidate
  };
}

export default ArticlesPage;
