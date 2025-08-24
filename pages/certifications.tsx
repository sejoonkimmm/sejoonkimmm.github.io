import CertificationsJson from '@/components/CertificationsJson';

import styles from '@/styles/CertificationsPage.module.css';

const CertificationsPage = () => {
  return (
    <div className={styles.layout}>
      <h1 className={styles.pageTitle}>DevOps Certifications</h1>
      <p className={styles.pageSubtitle}>
        Professional certifications and credentials in cloud platforms, 
        infrastructure automation, and DevOps practices.
      </p>
      <div className={styles.container}>
        <CertificationsJson />
      </div>
    </div>
  );
};

export async function getStaticProps() {
  return {
    props: { 
      title: 'Certifications'
    },
  };
}

export default CertificationsPage;