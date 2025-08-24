import CertificationCard from '@/components/CertificationCard';
import { getCertifications } from '@/lib/certifications';
import { Certification } from '@/types';

import styles from '@/styles/CertificationsPage.module.css';

interface CertificationsPageProps {
  certifications: Certification[];
}

const CertificationsPage = ({ certifications }: CertificationsPageProps) => {
  return (
    <div className={styles.layout}>
      <h1 className={styles.pageTitle}>DevOps Certifications</h1>
      <p className={styles.pageSubtitle}>
        Professional certifications and credentials in cloud platforms, 
        infrastructure automation, and DevOps practices.
      </p>
      <div className={styles.container}>
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
      certifications 
    },
  };
}

export default CertificationsPage;