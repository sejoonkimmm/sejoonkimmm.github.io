import CertificationCard from '@/components/CertificationCard';
import { getCertifications } from '@/lib/certifications';

import styles from '@/styles/CertificationsPage.module.css';

const CertificationsPage = ({ certifications }: { certifications: any[] }) => {
  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Certifications</h1>
        <p className={styles.subtitle}>
          Professional certifications and credentials in cloud platforms, 
          infrastructure automation, and DevOps practices.
        </p>
      </div>

      <div className={styles.certificationsGrid}>
        {certifications.map((certification) => (
          <CertificationCard key={certification.id} certification={certification} />
        ))}
      </div>
    </div>
  );
};

export async function getStaticProps() {
  const certifications = getCertifications();
  
  return {
    props: { 
      title: 'Certifications',
      certifications,
    },
  };
}

export default CertificationsPage;