export interface RobotsRules {
  disallowPaths: string[];
  sitemapUrls: string[];
  rawContent: string;
}

export async function fetchRobotsTxt(domain: string): Promise<RobotsRules> {
  const url = `https://${domain}/robots.txt`;
  const result: RobotsRules = { disallowPaths: [], sitemapUrls: [], rawContent: '' };

  try {
    const response = await fetch(url);
    if (!response.ok) return result;

    const text = await response.text();
    result.rawContent = text;

    let isRelevantAgent = false;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim();
        isRelevantAgent = agent === '*' || agent.toLowerCase().includes('googlebot');
      } else if (isRelevantAgent && trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.split(':').slice(1).join(':').trim();
        if (path) result.disallowPaths.push(path);
      } else if (trimmed.toLowerCase().startsWith('sitemap:')) {
        const sitemapUrl = trimmed.split(':').slice(1).join(':').trim();
        if (sitemapUrl) result.sitemapUrls.push(sitemapUrl);
      }
    }
  } catch {
    // robots.txt not available — allow all
  }

  return result;
}

export function isPathAllowed(path: string, disallowPaths: string[]): boolean {
  return !disallowPaths.some((disallowed) => path.startsWith(disallowed));
}
