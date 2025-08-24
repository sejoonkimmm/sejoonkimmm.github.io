import ContactYaml from '@/components/ContactYaml';

import styles from '@/styles/ContactPage.module.css';

const ContactPage = () => {
  return (
    <div className={styles.layout}>
      <h1 className={styles.pageTitle}>Contact Me</h1>
      <p className={styles.pageSubtitle}>
        Infrastructure automation specialist and cloud architect.
        Always open to discuss DevOps, Site Reliability, and Platform Engineering.
      </p>
      <div className={styles.container}>
        <div className={styles.contactContainer}>
          <ContactYaml />
        </div>
      </div>
    </div>
  );
};

export async function getStaticProps() {
  return {
    props: { title: 'Contact' },
  };
}

export default ContactPage;
