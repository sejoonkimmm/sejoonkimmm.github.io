import React, { useEffect, useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArticleBySlug, getAllArticleSlugs, getAllArticles } from '@/lib/articles';
import { Article } from '@/types';

import styles from '@/styles/ArticlePage.module.css';

type ArticleLink = { slug: string; title: string };

interface ArticlePageProps {
  article: Article & { content: string };
  older: ArticleLink | null;
  newer: ArticleLink | null;
}

const ArticlePage = ({ article, older, newer }: ArticlePageProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = document.getElementById('main-editor');
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const percent = scrollHeight <= clientHeight ? 0 : (scrollTop / (scrollHeight - clientHeight)) * 100;
      setProgress(percent);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Parse German date format (DD.MM.YYYY) or ISO format
  const parseDate = (dateString: string) => {
    if (dateString.includes('.')) {
      const [day, month, year] = dateString.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(dateString);
  };

  const formatDate = (dateString: string) => {
    if (dateString.includes('.')) {
      return dateString; // Already in German format
    }
    return parseDate(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.layout}>
      <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      <article className={styles.article}>
        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <div className={styles.meta}>
            <span className={styles.date}>
              {formatDate(article.date)}
            </span>
            <span className={styles.readTime}>{article.readTime}</span>
          </div>
          <div className={styles.tags}>
            {article.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className={styles.content}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => (
                <code className={inline ? styles.inlineCode : styles.codeBlock}>{children}</code>
              ),
              pre: ({ children }: { children?: React.ReactNode }) => (
                <pre className={styles.pre}>{children}</pre>
              ),
              h1: ({ children }: { children?: React.ReactNode }) => (
                <h2 className={styles.h2}>{children}</h2>
              ),
              h2: ({ children }: { children?: React.ReactNode }) => (
                <h2 className={styles.h2}>{children}</h2>
              ),
              h3: ({ children }: { children?: React.ReactNode }) => (
                <h3 className={styles.h3}>{children}</h3>
              ),
              blockquote: ({ children }: { children?: React.ReactNode }) => (
                <blockquote className={styles.blockquote}>{children}</blockquote>
              ),
              ul: ({ children }: { children?: React.ReactNode }) => (
                <ul className={styles.ul}>{children}</ul>
              ),
              ol: ({ children }: { children?: React.ReactNode }) => (
                <ol className={styles.ol}>{children}</ol>
              ),
              li: ({ children }: { children?: React.ReactNode }) => (
                <li className={styles.li}>{children}</li>
              ),
              a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
                <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              img: ({ src, alt }: { src?: string; alt?: string }) => {
                if (!src) {
                  return null;
                }
                return (
                  <span className={styles.imageWrapper}>
                    <Image
                      src={src}
                      alt={alt || ''}
                      width={800}
                      height={600}
                      style={{ width: '100%', height: 'auto' }}
                      className={styles.contentImage}
                    />
                  </span>
                );
              },
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </article>

      {(older || newer) && (
        <nav className={styles.articleNav} aria-label="More articles">
          {older ? (
            <Link href={`/articles/${older.slug}`} className={styles.navItem}>
              <span className={styles.navLabel}>← Older</span>
              <span className={styles.navTitle}>{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={`/articles/${newer.slug}`} className={`${styles.navItem} ${styles.navItemRight}`}>
              <span className={styles.navLabel}>Newer →</span>
              <span className={styles.navTitle}>{newer.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getAllArticleSlugs();

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params?.slug || typeof params.slug !== 'string') {
    return {
      notFound: true,
    };
  }

  const article = getArticleBySlug(params.slug);

  // Articles are sorted newest-first. Neighbours give prev/next navigation.
  const all = getAllArticles();
  const index = all.findIndex((a) => a.slug === params.slug);
  const newer = index > 0 ? { slug: all[index - 1].slug, title: all[index - 1].title } : null;
  const older =
    index >= 0 && index < all.length - 1
      ? { slug: all[index + 1].slug, title: all[index + 1].title }
      : null;

  return {
    props: {
      title: article.title,
      description: article.description,
      ogType: 'article',
      article,
      older,
      newer,
    },
  };
};

export default ArticlePage;
