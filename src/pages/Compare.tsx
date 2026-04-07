import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import Card from '../components/Card';

// 두 비교군의 대표 색상 — 확실히 구분되도록
const COLOR_A = { main: '#6366F1', bg: 'bg-indigo-50', text: 'text-indigo-600', fill: '#6366F1', light: '#EEF2FF' };
const COLOR_B = { main: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-600', fill: '#F59E0B', light: '#FFFBEB' };

export default function Compare() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [leftReport, setLeftReport] = useState<any>(null);
  const [rightReport, setRightReport] = useState<any>(null);

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(data => {
      setSessions(data.filter((s: any) => s.status === 'completed'));
    });
  }, []);

  const handleCompare = async () => {
    if (!leftId || !rightId) return;
    const [l, r] = await Promise.all([
      fetch(`/api/reports/${leftId}`).then(r => r.json()),
      fetch(`/api/reports/${rightId}`).then(r => r.json()),
    ]);
    setLeftReport(l);
    setRightReport(r);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">비교 분석</h1>
        <p className="text-sm text-gray-500 mt-1">두 도메인의 SEO 설정을 나란히 비교합니다</p>
      </div>

      {/* Selector */}
      <Card delay={0.1}>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_A.main }} />
              도메인 A
            </label>
            <select value={leftId} onChange={e => setLeftId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none">
              <option value="">선택하세요</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.domain} ({new Date(s.created_at).toLocaleDateString('ko-KR')})</option>)}
            </select>
          </div>
          <div className="flex-shrink-0 pb-2.5">
            <span className="text-gray-300 font-bold text-lg">vs</span>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_B.main }} />
              도메인 B
            </label>
            <select value={rightId} onChange={e => setRightId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-amber-500/20 outline-none">
              <option value="">선택하세요</option>
              {sessions.filter(s => s.id !== leftId).map(s => <option key={s.id} value={s.id}>{s.domain} ({new Date(s.created_at).toLocaleDateString('ko-KR')})</option>)}
            </select>
          </div>
          <button onClick={handleCompare} disabled={!leftId || !rightId}
            className="px-6 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm">
            비교하기
          </button>
        </div>
      </Card>

      {leftReport && rightReport && (
        <CompareResults left={leftReport} right={rightReport} />
      )}

      {!leftReport && sessions.length < 2 && (
        <div className="mt-12 text-center text-gray-400">
          <p className="text-sm">비교하려면 최소 2개의 크롤링 데이터가 필요합니다.</p>
        </div>
      )}
    </div>
  );
}

function CompareResults({ left, right }: { left: any; right: any }) {
  const ls = left.session.summary || {};
  const rs = right.session.summary || {};
  const lDomain = left.session.domain;
  const rDomain = right.session.domain;

  // Pages data for detailed comparison
  const lPages = left.pages?.filter((p: any) => p.status === 'success') || [];
  const rPages = right.pages?.filter((p: any) => p.status === 'success') || [];
  const lFirstPage = lPages[0]?.seo_data || {};
  const rFirstPage = rPages[0]?.seo_data || {};

  // Radar data
  const radarData = ['title', 'description', 'canonical', 'ogTags'].map(key => ({
    item: { title: 'Title', description: 'Description', canonical: 'Canonical', ogTags: 'OG Tags' }[key]!,
    [lDomain]: ls.metaCompleteness?.[key] ?? 0,
    [rDomain]: rs.metaCompleteness?.[key] ?? 0,
  }));

  // Score breakdown comparison
  const lBreakdown = lFirstPage.scoreBreakdown || [];
  const rBreakdown = rFirstPage.scoreBreakdown || [];
  const breakdownData = lBreakdown.map((item: any) => {
    const rItem = rBreakdown.find((r: any) => r.name === item.name);
    return {
      name: ITEM_LABELS[item.name] || item.name,
      [lDomain]: Math.round((item.score / item.maxScore) * 100),
      [rDomain]: rItem ? Math.round((rItem.score / rItem.maxScore) * 100) : 0,
    };
  });

  return (
    <div className="mt-6 space-y-6">
      {/* Score cards */}
      <div className="grid grid-cols-2 gap-6">
        <ScoreCard domain={lDomain} score={ls.avgScore || 0} pages={left.session.crawled_pages}
          color={COLOR_A.main} delay={0.15} seoData={lFirstPage} />
        <ScoreCard domain={rDomain} score={rs.avgScore || 0} pages={right.session.crawled_pages}
          color={COLOR_B.main} delay={0.2} seoData={rFirstPage} />
      </div>

      {/* Score breakdown bar chart — side by side comparison */}
      {breakdownData.length > 0 && (
        <Card title="항목별 달성률 비교" subtitle="각 SEO 설정 항목의 달성률(%)을 비교합니다" delay={0.25}>
          <div style={{ height: Math.max(300, breakdownData.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} layout="vertical" margin={{ left: 20, right: 20 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#334155' }} width={100} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Bar dataKey={lDomain} fill={COLOR_A.main} radius={[0, 4, 4, 0]} maxBarSize={14} />
                <Bar dataKey={rDomain} fill={COLOR_B.main} radius={[0, 4, 4, 0]} maxBarSize={14} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Radar chart */}
      <Card title="메타데이터 완성도 비교" subtitle="전체 페이지 기준 메타 태그 설정 비율(%)" delay={0.3}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="item" tick={{ fontSize: 12, fill: '#64748B' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Radar dataKey={lDomain} stroke={COLOR_A.main} fill={COLOR_A.main} fillOpacity={0.15} strokeWidth={2} />
              <Radar dataKey={rDomain} stroke={COLOR_B.main} fill={COLOR_B.main} fillOpacity={0.12} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* JSON-LD — separate cards per domain */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JsonLdCard domain={lDomain} types={ls.jsonLdTypes || {}} pages={lPages} color={COLOR_A} delay={0.35} />
        <JsonLdCard domain={rDomain} types={rs.jsonLdTypes || {}} pages={rPages} color={COLOR_B} delay={0.38} />
      </div>

      {/* Meta detail comparison table */}
      <Card title="메타 태그 상세 비교" subtitle="대표 페이지의 핵심 메타 태그 내용을 비교합니다" delay={0.4}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-400 w-28">항목</th>
                <th className="py-2.5 px-4 text-left text-xs font-semibold" style={{ color: COLOR_A.main }}>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_A.main }} />{lDomain}</span>
                </th>
                <th className="py-2.5 px-4 text-left text-xs font-semibold" style={{ color: COLOR_B.main }}>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_B.main }} />{rDomain}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <MetaCompareRow label="Title" left={lFirstPage.metadata?.title?.content} right={rFirstPage.metadata?.title?.content} />
              <MetaCompareRow label="Description" left={lFirstPage.metadata?.description?.content} right={rFirstPage.metadata?.description?.content} />
              <MetaCompareRow label="Canonical" left={lFirstPage.metadata?.canonical} right={rFirstPage.metadata?.canonical} />
              <MetaCompareRow label="H1" left={lFirstPage.semantic?.headings?.find((h: any) => h.level === 1)?.text} right={rFirstPage.semantic?.headings?.find((h: any) => h.level === 1)?.text} />
              <MetaCompareRow label="렌더링" left={lFirstPage.technical?.renderingType} right={rFirstPage.technical?.renderingType} />
              <MetaCompareRow label="Sitemap" left={lFirstPage.technical?.sitemapExists ? `있음 (${lFirstPage.technical.sitemapUrlCount} URLs)` : '없음'} right={rFirstPage.technical?.sitemapExists ? `있음 (${rFirstPage.technical.sitemapUrlCount} URLs)` : '없음'} />
              <MetaCompareRow label="내부 링크" left={lFirstPage.semantic?.links?.internal} right={rFirstPage.semantic?.links?.internal} />
              <MetaCompareRow label="외부 링크" left={lFirstPage.semantic?.links?.external} right={rFirstPage.semantic?.links?.external} />
              <MetaCompareRow label="이미지 Alt" left={lFirstPage.semantic?.images?.total ? `${Math.round(lFirstPage.semantic.images.altRatio * 100)}%` : '-'} right={rFirstPage.semantic?.images?.total ? `${Math.round(rFirstPage.semantic.images.altRatio * 100)}%` : '-'} />
            </tbody>
          </table>
        </div>
      </Card>

      {/* Keywords comparison */}
      <Card title="키워드 전략 비교" subtitle="각 도메인에서 추출된 주요 키워드" delay={0.45}>
        <div className="grid grid-cols-2 gap-8">
          <KeywordColumn domain={lDomain} keywords={ls.topKeywords || []} color={COLOR_A} />
          <KeywordColumn domain={rDomain} keywords={rs.topKeywords || []} color={COLOR_B} />
        </div>
        {/* Common keywords */}
        {(() => {
          const lSet = new Set((ls.topKeywords || []).map((k: any) => k.keyword));
          const common = (rs.topKeywords || []).filter((k: any) => lSet.has(k.keyword));
          if (common.length === 0) return null;
          return (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2">공통 키워드</p>
              <div className="flex flex-wrap gap-1.5">
                {common.map((kw: any, i: number) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-medium">{kw.keyword}</span>
                ))}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Page stats comparison */}
      <div className="grid grid-cols-2 gap-6">
        <StatsCard domain={lDomain} seoData={lFirstPage} pages={lPages} color={COLOR_A} delay={0.5} />
        <StatsCard domain={rDomain} seoData={rFirstPage} pages={rPages} color={COLOR_B} delay={0.53} />
      </div>
    </div>
  );
}

/* =========== SUB COMPONENTS =========== */

function ScoreCard({ domain, score, pages, color, delay, seoData }: {
  domain: string; score: number; pages: number; color: string; delay: number; seoData: any;
}) {
  const r = 42;
  const circ = r * 2 * Math.PI;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-sm font-semibold text-gray-900">{domain}</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Score ring */}
        <div className="relative flex-shrink-0" style={{ width: 90, height: 90 }}>
          <svg width={90} height={90} className="-rotate-90">
            <circle cx={45} cy={45} r={r} fill="none" stroke="#F1F5F9" strokeWidth={6} />
            <motion.circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={6}
              strokeLinecap="round" strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - score / 100) }}
              transition={{ duration: 1, ease: 'easeOut', delay: delay + 0.2 }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">{score}</span>
        </div>

        {/* Quick stats */}
        <div className="flex-1 space-y-2">
          <QuickStat label="페이지 수" value={pages} />
          <QuickStat label="JSON-LD" value={seoData.structuredData?.jsonLd?.length || 0} suffix="개" />
          <QuickStat label="내부 링크" value={seoData.semantic?.links?.internal || 0} />
          <QuickStat label="이미지" value={seoData.semantic?.images?.total || 0} />
        </div>
      </div>
    </motion.div>
  );
}

function QuickStat({ label, value, suffix = '' }: { label: string; value: any; suffix?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-gray-700">{value}{suffix}</span>
    </div>
  );
}

function JsonLdCard({ domain, types, pages, color, delay }: {
  domain: string; types: Record<string, number>; pages: any[]; color: typeof COLOR_A; delay: number;
}) {
  const entries = Object.entries(types);
  const chartData = entries.map(([name, count]) => ({ name, count: count as number }));

  return (
    <Card delay={delay}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.main }} />
        <h4 className="text-sm font-semibold text-gray-900">{domain}</h4>
        <span className="text-[11px] text-gray-400 ml-auto">{entries.length}개 타입</span>
      </div>

      {entries.length > 0 ? (
        <>
          <div className="h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                      <p className="font-semibold">{payload[0].payload.name}</p>
                      <p className="text-gray-300">{payload[0].value}개 페이지에서 사용</p>
                    </div>
                  );
                }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {chartData.map((_, i) => <Cell key={i} fill={color.main} fillOpacity={0.7 + (i * 0.05)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Type tags */}
          <div className="flex flex-wrap gap-1.5">
            {entries.map(([type, count]) => (
              <span key={type} className={`text-[11px] px-2 py-1 rounded-lg font-mono ${color.bg} ${color.text}`}>
                {type} <span className="opacity-60">({count as number})</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">JSON-LD 데이터 없음</div>
      )}
    </Card>
  );
}

function MetaCompareRow({ label, left, right }: { label: string; left?: any; right?: any }) {
  return (
    <tr>
      <td className="py-2.5 pr-4 text-xs text-gray-400 whitespace-nowrap">{label}</td>
      <td className="py-2.5 px-4 text-xs text-gray-800 break-all max-w-xs">{left || <span className="text-gray-300">-</span>}</td>
      <td className="py-2.5 px-4 text-xs text-gray-800 break-all max-w-xs">{right || <span className="text-gray-300">-</span>}</td>
    </tr>
  );
}

function KeywordColumn({ domain, keywords, color }: { domain: string; keywords: any[]; color: typeof COLOR_A }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.main }} />
        {domain}
      </p>
      {keywords.length > 0 ? (
        <div className="space-y-1.5">
          {keywords.map((kw: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 w-4">{i + 1}</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${color.bg} ${color.text}`}>{kw.keyword}</span>
              <span className="text-[11px] text-gray-400 ml-auto">{kw.count}회</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">키워드 데이터 없음</p>
      )}
    </div>
  );
}

function StatsCard({ domain, seoData, pages, color, delay }: {
  domain: string; seoData: any; pages: any[]; color: typeof COLOR_A; delay: number;
}) {
  const semantic = seoData.semantic || {};
  const content = seoData.content || {};
  const technical = seoData.technical || {};

  const stats = [
    { label: '시맨틱 태그', value: Object.keys(semantic.semanticTags || {}).length, suffix: '종류' },
    { label: '내부 링크', value: semantic.links?.internal || 0 },
    { label: '외부 링크', value: semantic.links?.external || 0 },
    { label: 'nofollow', value: semantic.links?.nofollow || 0 },
    { label: '이미지', value: semantic.images?.total || 0 },
    { label: '이미지 Alt', value: semantic.images?.total ? `${Math.round(semantic.images.altRatio * 100)}%` : '-' },
    { label: 'CTA 버튼', value: content.ctaButtons?.length || 0 },
    { label: '렌더링', value: technical.renderingType || '-' },
  ];

  return (
    <Card delay={delay}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.main }} />
        <h4 className="text-sm font-semibold text-gray-900">{domain}</h4>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {stats.map(s => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">{s.label}</span>
            <span className="text-xs font-semibold text-gray-700">{s.value}{s.suffix || ''}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* =========== CONSTANTS =========== */
const ITEM_LABELS: Record<string, string> = {
  title: 'Title', description: 'Description', canonical: 'Canonical',
  ogTags: 'OG 태그', jsonLd: 'JSON-LD', h1: 'H1 태그',
  imageAlt: '이미지 Alt', semanticTags: '시맨틱', robotsTxt: 'robots.txt', sitemap: 'sitemap',
};
