interface ScoreCardProps {
  score: number;
  breakdown?: Array<{
    name: string;
    score: number;
    maxScore: number;
    details: string;
  }>;
}

const ITEM_LABELS: Record<string, { label: string; tooltip: string }> = {
  title: { label: 'Title 태그', tooltip: '페이지 제목 태그의 존재 여부와 적절한 길이(10-60자)' },
  description: { label: 'Meta Description', tooltip: '메타 설명의 존재 여부와 적절한 길이(50-160자)' },
  canonical: { label: 'Canonical URL', tooltip: '정규 URL 설정으로 중복 콘텐츠 방지' },
  ogTags: { label: 'OG 태그', tooltip: 'SNS 공유 시 표시되는 Open Graph 메타데이터' },
  jsonLd: { label: 'JSON-LD', tooltip: '검색엔진이 이해하는 구조화된 데이터' },
  h1: { label: 'H1 태그', tooltip: '페이지당 하나의 H1 태그 사용 권장' },
  imageAlt: { label: '이미지 Alt', tooltip: '이미지에 대체 텍스트(alt) 속성 제공 비율' },
  semanticTags: { label: '시맨틱 태그', tooltip: 'nav, main, article 등 의미론적 HTML 태그 사용' },
  robotsTxt: { label: 'robots.txt', tooltip: '검색엔진 크롤러에게 규칙을 알려주는 파일' },
  sitemap: { label: 'sitemap.xml', tooltip: '사이트 페이지 구조를 검색엔진에 알려주는 파일' },
};

export default function ScoreCard({ score, breakdown }: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBarColor = (s: number, max: number) => {
    const ratio = s / max;
    if (ratio >= 0.8) return 'bg-green-500';
    if (ratio >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">SEO 설정 완성도</h3>
          <p className="text-xs text-gray-500 mt-1">이 지표는 SEO 설정 항목의 구현 현황을 수치화한 것입니다</p>
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
          {score}<span className="text-lg text-gray-400">/100</span>
        </div>
      </div>

      {breakdown && (
        <div className="mt-6 space-y-3">
          {breakdown.map((item) => {
            const meta = ITEM_LABELS[item.name] || { label: item.name, tooltip: '' };
            return (
              <div key={item.name} className="group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 flex items-center gap-1">
                    {meta.label}
                    {meta.tooltip && (
                      <span className="relative">
                        <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-200 text-gray-500 rounded-full cursor-help">?</span>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {meta.tooltip}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500">{item.score}/{item.maxScore} — {item.details}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getBarColor(item.score, item.maxScore)}`}
                    style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
