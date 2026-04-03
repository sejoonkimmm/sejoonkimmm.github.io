import TypeWriter from '@/components/TypeWriter';
import ExperienceCard from '@/components/ExperienceCard';
import { experiences } from '@/data/experiences';
import styles from '@/styles/AboutPage.module.css';

const AboutPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Sejoon Kim</h1>
        <div className={styles.subtitle}>
          <TypeWriter
            texts={[
              "DevOps Engineer",
              "Site Reliability Engineer",
              "Platform Engineer",
              "Cloud Engineer"
            ]}
            typingSpeed={80}
            deletingSpeed={40}
            pauseDuration={2000}
          />
        </div>

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
            <h2 className={styles.sectionTitle}>Current Role</h2>
            <p className={styles.paragraph}>
              Currently at <span className={styles.highlight}>CloudCops</span> as
              DevOps Engineer
            </p>
            <p className={styles.paragraph}>
              Currently participating in B2C service projects as a DevOps engineer,
              implementing GitOps deployment methods using ArgoCD in Kubernetes environments.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>My Journey</h2>
            <div className={styles.experiencesGrid}>
              {experiences.map((experience) => (
                <ExperienceCard key={experience.id} experience={experience} />
              ))}
            </div>
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
