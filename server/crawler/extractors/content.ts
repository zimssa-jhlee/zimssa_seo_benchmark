import type { Page } from 'playwright';

export interface ContentResult {
  imageCount: number;
  videoCount: number;
  ctaButtons: string[];
  internalLinkTargets: Array<{ url: string; text: string }>;
}

export async function extractContent(page: Page, pageUrl: string): Promise<ContentResult> {
  const hostname = new URL(pageUrl).hostname;

  return page.evaluate(`((hostname) => {
    const imageCount = document.querySelectorAll('img').length;
    const videoCount = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

    const ctaPatterns = /문의|상담|신청|견적|예약|시작|가입|구매|주문|다운로드|체험|무료|지금|바로/;
    const ctaButtons = [];
    var seenCta = new Set();
    document.querySelectorAll('button, a[role="button"], [class*="btn"], [class*="cta"]').forEach(el => {
      var clone = el.cloneNode(true);
      clone.querySelectorAll('img, svg, picture, source').forEach(function(c) { c.remove(); });
      var text = (clone.textContent || '').replace(/\\s+/g, ' ').trim();
      if (text && text.length >= 2 && text.length <= 30 && ctaPatterns.test(text) && !seenCta.has(text)) {
        seenCta.add(text);
        ctaButtons.push(text);
      }
    });

    const internalLinkTargets = [];
    const seenUrls = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').trim().slice(0, 100);
      try {
        const linkUrl = new URL(href, window.location.href);
        if (linkUrl.hostname === hostname && !seenUrls.has(linkUrl.pathname)) {
          seenUrls.add(linkUrl.pathname);
          internalLinkTargets.push({ url: linkUrl.pathname, text: text });
        }
      } catch (e) {}
    });

    return { imageCount, videoCount, ctaButtons, internalLinkTargets: internalLinkTargets.slice(0, 50) };
  })("${hostname}")`);
}
