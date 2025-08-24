import styles from '@/styles/ContactCode.module.css';

const contactItems = [
  {
    social: 'website',
    link: 'kimsejoon.dev',
    href: 'https://kimsejoon.dev',
  },
  {
    social: 'email',
    link: 'skim.devops@gmail.com',
    href: 'mailto:skim.devops@gmail.com',
  },
  {
    social: 'github',
    link: 'sejoonkimmm',
    href: 'sejoonkimmm',
  },
  {
    social: 'linkedin',
    link: 'sejokimde',
    href: 'sejokimde',
  },
];

const ContactCode = () => {
  return (
    <div className={styles.code}>
      <p className={styles.line}>
        <span className={styles.className}>.socials</span> &#123;
      </p>
      {contactItems.map((item, index) => (
        <p className={styles.line} key={index}>
          &nbsp;&nbsp;&nbsp;{item.social}:{' '}
          <a href={item.href} target="_blank" rel="noopener">

            {item.link}
          </a>
          ;
        </p>
      ))}
      <p className={styles.line}>&#125;</p>
    </div>
  );
};

export default ContactCode;
