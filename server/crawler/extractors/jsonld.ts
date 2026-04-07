import type { Page } from 'playwright';

export interface JsonLdResult {
  jsonLd: Array<{
    type: string;
    raw: object;
  }>;
}

const JSONLD_SCRIPT = `(() => {
  const elements = document.querySelectorAll('script[type="application/ld+json"]');
  return Array.from(elements).map(el => el.textContent || '');
})()`;

export async function extractJsonLd(page: Page): Promise<JsonLdResult> {
  const scripts: string[] = await page.evaluate(JSONLD_SCRIPT);

  const jsonLd: JsonLdResult['jsonLd'] = [];

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        jsonLd.push({
          type: item['@type'] || 'Unknown',
          raw: item,
        });
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  }

  return { jsonLd };
}
