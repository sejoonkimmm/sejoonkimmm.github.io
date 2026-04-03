import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  VscFiles,
  VscCode,
  VscEdit,
  VscVerified,
  VscAccount,
} from 'react-icons/vsc';

import Titlebar from '@/components/Titlebar';
import Sidebar from '@/components/Sidebar';
import Explorer from '@/components/Explorer';
import Bottombar from '@/components/Bottombar';
import Tabsbar from '@/components/Tabsbar';

import styles from '@/styles/Layout.module.css';

const mobileNavItems = [
  { Icon: VscFiles, path: '/', label: 'Home' },
  { Icon: VscCode, path: '/projects', label: 'Projects' },
  { Icon: VscEdit, path: '/articles', label: 'Articles' },
  { Icon: VscVerified, path: '/certifications', label: 'Certifications' },
  { Icon: VscAccount, path: '/about', label: 'About' },
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  // set scroll to top of main content on url pathname change
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const main = document.getElementById('main-editor');
    if (main) {
      main.scrollTop = 0;
    }
  }, [router.pathname]);

  useEffect(() => {
    const handleStart = () => setTransitioning(true);
    const handleComplete = () => setTransitioning(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      <Titlebar />
      <div className={styles.main}>
        <Sidebar />
        <Explorer />
        <div style={{ width: '100%' }}>
          <Tabsbar />
          <main id="main-editor" className={`${styles.content} ${transitioning ? styles.transitioning : ''}`}>
            {children}
          </main>
        </div>
      </div>
      <Bottombar />
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {mobileNavItems.map(({ Icon, path, label }) => (
          <Link
            key={path}
            href={path}
            aria-label={label}
            className={router.pathname === path ? styles.mobileNavActive : styles.mobileNavItem}
          >
            <Icon />
          </Link>
        ))}
      </nav>
    </>
  );
};

export default Layout;
