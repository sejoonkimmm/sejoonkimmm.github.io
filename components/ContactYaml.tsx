import styles from '@/styles/ContactYaml.module.css';

// Your contact information - update these with your actual details
const contactData = {
  metadata: {
    name: 'Sejoon Kim',
    role: 'DevOps Engineer',
    location: 'Wolfsburg, Germany',
    timezone: 'Europe/Berlin',
  },
  contact: {
    email: 'skim.devops@gmail.com',
    phone: '+49 171 2742820',
    website: 'https://kimsejoon.dev',
  },
  social: {
    github: 'sejoonkimmm',
    linkedin: 'sejokimde',
  },
  availability: {
    status: 'CloudCops',
    preferred_contact: 'email',
    response_time: '24hours',
  }
};

const ContactYaml = () => {
  const renderValue = (key: string, value: string, href?: string, isLast?: boolean) => {
    const content = href ? (
      <a href={href} target="_blank" rel="noopener" className={styles.link}>
        {value}
      </a>
    ) : (
      <span className={styles.string}>&quot;{value}&quot;</span>
    );

    return (
      <div className={styles.line} key={key}>
        <span className={styles.indent}>    </span>
        <span className={styles.key}>{key}</span>
        <span className={styles.colon}>: </span>
        {content}
        {!isLast && <span className={styles.comma}></span>}
      </div>
    );
  };

  const renderSection = (sectionName: string, data: Record<string, string>, isLast: boolean = false) => {
    const entries = Object.entries(data);
    return (
      <div key={sectionName}>
        <div className={styles.line}>
          <span className={styles.indent}>  </span>
          <span className={styles.key}>{sectionName}</span>
          <span className={styles.colon}>:</span>
        </div>
        {entries.map(([key, value], index) => {
          let href = '';
          
          // Generate appropriate links based on the key
          switch (key) {
            case 'email':
              href = `mailto:${value}`;
              break;
            case 'phone':
              href = `tel:${value}`;
              break;
            case 'website':
              href = value.startsWith('http') ? value : `https://${value}`;
              break;
            case 'github':
              href = `https://github.com/${value}`;
              break;
            case 'linkedin':
              href = `https://linkedin.com/in/${value}`;
              break;
            case 'twitter':
              href = `https://twitter.com/${value}`;
              break;
            case 'medium':
              href = `https://medium.com/@${value}`;
              break;
          }

          return renderValue(key, value, href, index === entries.length - 1);
        })}
        {!isLast && <div className={styles.line}></div>}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.comment}># DevOps Engineer Contact Configuration</span>
      </div>
      <div className={styles.yamlContent}>
        <div className={styles.line}>
          <span className={styles.comment}># contact.yaml</span>
        </div>
        <div className={styles.line}>
          <span className={styles.key}>apiVersion</span>
          <span className={styles.colon}>: </span>
          <span className={styles.string}>v1</span>
        </div>
        <div className={styles.line}>
          <span className={styles.key}>kind</span>
          <span className={styles.colon}>: </span>
          <span className={styles.string}>Contact</span>
        </div>
        <div className={styles.line}></div>
        
        {renderSection('metadata', contactData.metadata)}
        {renderSection('contact', contactData.contact)}
        {renderSection('social', contactData.social)}
        {renderSection('availability', contactData.availability, true)}
      </div>
    </div>
  );
};

export default ContactYaml;