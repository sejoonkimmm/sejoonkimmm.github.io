import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getCertificationBySlug, getAllCertificationSlugs } from '@/lib/certificationPages';
import { CertificationWithContent } from '@/lib/certificationPages';

import styles from '@/styles/ArticlePage.module.css'; // Reusing article styles

interface CertificationPageProps {
  certification: CertificationWithContent;
}

const CertificationPage = ({ certification }: CertificationPageProps) => {
  // Format date as "Month Year"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.layout}>
      <article className={styles.article}>
        <header className={styles.header}>
          <h1 className={styles.title}>{certification.title}</h1>
          <div className={styles.meta}>
            <span className={styles.date}>
              {formatDate(certification.date)}
            </span>
            {certification.expiryDate && (
              <span className={styles.date}>
                Expires {formatDate(certification.expiryDate)}
              </span>
            )}
            <span className={styles.readTime}>{certification.provider}</span>
          </div>
          <div className={styles.tags}>
            <span className={`${styles.tag} ${styles.levelTag}`}>
              {certification.level}
            </span>
            {certification.skills.map((skill) => (
              <span key={skill} className={styles.tag}>
                {skill}
              </span>
            ))}
          </div>
        </header>
        
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
              h1: (props: any) => <h1 className={styles.h1} {...props} />,
              h2: (props: any) => <h2 className={styles.h2} {...props} />,
              h3: (props: any) => <h3 className={styles.h3} {...props} />,
              h4: (props: any) => <h4 className={styles.h4} {...props} />,
              p: (props: any) => <p className={styles.paragraph} {...props} />,
              ul: (props: any) => <ul className={styles.list} {...props} />,
              ol: (props: any) => <ol className={styles.orderedList} {...props} />,
              li: (props: any) => <li className={styles.listItem} {...props} />,
              blockquote: (props: any) => (
                <blockquote className={styles.blockquote} {...props} />
              ),
              a: (props: any) => (
                <a
                  className={styles.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              img: (props: any) => {
                const { src, alt } = props;
                return (
                  <span className={styles.imageWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src || ''}
                      alt={alt || ''}
                      className={styles.certificationImage}
                      loading="lazy"
                    />
                  </span>
                );
              },
            }}
          >
            {certification.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllCertificationSlugs();

  const paths = slugs.map((slug) => ({
    params: { slug },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<CertificationPageProps> = async ({ params }) => {
  if (!params?.slug || typeof params.slug !== 'string') {
    return {
      notFound: true,
    };
  }

  const certification = getCertificationBySlug(params.slug);

  if (!certification) {
    return {
      notFound: true,
    };
  }

  // Convert undefined values to null for JSON serialization
  const serializedCertification = {
    ...certification,
    expiryDate: certification.expiryDate || null,
    verificationUrl: certification.verificationUrl || null,
  };

  return {
    props: {
      certification: serializedCertification,
      title: certification.title,
    },
  };
};

export default CertificationPage;
