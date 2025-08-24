import Tab from '@/components/Tab';

import styles from '@/styles/Tabsbar.module.css';

const Tabsbar = () => {
  return (
    <div className={styles.tabs}>
      <Tab icon="/logos/terraform_icon.svg" filename="home.tf" path="/" />
      <Tab icon="/logos/html_icon.svg" filename="about.html" path="/about" />
      <Tab icon="/logos/yaml_icon.svg" filename="contact.yaml" path="/contact" />
      <Tab icon="/logos/go_icon.svg" filename="projects.go" path="/projects" />
      <Tab
        icon="/logos/json_icon.svg"
        filename="articles.json"
        path="/articles"
      />
      <Tab
        icon="/logos/json_icon.svg"
        filename="certifications.json"
        path="/certifications"
      />
      <Tab
        icon="/logos/markdown_icon.svg"
        filename="github.md"
        path="/github"
      />
    </div>
  );
};

export default Tabsbar;
