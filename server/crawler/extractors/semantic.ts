import type { Page } from 'playwright';

export interface SemanticResult {
  headings: Array<{ level: number; text: string }>;
  semanticTags: Record<string, number>;
  images: { total: number; withAlt: number; altRatio: number };
  links: {
    internal: number;
    external: number;
    nofollow: number;
  };
}

export async function extractSemantic(page: Page, pageUrl: string): Promise<SemanticResult> {
  const hostname = new URL(pageUrl).hostname;

  return page.evaluate(`((hostname) => {
    const headings = [];
    for (let i = 1; i <= 6; i++) {
      document.querySelectorAll('h' + i).forEach(el => {
        headings.push({ level: i, text: (el.textContent || '').trim().slice(0, 200) });
      });
    }

    const semanticTagNames = ['nav', 'main', 'article', 'section', 'aside', 'footer', 'header'];
    const semanticTags = {};
    semanticTagNames.forEach(tag => {
      const count = document.querySelectorAll(tag).length;
      if (count > 0) semanticTags[tag] = count;
    });

    const images = document.querySelectorAll('img');
    const total = images.length;
    let withAlt = 0;
    images.forEach(img => { if (img.alt && img.alt.trim() !== '') withAlt++; });

    let internal = 0, external = 0, nofollow = 0;
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const rel = a.getAttribute('rel') || '';
      if (rel.includes('nofollow')) nofollow++;
      try {
        const linkUrl = new URL(href, window.location.href);
        if (linkUrl.hostname === hostname) internal++;
        else if (linkUrl.protocol.startsWith('http')) external++;
      } catch (e) {
        internal++;
      }
    });

    return {
      headings,
      semanticTags,
      images: { total, withAlt, altRatio: total > 0 ? Math.round((withAlt / total) * 100) / 100 : 1 },
      links: { internal, external, nofollow },
    };
  })("${hostname}")`);
}
