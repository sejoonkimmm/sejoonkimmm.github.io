import styles from '@/styles/AboutPage.module.css';

const AboutPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Sejoon Kim</h1>
        <div className={styles.subtitle}>DevOps Engineer</div>

        <div className={styles.aboutContent}>
          <section className={styles.section}>
            <p className={styles.paragraph}>
              Guten tag! I&apos;m a DevOps engineer based in Germany.
            </p>
            <p className={styles.paragraph}>
              I&apos;m focused on DevOps Engineering
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Experience</h2>
            <p className={styles.paragraph}>
              Currently at <span className={styles.highlight}>CloudCops</span> as
              DevOps Engineer
            </p>
            <p className={styles.paragraph}>
              Currently participating in B2C service projects as a DevOps engineer,
              implementing GitOps deployment methods using ArgoCD in Kubernetes environments.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export async function getStaticProps() {
  return {
    props: { title: 'About' },
  };
}

export default AboutPage;
