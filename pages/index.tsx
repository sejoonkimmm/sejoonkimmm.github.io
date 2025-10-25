import Link from 'next/link';
import { VscArrowRight, VscTerminalBash, VscCloud } from 'react-icons/vsc';
import TerraformCode from '@/components/TerraformCode';
import TypeWriter from '@/components/TypeWriter';

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
            <VscCloud className={styles.roleIcon} />
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

          <p className={styles.bio}>
            Infrastructure as Code specialist building scalable, automated cloud solutions.
            Passionate about Kubernetes, AWS, and modern DevOps practices with industry certifications.
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>5+</span>
              <span className={styles.statLabel}>Certifications</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>2+</span>
              <span className={styles.statLabel}>Years Experience</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>99.9%</span>
              <span className={styles.statLabel}>Uptime Goal</span>
            </div>
          </div>

          <div className={styles.actionLinks}>
            <Link href="/projects" className={styles.primaryLink}>
              <VscTerminalBash />
              View Infrastructure
            </Link>
            <Link href="/certifications" className={styles.secondaryLink}>
              <VscArrowRight />
              Certifications
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.decorElements}>
        <div className={styles.codeFlare}></div>
        <div className={styles.gridLines}></div>
        <div className={styles.terraformBlock1}>{'resource'}</div>
        <div className={styles.terraformBlock2}>{'module'}</div>
        <div className={styles.terraformBlock3}>{'data'}</div>
        <div className={styles.terraformBlock4}>{'output'}</div>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
        <div className={styles.orb3}></div>
        <div className={styles.codeSymbol1}>{'${}'}</div>
        <div className={styles.codeSymbol2}>{'[]'}</div>
        <div className={styles.codeSymbol3}>{'= >'}</div>
        <div className={styles.dotPattern}></div>
        <div className={styles.mobileAccent}></div>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: { title: 'Home' },
  };
}
