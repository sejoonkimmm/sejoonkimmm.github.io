import { GetStaticPaths, GetStaticProps } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArticleBySlug, getAllArticleSlugs } from '@/lib/articles';
import { Article } from '@/types';

import styles from '@/styles/ArticlePage.module.css';

interface ArticlePageProps {
  article: Article & { content: string };
}

const ArticlePage = ({ article }: ArticlePageProps) => {
  return (
    <div className={styles.layout}>
      <article className={styles.article}>
        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <div className={styles.meta}>
            <span className={styles.date}>{new Date(article.date).toLocaleDateString()}</span>
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
              code({ inline, children, ...props }) {
                return (
                  <code
                    className={inline ? styles.inlineCode : styles.codeBlock}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre({ children }) {
                return <pre className={styles.pre}>{children}</pre>;
              },
              h1({ children }) {
                return <h1 className={styles.h1}>{children}</h1>;
              },
              h2({ children }) {
                return <h2 className={styles.h2}>{children}</h2>;
              },
              h3({ children }) {
                return <h3 className={styles.h3}>{children}</h3>;
              },
              blockquote({ children }) {
                return <blockquote className={styles.blockquote}>{children}</blockquote>;
              },
              ul({ children }) {
                return <ul className={styles.ul}>{children}</ul>;
              },
              ol({ children }) {
                return <ol className={styles.ol}>{children}</ol>;
              },
              li({ children }) {
                return <li className={styles.li}>{children}</li>;
              },
              a({ href, children }) {
                return (
                  <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
                    {children}
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