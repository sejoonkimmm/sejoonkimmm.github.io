import Image from 'next/image';
import { VscCalendar, VscVerified, VscClock } from 'react-icons/vsc';

import { Certification } from '@/types';

import styles from '@/styles/CertificationCard.module.css';

interface CertificationCardProps {
  certification: Certification;
}

const CertificationCard = ({ certification }: CertificationCardProps) => {
  const isExpired = certification.expiryDate && new Date(certification.expiryDate) < new Date();
  const isExpiringSoon = certification.expiryDate && 
    new Date(certification.expiryDate) > new Date() && 
    new Date(certification.expiryDate).getTime() - new Date().getTime() < 90 * 24 * 60 * 60 * 1000; // 90 days

  return (
    <div className={`${styles.container} ${isExpired ? styles.expired : ''}`}>
      <div className={styles.header}>
        <div className={styles.logoWrapper}>
          <Image
            src={certification.logo}
            alt={`${certification.provider} logo`}
            width={60}
            height={60}
            className={styles.logo}
          />
        </div>
        <div className={styles.level}>
          <span className={`${styles.levelBadge} ${styles[certification.level.toLowerCase()]}`}>
            {certification.level}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{certification.name}</h3>
        <p className={styles.provider}>{certification.provider}</p>
        <p className={styles.description}>{certification.description}</p>

        <div className={styles.details}>
          <div className={styles.detail}>
            <VscCalendar className={styles.icon} />
            <span>Issued: {new Date(certification.issueDate).toLocaleDateString()}</span>
          </div>
          
          {certification.expiryDate && (
            <div className={`${styles.detail} ${isExpired ? styles.expired : isExpiringSoon ? styles.expiringSoon : ''}`}>
              <VscClock className={styles.icon} />
              <span>
                {isExpired ? 'Expired: ' : 'Expires: '}
                {new Date(certification.expiryDate).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className={styles.detail}>
            <VscVerified className={styles.icon} />
            <span>ID: {certification.credentialId}</span>
          </div>
        </div>

        <div className={styles.skills}>
          {certification.skills.slice(0, 4).map((skill) => (
            <span key={skill} className={styles.skill}>
              {skill}
            </span>
          ))}
          {certification.skills.length > 4 && (
            <span className={styles.skill}>+{certification.skills.length - 4} more</span>
          )}
        </div>

        {certification.verificationUrl && (
          <div className={styles.footer}>
            <a
              href={certification.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.verifyButton}
            >
              Verify Credential
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificationCard;