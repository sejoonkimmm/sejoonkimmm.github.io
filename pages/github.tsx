import Image from 'next/image';
import { VscRepo, VscPerson } from 'react-icons/vsc';

import RepoCard from '@/components/RepoCard';
import { Repo, User } from '@/types';

import styles from '@/styles/GithubPage.module.css';

interface GithubPageProps {
  repos: Repo[];
  user: User;
}

const GithubPage = ({ repos, user }: GithubPageProps) => {
  return (
    <div className={styles.layout}>
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>GitHub</h1>
        <p className={styles.pageSubtitle}>
          Browse through my GitHub repositories and see what I&apos;ve been
          working on. These are some of my public repositories showcasing
          various projects and skills.
        </p>
      </div>

      <div className={styles.githubPage}>
        <div className={styles.profileSection}>
          <div className={styles.profileInfo}>
            <Image
              src={user.avatar_url}
              className={styles.avatar}
              alt={user.login}
              width={100}
              height={100}
              priority
            />
            <div className={styles.userInfo}>
              <h2 className={styles.username}>{user.login}</h2>
              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <VscRepo className={styles.statIcon} />
                  <span>{user.public_repos} repositories</span>
                </div>
                <div className={styles.statItem}>
                  <VscPerson className={styles.statIcon} />
                  <span>{user.followers} followers</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Popular Repositories</h3>
        </div>
        <div className={styles.reposContainer}>
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      </div>
    </div>
  );
};

export async function getStaticProps() {
  try {
    const username = process.env.NEXT_PUBLIC_GITHUB_USERNAME || 'sejoonkimmm';
    
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    const user = await userRes.json();

    // Manually specify the repositories you want to show
    const repoNames = [
      'car-instrument', 
      'Inception-of-things',
      'ft_transcendence',
      'infrastructure-repository',
      'ft_irc'
    ];

    const repos = [];
    for (const repoName of repoNames) {
      try {
        const repoRes = await fetch(`https://api.github.com/repos/${username}/${repoName}`);
        if (repoRes.ok) {
          const repo = await repoRes.json();
          repos.push(repo);
        }
      } catch (error) {
        console.error(`Failed to fetch repo ${repoName}:`, error);
      }
    }

    return {
      props: { title: 'GitHub', repos, user },
      revalidate: 600,
    };
  } catch (error) {
    console.error('Failed to fetch GitHub data:', error);
    
    // Return fallback data
    return {
      props: {
        title: 'GitHub',
        repos: [],
        user: {
          login: 'sejoonkimmm',
          avatar_url: '/images/avatar.png',
          public_repos: 0,
          followers: 0,
        },
      },
      revalidate: 600,
    };
  }
}

export default GithubPage;
