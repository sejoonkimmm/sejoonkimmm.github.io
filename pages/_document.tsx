import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  // Apply the saved theme before first paint so the page does not flash
  // the default theme and then swap. Runs synchronously, before React mounts.
  const setThemeScript = `(function(){try{var t=localStorage.getItem('theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

  return (
    <Html lang="en">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: setThemeScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
