import Link from 'next/link';
import Image from 'next/image';
import { VscCalendar, VscWatch } from 'react-icons/vsc';

import { Article } from '@/types';

import styles from '@/styles/ArticleCard.module.css';

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  // Parse German date format (DD.MM.YYYY) or ISO format
  const formatDate = (dateString: string) => {
    if (dateString.includes('.')) {
      return dateString; // Already in German format
    }
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Link href={`/articles/${article.slug}`} className={styles.container}>
      <div className={styles.imageWrapper}>
        <Image
          src={article.cover_image}
          alt={article.title}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className={styles.image}
        />
        <div className={styles.dateBadge}>
          <VscCalendar /> {formatDate(article.date)}
        </div>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{article.title}</h3>
        <p className={styles.description}>{article.description}</p>

        <div className={styles.footer}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <VscWatch className={styles.icon} /> {article.readTime}
            </div>
          </div>
          <div className={styles.tags}>
            {article.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard;
