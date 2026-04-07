import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from 'recharts';
import KpiCard from '../components/KpiCard';
import Card from '../components/Card';

type TabId = 'summary' | 'pages' | 'keywords' | 'technical';

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6'];

export default function Report() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  useEffect(() => {
    fetch(`/api/reports/${sessionId}`)
      .then(r => r.json())
      .then(data => { setReport(data); setLoading(false); });
  }, [sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!report) return <div className="text-center py-12 text-gray-400">보고서를 찾을 수 없습니다.</div>;

  const { session, pages } = report;
  const summary = session.summary || {};
  const successPages = pages.filter((p: any) => p.status === 'success');

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'summary', label: '요약' },
    { id: 'pages', label: `페이지 (${pages.length})` },
    { id: 'keywords', label: '키워드' },
    { id: 'technical', label: '기술 분석' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/" className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">&larr; 대시보드</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{session.domain}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{session.url} · {new Date(session.created_at).toLocaleString('ko-KR')} · {session.crawled_pages}페이지</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && <SummaryTab summary={summary} pages={successPages} />}
      {activeTab === 'pages' && <PagesTab pages={pages} sessionId={sessionId!} />}
      {activeTab === 'keywords' && <KeywordsTab summary={summary} pages={successPages} />}
      {activeTab === 'technical' && <TechnicalTab pages={successPages} />}
    </div>
  );
}

/* =========== SUMMARY TAB =========== */
function SummaryTab({ summary, pages }: { summary: any; pages: any[] }) {
  const jsonLdCount = Object.values(summary.jsonLdTypes || {}).reduce((a: number, b: any) => a + b, 0) as number;
  const targetKwCount = summary.topKeywords?.length || 0;
  const jsonLdRate = pages.length > 0
    ? Math.round(pages.filter((p: any) => p.seo_data?.structuredData?.jsonLd?.length > 0).length / pages.length * 100)
    : 0;

  // Score distribution data
  const scoreDistribution = pages.map((p: any) => ({
    url: new URL(p.url).pathname.slice(0, 30) || '/',
    score: p.seo_data?.score || 0,
  })).sort((a: any, b: any) => b.score - a.score).slice(0, 15);

  // Page type distribution for donut
  const pageTypePie = Object.entries(summary.pageTypeDistribution || {}).map(([name, value]) => ({
    name: { main: '메인', list: '목록', detail: '상세', other: '기타' }[name] || name,
    value: value as number,
  }));

  // Meta completeness for radar
  const radarData = summary.metaCompleteness ? [
    { item: 'Title', value: summary.metaCompleteness.title },
    { item: 'Description', value: summary.metaCompleteness.description },
    { item: 'Canonical', value: summary.metaCompleteness.canonical },
    { item: 'OG Tags', value: summary.metaCompleteness.ogTags },
  ] : [];

  // Score breakdown aggregated across pages
  const avgBreakdown = getAverageBreakdown(pages);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="SEO 설정 완성도" value={summary.avgScore || 0} sub="평균 점수 / 100" color="indigo" delay={0}
          tooltip="SEO 설정 항목의 구현 현황을 수치화한 지표입니다"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <KpiCard label="분석 페이지" value={pages.length} sub="성공적으로 크롤링됨" color="emerald" delay={0.05}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <KpiCard label="타겟 키워드" value={targetKwCount} sub="추론된 핵심 키워드" color="amber" delay={0.1}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
        <KpiCard label="JSON-LD 적용률" value={`${jsonLdRate}%`} sub={`${jsonLdCount}개 블록 발견`} color="rose" delay={0.15}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
      </div>

      {/* Charts row 1: Score distribution + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="페이지별 SEO 점수" subtitle="상위 15개 페이지" className="lg:col-span-2" delay={0.2}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution} margin={{ left: -10, right: 10, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="url" tick={{ fontSize: 11, fill: '#94A3B8' }} angle={-30} textAnchor="end" height={70} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {scoreDistribution.map((_: any, i: number) => (
                    <Cell key={i} fill={scoreDistribution[i].score >= 80 ? '#22C55E' : scoreDistribution[i].score >= 50 ? '#F59E0B' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="페이지 유형 분포" delay={0.25}>
          <div className="h-72 flex items-center justify-center">
            {pageTypePie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pageTypePie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {pageTypePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400">데이터 없음</p>}
          </div>
          <div className="flex flex-wrap gap-3 justify-center -mt-2">
            {pageTypePie.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts row 2: Radar + Score breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="메타데이터 완성도" subtitle="전체 페이지 기준 비율" delay={0.3}>
          <div className="h-64">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="item" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Radar dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400">데이터 없음</p>}
          </div>
        </Card>

        <Card title="항목별 평균 점수" subtitle="SEO 설정 완성도 세부 항목" delay={0.35}>
          <div className="space-y-3 pt-2">
            {avgBreakdown.map((item: any) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate">{ITEM_LABELS[item.name] || item.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.ratio >= 0.8 ? '#22C55E' : item.ratio >= 0.5 ? '#F59E0B' : '#EF4444' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.ratio * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 w-14 text-right">{item.avg}/{item.max}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* JSON-LD types + Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summary.jsonLdTypes && Object.keys(summary.jsonLdTypes).length > 0 && (
          <Card title="JSON-LD 사용 현황" delay={0.4}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(summary.jsonLdTypes).map(([name, value]) => ({ name, count: value }))} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[0, 6, 6, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {summary.topKeywords?.length > 0 && (
          <Card title="주요 키워드 TOP 10" delay={0.45}>
            <div className="flex flex-wrap gap-2 pt-1">
              {summary.topKeywords.map((kw: any, i: number) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.03 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium"
                >
                  {kw.keyword}
                  <span className="text-[11px] text-indigo-400">({kw.count})</span>
                </motion.span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* =========== PAGES TAB =========== */
function PagesTab({ pages, sessionId }: { pages: any[]; sessionId: string }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'url'>('score');
  const navigate = useNavigate();

  let filtered = filter === 'all' ? pages : pages.filter(p => p.page_type === filter);
  if (sortBy === 'score') {
    filtered = [...filtered].sort((a, b) => (b.seo_data?.score || 0) - (a.seo_data?.score || 0));
  }

  const filters = ['all', 'main', 'list', 'detail', 'other'];
  const labels: Record<string, string> = { all: '전체', main: '메인', list: '목록', detail: '상세', other: '기타' };

  return (
    <Card noPadding delay={0.1}>
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {labels[f]}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500"
        >
          <option value="score">점수순</option>
          <option value="url">URL순</option>
        </select>
      </div>
      <div className="divide-y divide-gray-50">
        {filtered.map((page: any, i: number) => {
          const score = page.seo_data?.score;
          return (
            <motion.div
              key={page.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => navigate(`/report/${sessionId}/page/${page.id}`)}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 cursor-pointer transition-colors"
            >
              {/* Score indicator */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                score >= 80 ? 'bg-emerald-50 text-emerald-600' :
                score >= 50 ? 'bg-amber-50 text-amber-600' :
                score != null ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'
              }`}>
                {score ?? '-'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{page.url}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {page.page_type || '기타'} · 깊이 {page.depth}
                  {page.seo_data?.keywords?.targetKeywords?.length > 0 &&
                    ` · ${page.seo_data.keywords.targetKeywords.slice(0, 3).join(', ')}`}
                </p>
              </div>

              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                page.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}>
                {page.status}
              </span>

              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

/* =========== KEYWORDS TAB =========== */
function KeywordsTab({ summary, pages }: { summary: any; pages: any[] }) {
  const allKeywords = new Map<string, { count: number; inTitle: number; inDesc: number; inH1: number }>();
  for (const page of pages) {
    for (const kw of (page.seo_data?.keywords?.density || [])) {
      const ex = allKeywords.get(kw.keyword) || { count: 0, inTitle: 0, inDesc: 0, inH1: 0 };
      ex.count += kw.count;
      if (kw.inTitle) ex.inTitle++;
      if (kw.inDescription) ex.inDesc++;
      if (kw.inH1) ex.inH1++;
      allKeywords.set(kw.keyword, ex);
    }
  }
  const sorted = [...allKeywords.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20);
  const chartData = sorted.map(([keyword, data]) => ({ keyword, count: data.count }));

  return (
    <div className="space-y-6">
      {summary.topKeywords?.length > 0 && (
        <Card title="추정 타겟 키워드" subtitle="title, description, h1, og:title에서 공통 등장하는 핵심 키워드" delay={0.1}>
          <div className="flex flex-wrap gap-2">
            {summary.topKeywords.map((kw: any, i: number) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold"
              >
                {kw.keyword}
              </motion.span>
            ))}
          </div>
        </Card>
      )}

      <Card title="키워드 빈도 분포" subtitle="전체 페이지 합산 기준 상위 20개" delay={0.2}>
        <div style={{ height: Math.max(320, chartData.length * 32) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis dataKey="keyword" type="category" tick={{ fontSize: 12, fill: '#334155' }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#6366F1" radius={[0, 6, 6, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="키워드 상세" delay={0.3}>
        <div className="space-y-2.5">
          {sorted.map(([keyword, data], i) => (
            <div key={keyword} className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400 w-5">{i + 1}</span>
              <span className="text-sm font-medium text-gray-800 w-24 truncate">{keyword}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-indigo-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.count / sorted[0][1].count) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.02 }}
                />
              </div>
              <span className="text-xs text-gray-500 w-12 text-right">{data.count}회</span>
              <div className="flex gap-1">
                {data.inTitle > 0 && <Badge label="T" color="emerald" />}
                {data.inDesc > 0 && <Badge label="D" color="amber" />}
                {data.inH1 > 0 && <Badge label="H1" color="violet" />}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3 text-[11px] text-gray-400">
          <span><Badge label="T" color="emerald" /> Title</span>
          <span><Badge label="D" color="amber" /> Description</span>
          <span><Badge label="H1" color="violet" /> H1 태그</span>
        </div>
      </Card>
    </div>
  );
}

/* =========== TECHNICAL TAB =========== */
function TechnicalTab({ pages }: { pages: any[] }) {
  if (pages.length === 0) return <p className="text-gray-400">데이터가 없습니다.</p>;
  const technical = pages[0].seo_data?.technical;

  // Score trend across pages
  const scoreTrend = pages.map((p: any, i: number) => ({
    index: i + 1,
    score: p.seo_data?.score || 0,
    url: new URL(p.url).pathname.slice(0, 25),
  }));

  return (
    <div className="space-y-6">
      {/* Score trend */}
      <Card title="페이지별 점수 추이" subtitle="크롤링 순서대로" delay={0.1}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scoreTrend} margin={{ top: 5, right: 10, left: -10 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#6366F1" fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rendering */}
        <Card title="렌더링 방식" delay={0.2}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              technical?.renderingType === 'SSR' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {technical?.renderingType || 'unknown'}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            {technical?.renderingType === 'SSR' && '서버 사이드 렌더링 — 초기 HTML에 콘텐츠가 포함되어 검색엔진 크롤링에 유리합니다.'}
            {technical?.renderingType === 'CSR' && '클라이언트 사이드 렌더링 — JS 실행 후 콘텐츠 로드. 검색엔진 인식이 제한될 수 있습니다.'}
            {(!technical?.renderingType || technical?.renderingType === 'unknown') && '렌더링 방식을 판별할 수 없습니다.'}
          </p>
        </Card>

        {/* Sitemap */}
        <Card title="Sitemap" delay={0.25}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              technical?.sitemapExists ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'
            }`}>
              {technical?.sitemapExists ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">{technical?.sitemapExists ? '존재함' : '없음'}</p>
              {technical?.sitemapExists && <p className="text-xs text-gray-400">{technical.sitemapUrlCount}개 URL</p>}
            </div>
          </div>
        </Card>

        {/* HTTP Headers */}
        <Card title="SEO 헤더" delay={0.3}>
          {technical?.httpHeaders && Object.keys(technical.httpHeaders).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(technical.httpHeaders).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 text-xs">
                  <span className="font-mono text-gray-500 flex-shrink-0">{k}</span>
                  <span className="text-gray-800 break-all">{v as string}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">관련 헤더 없음</p>}
        </Card>
      </div>

      {/* robots.txt */}
      {technical?.robotsTxt && (
        <Card title="robots.txt" delay={0.35}>
          <pre className="bg-gray-50 p-4 rounded-xl text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-64">{technical.robotsTxt}</pre>
        </Card>
      )}

      {/* JSON-LD per page */}
      <Card title="페이지별 JSON-LD 현황" noPadding delay={0.4}>
        <div className="px-6 py-4">
          <div className="divide-y divide-gray-50">
            {pages.slice(0, 30).map((page: any) => (
              <div key={page.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xs text-gray-500 truncate flex-1">{new URL(page.url).pathname}</span>
                <div className="flex gap-1">
                  {page.seo_data?.structuredData?.jsonLd?.length > 0
                    ? page.seo_data.structuredData.jsonLd.map((ld: any, i: number) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md font-mono">{ld.type}</span>
                    ))
                    : <span className="text-[11px] text-gray-300">없음</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* =========== HELPERS =========== */
const ITEM_LABELS: Record<string, string> = {
  title: 'Title 태그', description: 'Meta Description', canonical: 'Canonical URL',
  ogTags: 'OG 태그', jsonLd: 'JSON-LD', h1: 'H1 태그',
  imageAlt: '이미지 Alt', semanticTags: '시맨틱 태그', robotsTxt: 'robots.txt', sitemap: 'sitemap.xml',
};

function Badge({ label, color }: { label: string; color: string }) {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return <span className={`text-[10px] px-1 py-0.5 rounded font-semibold ${styles[color]}`}>{label}</span>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-gray-300">{entry.name}: <span className="text-white font-semibold">{entry.value}</span></p>
      ))}
    </div>
  );
}

function getAverageBreakdown(pages: any[]): any[] {
  const sums = new Map<string, { total: number; max: number; count: number }>();
  for (const page of pages) {
    for (const item of (page.seo_data?.scoreBreakdown || [])) {
      const s = sums.get(item.name) || { total: 0, max: item.maxScore, count: 0 };
      s.total += item.score;
      s.count++;
      sums.set(item.name, s);
    }
  }
  return [...sums.entries()].map(([name, { total, max, count }]) => ({
    name,
    avg: Math.round(total / count * 10) / 10,
    max,
    ratio: total / (count * max),
  }));
}
