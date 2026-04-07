import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import JsonLdViewer from '../components/JsonLdViewer';
import HeadingTree from '../components/HeadingTree';

export default function PageDetail() {
  const { sessionId, pageId } = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${sessionId}/pages/${pageId}`)
      .then(r => r.json())
      .then(data => { setPage(data); setLoading(false); });
  }, [sessionId, pageId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!page?.seo_data) return <div className="text-center py-12 text-gray-400">데이터가 없습니다.</div>;

  const { seo_data: data } = page;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to={`/report/${sessionId}`} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">&larr; 보고서</Link>
        <h1 className="text-lg font-bold text-gray-900 mt-1 break-all">{page.url}</h1>
        <div className="flex gap-3 mt-1">
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{page.page_type || '기타'}</span>
          <span className="text-xs text-gray-400">깊이 {page.depth}</span>
        </div>
      </div>

      {/* Score + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Big radial score */}
        <Card delay={0.1} className="flex items-center justify-center">
          <div className="text-center py-4">
            <RadialScore score={data.score || 0} />
            <h3 className="text-sm font-semibold text-gray-900 mt-3">SEO 설정 완성도</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">설정 항목의 구현 현황 수치</p>
          </div>
        </Card>

        {/* Breakdown bars */}
        <Card title="항목별 점수" className="lg:col-span-2" delay={0.15}>
          <div className="space-y-3">
            {(data.scoreBreakdown || []).map((item: any, i: number) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate">{ITEM_LABELS[item.name] || item.name}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.score / item.maxScore >= 0.8 ? '#22C55E' : item.score / item.maxScore >= 0.5 ? '#F59E0B' : '#EF4444' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.score / item.maxScore) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.04 }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 w-14 text-right">{item.score}/{item.maxScore}</span>
                <span className="text-[11px] text-gray-400 w-20 truncate">{item.details}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Metadata */}
      <Card title="기본 메타 태그" subtitle="검색엔진이 페이지를 이해하는 데 사용하는 핵심 태그" delay={0.2}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1">
          <MetaItem label="Title" value={data.metadata?.title?.content} badge={`${data.metadata?.title?.length}자`} />
          <MetaItem label="Description" value={data.metadata?.description?.content} badge={`${data.metadata?.description?.length}자`} />
          <MetaItem label="Canonical" value={data.metadata?.canonical} />
          <MetaItem label="Robots" value={data.metadata?.robots} />
          <MetaItem label="Viewport" value={data.metadata?.viewport} />
          <MetaItem label="Keywords" value={data.metadata?.keywords} />
        </div>
      </Card>

      {/* OG + Twitter side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card delay={0.23}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Open Graph</h4>
              <InfoTooltip text="페이스북, 카카오톡 등에 링크 공유 시 표시되는 제목, 설명, 이미지를 지정하는 태그입니다" />
            </div>
          </div>
          {data.metadata?.ogTags && Object.keys(data.metadata.ogTags).length > 0 ? (
            <div className="space-y-0.5">
              {Object.entries(data.metadata.ogTags).map(([k, v]) => (
                <MetaItem key={k} label={k.replace('og:', '')} value={v as string} />
              ))}
            </div>
          ) : <EmptyState text="Open Graph 태그가 설정되지 않았습니다" />}
        </Card>

        <Card delay={0.26}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-sky-500" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Twitter Card</h4>
              <InfoTooltip text="X(구 트위터)에 링크 공유 시 표시되는 카드 형태를 지정하는 태그입니다" />
            </div>
          </div>
          {data.metadata?.twitterTags && Object.keys(data.metadata.twitterTags).length > 0 ? (
            <div className="space-y-0.5">
              {Object.entries(data.metadata.twitterTags).map(([k, v]) => (
                <MetaItem key={k} label={k.replace('twitter:', '')} value={v as string} />
              ))}
            </div>
          ) : <EmptyState text="Twitter Card 태그가 설정되지 않았습니다" />}
        </Card>
      </div>

      {/* Verification tags */}
      {data.metadata?.verificationTags && Object.keys(data.metadata.verificationTags).length > 0 && (
        <Card delay={0.28}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">검색엔진 인증</h4>
              <InfoTooltip text="네이버, 구글 등 검색엔진에 사이트 소유권을 인증하는 태그입니다. Search Console 등록에 필요합니다." />
            </div>
          </div>
          <div className="space-y-0.5">
            {Object.entries(data.metadata.verificationTags).map(([k, v]) => (
              <MetaItem key={k} label={k} value={v as string} />
            ))}
          </div>
        </Card>
      )}

      {/* JSON-LD + Headings side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="구조화 데이터 (JSON-LD)" delay={0.25}>
          <JsonLdViewer data={data.structuredData?.jsonLd || []} />
        </Card>
        <Card title="Heading 구조" delay={0.3}>
          <HeadingTree headings={data.semantic?.headings || []} />
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="시맨틱 태그" items={
          ['nav', 'main', 'article', 'section', 'aside', 'footer', 'header']
            .map(tag => ({ name: `<${tag}>`, value: data.semantic?.semanticTags?.[tag] || 0 }))
            .filter(i => i.value > 0)
        } delay={0.35} />
        <StatCard label="링크" items={[
          { name: '내부', value: data.semantic?.links?.internal || 0 },
          { name: '외부', value: data.semantic?.links?.external || 0 },
          { name: 'nofollow', value: data.semantic?.links?.nofollow || 0 },
        ]} delay={0.38} />
        <StatCard label="이미지" items={[
          { name: '전체', value: data.semantic?.images?.total || 0 },
          { name: 'Alt 있음', value: data.semantic?.images?.withAlt || 0 },
          { name: 'Alt 비율', value: `${Math.round((data.semantic?.images?.altRatio || 0) * 100)}%` },
        ]} delay={0.41} />
        <StatCard label="콘텐츠" items={[
          { name: '이미지', value: data.content?.imageCount || 0 },
          { name: '비디오', value: data.content?.videoCount || 0 },
          { name: 'CTA', value: data.content?.ctaButtons?.length || 0 },
        ]} delay={0.44} />
      </div>

      {/* Keywords chart */}
      {data.keywords?.density?.length > 0 && (() => {
        const kwData = data.keywords.density.slice(0, 15);
        const chartHeight = Math.max(280, kwData.length * 32);
        return (
          <Card title="키워드 밀도" subtitle={`총 ${data.keywords.totalText?.chars?.toLocaleString()}자 · ${data.keywords.totalText?.words?.toLocaleString()}단어`} delay={0.47}>
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kwData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis dataKey="keyword" type="category" tick={{ fontSize: 12, fill: '#334155' }} width={90} />
                  <Tooltip formatter={(value: any) => [`${value}회`, '빈도']} />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 6, 6, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        );
      })()}

      {/* CTA buttons */}
      {data.content?.ctaButtons?.length > 0 && (
        <Card title="CTA 버튼 텍스트" delay={0.5}>
          <div className="flex flex-wrap gap-2">
            {data.content.ctaButtons.map((cta: string, i: number) => (
              <span key={i} className="text-sm px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg">{cta}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* =========== HELPERS =========== */
const ITEM_LABELS: Record<string, string> = {
  title: 'Title 태그', description: 'Meta Description', canonical: 'Canonical URL',
  ogTags: 'OG 태그', jsonLd: 'JSON-LD', h1: 'H1 태그',
  imageAlt: '이미지 Alt', semanticTags: '시맨틱 태그', robotsTxt: 'robots.txt', sitemap: 'sitemap.xml',
};

function RadialScore({ score }: { score: number }) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-[11px] text-gray-400">/100</span>
      </div>
    </div>
  );
}

function MetaItem({ label, value, badge }: { label: string; value?: string; badge?: string }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 break-all">{value || <span className="text-gray-300">-</span>}</p>
      </div>
      {badge && <span className="text-[11px] text-gray-400 flex-shrink-0">{badge}</span>}
    </div>
  );
}

function StatCard({ label, items, delay }: { label: string; items: Array<{ name: string; value: any }>; delay: number }) {
  return (
    <Card delay={delay}>
      <p className="text-xs font-semibold text-gray-500 mb-3">{label}</p>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <span className="text-gray-500 text-xs">{item.name}</span>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex ml-1">
      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-100 text-gray-400 rounded-full cursor-help hover:bg-gray-200 transition-colors">?</span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-[11px] leading-relaxed rounded-xl opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-normal w-56 text-center z-50 shadow-lg">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-4 px-3 bg-gray-50 rounded-xl">
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
      <span className="text-xs text-gray-400">{text}</span>
    </div>
  );
}
