import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  VscAccount,
  VscSettings,
  VscMail,
  VscGithubAlt,
  VscCode,
  VscFiles,
  VscEdit,
} from 'react-icons/vsc';

import styles from '@/styles/Sidebar.module.css';

const sidebarTopItems = [
  { Icon: VscFiles, path: '/', label: 'Home' },
  { Icon: VscGithubAlt, path: '/github', label: 'GitHub' },
  { Icon: VscCode, path: '/projects', label: 'Projects' },
  { Icon: VscEdit, path: '/articles', label: 'Articles' },
  { Icon: VscMail, path: '/contact', label: 'Contact' },
];

const sidebarBottomItems = [
  { Icon: VscAccount, path: '/about', label: 'About' },
  { Icon: VscSettings, path: '/settings', label: 'Settings' },
];

const Sidebar = () => {
  const router = useRouter();

  return (
    <aside className={styles.sidebar} role="navigation" aria-label="Main navigation">
      <div className={styles.sidebarTop}>
        {sidebarTopItems.map(({ Icon, path, label }) => (
          <Link href={path} key={path} aria-label={label}>
            <div
              className={`${styles.iconContainer} ${
                router.pathname === path && styles.active
              }`}
            >
              <Icon
                size={16}
                fill={
                  router.pathname === path
                    ? 'rgb(225, 228, 232)'
                    : 'rgb(106, 115, 125)'
                }
                className={styles.icon}
              />
            </div>
          </Link>
        ))}
      </div>
      <div className={styles.sidebarBottom}>
        {sidebarBottomItems.map(({ Icon, path, label }) => (
          <div className={styles.iconContainer} key={path}>
            <Link href={path} aria-label={label}>
              <Icon
                fill={
                  router.pathname === path
                    ? 'rgb(225, 228, 232)'
                    : 'rgb(106, 115, 125)'
                }
                className={styles.icon}
              />
            </Link>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
