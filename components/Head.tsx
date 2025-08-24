import Head from 'next/head';

interface CustomHeadProps {
  title: string;
}

const CustomHead = ({ title }: CustomHeadProps) => {
  return (
    <Head>
      <title>{title}</title>
      <meta
        name="description"
        content="Sejoon Kim is an experienced DevOps engineer building infrastructure and applications you'd love to use"
      />
      <meta
        name="keywords"
        content="sejoon kim, sejoon, kim, devops engineer portfolio, sejoon devops engineer, sejoon engineer, aws, kubernetes, sejoon kim portfolio, vscode-portfolio"
      />
      <meta property="og:title" content="Sejoon Kim's Portfolio" />
      <meta
        property="og:description"
        content="A DevOps engineer building infrastructure and applications that you'd like to use."
      />
      <meta property="og:image" content="https://imgur.com/4zi5KkQ.png" />
      <meta property="og:url" content="https://vscode-portfolio.vercel.app" />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  );
};

export default CustomHead;

CustomHead.defaultProps = {
  title: 'Sejoon Kim',
};
