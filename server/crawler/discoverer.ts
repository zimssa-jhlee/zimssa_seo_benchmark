import type { Page } from 'playwright';

export interface DiscoveredLink {
  url: string;
  text: string;
}

export async function discoverLinks(page: Page, currentUrl: string, domain: string): Promise<DiscoveredLink[]> {
  const links: Array<{ href: string; text: string }> = await page.evaluate(`((domain) => {
    const results = [];
    const seen = new Set();

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').trim().slice(0, 100);

      try {
        const url = new URL(href, window.location.href);
        if (url.hostname !== domain) return;
        if (!url.protocol.startsWith('http')) return;

        url.hash = '';
        const normalized = url.href.replace(/\\/$/, '');

        if (!seen.has(normalized)) {
          seen.add(normalized);
          results.push({ href: normalized, text: text });
        }
      } catch (e) {}
    });

    return results;
  })("${domain}")`);

  const skipExtensions = /\.(pdf|jpg|jpeg|png|gif|svg|webp|mp4|mp3|zip|css|js|xml|json)$/i;

  return links
    .filter((link) => !skipExtensions.test(new URL(link.href).pathname))
    .map((link) => ({ url: link.href, text: link.text }));
}
