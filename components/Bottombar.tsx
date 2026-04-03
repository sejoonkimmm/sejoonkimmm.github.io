import { useRouter } from 'next/router';
import {
  VscBell,
  VscCheck,
  VscError,
  VscWarning,
  VscSourceControl,
  VscFile,
} from 'react-icons/vsc';

import styles from '@/styles/Bottombar.module.css';

const fileNames: Record<string, string> = {
  '/': 'home.tf',
  '/about': 'about.html',
  '/contact': 'contact.yaml',
  '/projects': 'projects.go',
  '/articles': 'articles.json',
  '/certifications': 'certifications.json',
  '/github': 'github.md',
  '/settings': 'settings',
};

const Bottombar = () => {
  const router = useRouter();
  const currentFile = fileNames[router.pathname] ?? router.pathname;

  return (
    <footer className={styles.bottomBar}>
      <div className={styles.container}>
        <a
          href="https://github.com/sejoonkimmm/vscode-portfolio"
          target="_blank"
          rel="noreferrer noopener"
          className={styles.section}
        >
          <VscSourceControl className={styles.icon} />
          <p>main</p>
        </a>
        <div className={styles.section}>
          <VscError className={styles.icon} />
          <p className={styles.errorText}>0</p>&nbsp;&nbsp;
          <VscWarning className={styles.icon} />
          <p>0</p>
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.section}>
          <VscFile className={styles.icon} />
          <p>{currentFile}</p>
        </div>
        <div className={styles.section}>
          <VscCheck className={styles.icon} />
          <p>Prettier</p>
        </div>
        <div className={styles.section}>
          <VscBell />
        </div>
      </div>
    </footer>
  );
};

export default Bottombar;
