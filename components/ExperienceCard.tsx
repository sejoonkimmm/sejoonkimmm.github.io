import Image from 'next/image';
import Link from 'next/link';

import { Experience } from '@/types';

import styles from '@/styles/ExperienceCard.module.css';

interface ExperienceCardProps {
  experience: Experience;
}

const ExperienceCard = ({ experience }: ExperienceCardProps) => {
  return (
    <Link
      href={`/experiences/${experience.id}`}
      className={styles.card}
    >
      <div className={styles.content}>
        <div className={styles.logoWrapper}>
          <Image
            src={experience.logo}
            alt={`${experience.organization} logo`}
            width={32}
            height={32}
            sizes="(max-width: 480px) 22px, (max-width: 768px) 26px, 32px"
            className={styles.logo}
          />
        </div>
        <h3 className={styles.title}>{experience.title}</h3>
        <p className={styles.organization}>{experience.organization}</p>
        <p className={styles.role}>{experience.role}</p>
        <p className={styles.period}>{experience.period}</p>
        <p className={styles.description}>{experience.description}</p>
        <div className={styles.tags}>
          {experience.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default ExperienceCard;
