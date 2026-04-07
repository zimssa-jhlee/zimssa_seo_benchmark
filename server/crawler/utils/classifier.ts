export interface ClassificationRule {
  type: 'main' | 'list' | 'detail' | 'other';
  pattern: RegExp;
}

const DEFAULT_RULES: ClassificationRule[] = [
  { type: 'main', pattern: /^\/?$/ },
  { type: 'list', pattern: /\/(list|search|category|categories|archive|tag|tags|page|board|community|blog)(?:\/|$|\?)/ },
  { type: 'detail', pattern: /\/[\w-]+\/[\w-]+-\d+|\/\d+(?:\/|$)|\/(detail|view|item|post|article)\// },
];

export function classifyPageType(
  urlPath: string,
  customRules?: ClassificationRule[],
): 'main' | 'list' | 'detail' | 'other' {
  const rules = customRules ?? DEFAULT_RULES;

  for (const rule of rules) {
    if (rule.pattern.test(urlPath)) {
      return rule.type;
    }
  }

  // Heuristic: deep paths with ID-like segments are likely detail pages
  const segments = urlPath.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const lastSegment = segments[segments.length - 1];
    if (/^\d+$/.test(lastSegment) || /^[a-z0-9-]+-\d+$/.test(lastSegment)) {
      return 'detail';
    }
  }

  return 'other';
}
