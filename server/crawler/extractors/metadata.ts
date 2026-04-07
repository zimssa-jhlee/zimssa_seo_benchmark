import type { Page } from 'playwright';

export interface MetadataResult {
  title: { content: string; length: number };
  description: { content: string; length: number };
  keywords: string;
  canonical: string;
  robots: string;
  googlebot: string;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  verificationTags: Record<string, string>;
  hreflang: Array<{ lang: string; href: string }>;
  viewport: string;
}

const METADATA_SCRIPT = `(() => {
  const getMeta = (name) => {
    const el = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
    return el ? (el.getAttribute('content') || '') : '';
  };

  const title = document.title || '';
  const description = getMeta('description');

  const ogTags = {};
  document.querySelectorAll('meta[property^="og:"]').forEach(el => {
    ogTags[el.getAttribute('property') || ''] = el.getAttribute('content') || '';
  });

  const twitterTags = {};
  document.querySelectorAll('meta[name^="twitter:"], meta[property^="twitter:"]').forEach(el => {
    twitterTags[el.getAttribute('name') || el.getAttribute('property') || ''] = el.getAttribute('content') || '';
  });

  const verificationTags = {};
  ['naver-site-verification', 'google-site-verification', 'msvalidate.01', 'yandex-verification'].forEach(name => {
    const val = getMeta(name);
    if (val) verificationTags[name] = val;
  });

  const hreflang = [];
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => {
    hreflang.push({ lang: el.getAttribute('hreflang') || '', href: el.getAttribute('href') || '' });
  });

  const canonicalEl = document.querySelector('link[rel="canonical"]');
  const canonical = canonicalEl ? (canonicalEl.getAttribute('href') || '') : '';
  const viewport = getMeta('viewport');

  return {
    title: { content: title, length: title.length },
    description: { content: description, length: description.length },
    keywords: getMeta('keywords'),
    canonical,
    robots: getMeta('robots'),
    googlebot: getMeta('googlebot'),
    ogTags,
    twitterTags,
    verificationTags,
    hreflang,
    viewport,
  };
})()`;

export async function extractMetadata(page: Page): Promise<MetadataResult> {
  return page.evaluate(METADATA_SCRIPT);
}
