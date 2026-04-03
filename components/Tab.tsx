import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

import styles from '@/styles/Tab.module.css';

interface TabProps {
  icon: string;
  filename: string;
  path: string;
}

const Tab = ({ icon, filename, path }: TabProps) => {
  const router = useRouter();

  const isActive = router.pathname === path;

  return (
    <Link href={path}>
      <div
        className={`${styles.tab} ${isActive && styles.active}`}
        role="tab"
        aria-selected={isActive}
      >
        <Image src={icon} alt={filename} height={18} width={18} />
        <p>{filename}</p>
      </div>
    </Link>
  );
};

export default Tab;
