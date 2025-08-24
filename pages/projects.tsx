import ProjectsGo from '@/components/ProjectsGo';

import styles from '@/styles/ProjectsPage.module.css';

const ProjectsPage = () => {
  return (
    <div className={styles.layout}>
      <h1 className={styles.pageTitle}>DevOps Infrastructure Projects</h1>
      <p className={styles.pageSubtitle}>
        Infrastructure as Code projects showcasing cloud automation, 
        Kubernetes orchestration, and DevOps best practices.
      </p>

      <div className={styles.container}>
        <ProjectsGo />
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
