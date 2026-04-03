import Link from 'next/link';
import { VscArrowRight, VscTerminalBash } from 'react-icons/vsc';
import TerraformCode from '@/components/TerraformCode';

import styles from '@/styles/HomePage.module.css';

export default function HomePage() {
  return (
    <div className={styles.heroLayout}>
      <div className={styles.container}>
        <div className={styles.codeSection}>
          <TerraformCode />
        </div>

        <div className={styles.infoSection}>
          <h1 className={styles.developerName}>
            <span className={styles.accentText}>Sejoon</span> Kim
          </h1>

          <div className={styles.developerRole}>
            <span className={styles.prompt}>$</span> DevOps Engineer
          </div>

          <p className={styles.bio}>
            Infrastructure as Code specialist building scalable, automated cloud
            solutions. Focused on Kubernetes, AWS, and modern DevOps practices.
          </p>

          <div className={styles.actionLinks}>
            <Link href="/projects" className={styles.primaryLink}>
              <VscTerminalBash />
              View Projects
            </Link>
            <Link href="/certifications" className={styles.secondaryLink}>
              Certifications
              <VscArrowRight />
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.bgGradient} />
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: { title: 'Home' },
  };
}
