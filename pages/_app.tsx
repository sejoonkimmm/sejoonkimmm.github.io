import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { Inter, JetBrains_Mono, Instrument_Sans } from 'next/font/google';

import Layout from '@/components/Layout';
import Head from '@/components/Head';
import { SITE_URL } from '@/lib/site';

import '@/styles/tokens.css';
import '@/styles/globals.css';
import '@/styles/themes.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' });

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, []);

  const path = router.asPath.split(/[?#]/)[0];
  const url = path === '/' ? SITE_URL : `${SITE_URL}${path}`;

  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSans.variable}`}>
      <Head
        title={pageProps.title ? `Sejoon Kim | ${pageProps.title}` : 'Sejoon Kim'}
        description={pageProps.description}
        image={pageProps.ogImage}
        type={pageProps.ogType}
        url={url}
      />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </div>
  );
}

export default MyApp;
