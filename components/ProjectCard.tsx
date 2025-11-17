import Link from 'next/link';

import { Project } from '@/types';

import styles from '@/styles/ProjectCard.module.css';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  // Check if link is external (GitHub) or internal (project page)
  const isExternal = project.link.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.card}
      >
        <div className={styles.content}>
          <h3 className={styles.title}>{project.title}</h3>
          <div className={styles.metadata}>
            <span className={styles.role}>{project.role}</span>
            <span className={styles.separator}>•</span>
            <span className={styles.organization}>{project.organization}</span>
          </div>
          <p className={styles.description}>{project.description}</p>
        </div>
      </a>
    );
  }

  return (
    <Link
      href={project.link}
      className={styles.card}
    >
      <div className={styles.content}>
        <h3 className={styles.title}>{project.title}</h3>
        <div className={styles.metadata}>
          <span className={styles.role}>{project.role}</span>
          <span className={styles.separator}>•</span>
          <span className={styles.organization}>{project.organization}</span>
        </div>
        <p className={styles.description}>{project.description}</p>
      </div>
    </Link>
  );
};

export default ProjectCard;
