import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProjectBySlug, getAllProjectSlugs } from '@/lib/projects';
import { ProjectWithContent } from '@/lib/projects';

import styles from '@/styles/ArticlePage.module.css'; // Reusing article styles

interface ProjectPageProps {
  project: ProjectWithContent;
}

const ProjectPage = ({ project }: ProjectPageProps) => {
  // For projects, we display the date as is (month range format)
  const formatProjectDate = (dateString: string) => {
    // If it's already in month range format (contains English month names), return as is
    if (dateString.includes('July') || dateString.includes('June') || 
        dateString.includes('March') || dateString.includes('January') ||
        dateString.includes('February') || dateString.includes('April') ||
        dateString.includes('May') || dateString.includes('August') ||
        dateString.includes('September') || dateString.includes('October') ||
        dateString.includes('November') || dateString.includes('December')) {
      return dateString;
    }
    
    // Otherwise, parse and format
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
    <div className={styles.layout}>
      <article className={styles.article}>
        <header className={styles.header}>
          <h1 className={styles.title}>{project.title}</h1>
          <div className={styles.meta}>
            <span className={styles.date}>
              {formatProjectDate(project.date)}
            </span>
            <span className={styles.readTime}>{project.readTime}</span>
          </div>
          <div className={styles.tags}>
            {project.tags.map((tag) => (
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
                <img className={styles.image} {...props} alt={props.alt || ''} />
              ),
            }}
          >
            {project.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllProjectSlugs();
  
  const paths = slugs.map((slug) => ({
    params: { slug },
  }));

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

  const project = getProjectBySlug(params.slug);

  if (!project) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      project,
      title: project.title,
    },
  };
};

export default ProjectPage;
