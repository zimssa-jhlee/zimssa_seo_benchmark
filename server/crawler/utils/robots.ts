export interface RobotsRules {
  allowPaths: string[];
  disallowPaths: string[];
  sitemapUrls: string[];
  rawContent: string;
}

interface AgentRules {
  allow: string[];
  disallow: string[];
}

export async function fetchRobotsTxt(domain: string): Promise<RobotsRules> {
  const url = `https://${domain}/robots.txt`;
  const result: RobotsRules = { allowPaths: [], disallowPaths: [], sitemapUrls: [], rawContent: '' };

  try {
    const response = await fetch(url);
    if (!response.ok) return result;

    const text = await response.text();
    result.rawContent = text;

    // Parse per-agent rules
    const agentRules = new Map<string, AgentRules>();
    let currentAgents: string[] = [];
    let inRulesSection = false;

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const lower = trimmed.toLowerCase();

      if (lower.startsWith('user-agent:')) {
        const agent = trimmed.split(':').slice(1).join(':').trim().toLowerCase();
        if (inRulesSection) {
          // New agent group starts — reset
          currentAgents = [agent];
          inRulesSection = false;
        } else {
          // Still collecting agents for the same group
          currentAgents.push(agent);
        }
        // Ensure each agent has an entry
        for (const a of currentAgents) {
          if (!agentRules.has(a)) agentRules.set(a, { allow: [], disallow: [] });
        }
      } else if (lower.startsWith('allow:')) {
        inRulesSection = true;
        const path = trimmed.split(':').slice(1).join(':').trim();
        if (path) {
          for (const a of currentAgents) {
            agentRules.get(a)!.allow.push(path);
          }
        }
      } else if (lower.startsWith('disallow:')) {
        inRulesSection = true;
        const path = trimmed.split(':').slice(1).join(':').trim();
        if (path) {
          for (const a of currentAgents) {
            agentRules.get(a)!.disallow.push(path);
          }
        }
      } else if (lower.startsWith('sitemap:')) {
        const sitemapUrl = trimmed.split(':').slice(1).join(':').trim();
        if (sitemapUrl) result.sitemapUrls.push(sitemapUrl);
      }
    }

    // Priority: Googlebot rules > * rules
    const preferredAgents = ['googlebot', '*'];
    for (const agent of preferredAgents) {
      const rules = agentRules.get(agent);
      if (rules) {
        result.allowPaths = rules.allow;
        result.disallowPaths = rules.disallow;
        break;
      }
    }

  } catch {
    // robots.txt not available — allow all
  }

  return result;
}

export function isPathAllowed(path: string, rules: RobotsRules): boolean {
  // Find the most specific matching rule (longest path wins)
  let bestMatch = '';
  let allowed = true; // default: allowed

  for (const allowPath of rules.allowPaths) {
    if (path.startsWith(allowPath) && allowPath.length > bestMatch.length) {
      bestMatch = allowPath;
      allowed = true;
    }
  }

  for (const disallowPath of rules.disallowPaths) {
    if (path.startsWith(disallowPath) && disallowPath.length > bestMatch.length) {
      bestMatch = disallowPath;
      allowed = false;
    }
  }

  return allowed;
}
