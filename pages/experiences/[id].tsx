import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getExperienceBySlug, getAllExperienceSlugs, ExperienceWithContent } from '@/lib/experiencePages';

import styles from '@/styles/ArticlePage.module.css';

interface ExperiencePageProps {
  experience: ExperienceWithContent;
}

const ExperiencePage = ({ experience }: ExperiencePageProps) => {
  return (
    <div className={styles.layout}>
      <article className={styles.article}>
        <header className={styles.header}>
          <h1 className={styles.title}>{experience.title}</h1>
          <div className={styles.meta}>
            <span className={styles.readTime}>{experience.organization}</span>
            <span className={styles.date}>{experience.period}</span>
          </div>
          <div className={styles.tags}>
            <span className={`${styles.tag} ${styles.roleTag}`}>
              {experience.role}
            </span>
            {experience.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        {experience.image && (
          <div className={styles.coverImage}>
            <Image
              src={experience.image}
              alt={experience.title}
              width={1200}
              height={630}
              className={styles.image}
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
              img: (props: any) => (
                <Image
                  src={props.src || ''}
                  alt={props.alt || ''}
                  width={800}
                  height={400}
                  className={styles.contentImage}
                />
              ),
            }}
          >
            {experience.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllExperienceSlugs();

  const paths = slugs.map((id) => ({
    params: { id },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!params?.id || typeof params.id !== 'string') {
    return {
      notFound: true,
    };
  }

  const experience = getExperienceBySlug(params.id);

  if (!experience) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      experience,
      title: experience.title,
    },
  };
};

export default ExperiencePage;
