import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/data/projects';

import styles from '@/styles/ProjectsPage.module.css';

const ProjectsPage = () => {
  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Projects</h1>
        <p className={styles.subtitle}>
          Here's a collection of my recent infrastructure and DevOps projects. These showcase
          my skills in cloud automation, Kubernetes, and modern DevOps practices.
        </p>
      </div>

      <div className={styles.projectsGrid}>
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </div>
  );
};

export async function getStaticProps() {
  return {
    props: { title: 'Projects' },
  };
}

export default ProjectsPage;
