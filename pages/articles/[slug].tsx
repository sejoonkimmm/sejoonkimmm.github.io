import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArticleBySlug, getAllArticleSlugs } from '@/lib/articles';
import { Article } from '@/types';

import styles from '@/styles/ArticlePage.module.css';

interface ArticlePageProps {
  article: Article & { content: string };
}

const ArticlePage = ({ article }: ArticlePageProps) => {
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

        {article.cover_image && (
          <div className={styles.coverImage}>
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              style={{ objectFit: 'cover' }}
              className={styles.image}
              priority
            />
          </div>
        )}

        <div className={styles.content}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: (props: any) => {
                const { inline, children, ...rest } = props;
                return (
                  <code
                    className={inline ? styles.inlineCode : styles.codeBlock}
                    {...rest}
                  >
                    {children}
                  </code>
                );
              },
              pre: (props: any) => {
                return <pre className={styles.pre}>{props.children}</pre>;
              },
              h1: (props: any) => {
                return <h1 className={styles.h1}>{props.children}</h1>;
              },
              h2: (props: any) => {
                return <h2 className={styles.h2}>{props.children}</h2>;
              },
              h3: (props: any) => {
                return <h3 className={styles.h3}>{props.children}</h3>;
              },
              blockquote: (props: any) => {
                return <blockquote className={styles.blockquote}>{props.children}</blockquote>;
              },
              ul: (props: any) => {
                return <ul className={styles.ul}>{props.children}</ul>;
              },
              ol: (props: any) => {
                return <ol className={styles.ol}>{props.children}</ol>;
              },
              li: (props: any) => {
                return <li className={styles.li}>{props.children}</li>;
              },
              a: (props: any) => {
                return (
                  <a href={props.href} className={styles.link} target="_blank" rel="noopener noreferrer">
                    {props.children}
                  </a>
                );
              },
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </article>
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

  return {
    props: {
      title: article.title,
      article,
    },
  };
};

export default ArticlePage;