import Head from 'next/head';

import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE } from '@/lib/site';

interface CustomHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const CustomHead = ({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  url = SITE_URL,
  type = 'website',
}: CustomHeadProps) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${SITE_NAME} — Blog`}
        href={`${SITE_URL}/feed.xml`}
      />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
};

export default CustomHead;
