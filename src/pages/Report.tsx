import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Card from "../components/Card";
import HeadingTree from "../components/HeadingTree";
import JsonLdViewer from "../components/JsonLdViewer";
import KpiCard from "../components/KpiCard";
import { motion } from "framer-motion";

const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#14B8A6",
];

export default function Report() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setReport(data);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!report)
    return (
      <div className="text-center py-12 text-gray-400">
        보고서를 찾을 수 없습니다.
      </div>
    );

  const { session, pages } = report;
  const successPages = pages.filter((p: any) => p.status === "success");
  const isSinglePage = successPages.length === 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
          >
            &larr; 대시보드
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {session.domain}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {session.url} ·{" "}
            {new Date(session.created_at).toLocaleString("ko-KR")}
            {!isSinglePage && ` · ${session.crawled_pages}페이지`}
          </p>
        </div>
      </div>

      {isSinglePage ? (
        <SinglePageReport page={successPages[0]} session={session} />
      ) : (
        <MultiPageReport
          session={session}
          pages={pages}
          successPages={successPages}
          sessionId={sessionId!}
        />
      )}
    </div>
  );
}

/* =========================================================
   SINGLE PAGE REPORT — 단일 페이지 크롤링 기본 뷰
   ========================================================= */
function SinglePageReport({ page, session }: { page: any; session: any }) {
  const data = page.seo_data || {};
  const score = data.score || 0;
  const jsonLdCount = data.structuredData?.jsonLd?.length || 0;
  const targetKws = data.keywords?.targetKeywords || [];
  const altRatio =
    data.semantic?.images?.total > 0
      ? Math.round(data.semantic.images.altRatio * 100)
      : 100;

  // Radar data from score breakdown
  const radarData = (data.scoreBreakdown || []).map((item: any) => ({
    item: ITEM_LABELS[item.name] || item.name,
    value: Math.round((item.score / item.maxScore) * 100),
    fullMark: 100,
  }));

  // Keyword chart
  const kwData = (data.keywords?.density || []).slice(0, 15);
  const kwChartHeight = Math.max(280, kwData.length * 32);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="SEO 설정 완성도"
          value={score}
          sub="/100점"
          color="indigo"
          delay={0}
          tooltip="SEO 설정 항목의 구현 현황을 수치화한 지표입니다"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <KpiCard
          label="검색 노출 타겟 키워드"
          value={targetKws.length}
          sub={targetKws.slice(0, 3).join(", ") || "-"}
          color="amber"
          delay={0.05}
          tooltip="title, description, h1에서 공통 등장하는 핵심 키워드"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          }
        />
        <KpiCard
          label="JSON-LD"
          value={jsonLdCount > 0 ? `${jsonLdCount}개` : "없음"}
          sub={
            jsonLdCount > 0
              ? data.structuredData.jsonLd.map((l: any) => l.type).join(", ")
              : "구조화 데이터 미설정"
          }
          color={jsonLdCount > 0 ? "emerald" : "rose"}
          delay={0.1}
          tooltip="검색엔진이 페이지 내용을 이해하는 데 사용하는 구조화된 데이터"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          }
        />
        <KpiCard
          label="이미지 Alt"
          value={`${altRatio}%`}
          sub={`${data.semantic?.images?.withAlt || 0}/${data.semantic?.images?.total || 0}개 설정됨`}
          color={altRatio >= 80 ? "emerald" : "rose"}
          delay={0.15}
          tooltip="이미지에 대체 텍스트가 설정된 비율. 검색엔진은 이미지를 alt로 이해합니다"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Search intent analysis */}
      {data.keywords?.searchIntents?.length > 0 && (
        <Card title="예상 검색 노출 키워드" delay={0.18}
          infoTooltip="이 페이지의 SEO 설정(title, description, h1, JSON-LD)을 분석하여 어떤 검색어로 노출될 가능성이 높은지 AI가 추론한 결과입니다">
          <div className="space-y-2.5">
            {data.keywords.searchIntents.map((intent: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors"
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  intent.confidence === 'high' ? 'bg-emerald-100 text-emerald-600' :
                  intent.confidence === 'medium' ? 'bg-amber-100 text-amber-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {intent.confidence === 'high' ? 'H' : intent.confidence === 'medium' ? 'M' : 'L'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">"{intent.query}"</p>
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{intent.reason}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 inline-block" /> 높음 — title/h1에 직접 포함</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-100 inline-block" /> 중간 — 콘텐츠에서 추론</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-100 inline-block" /> 낮음 — 간접 연관</span>
          </div>
        </Card>
      )}

      {/* Score radar + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="SEO 설정 완성도"
          subtitle="각 항목별 달성률 (%)"
          delay={0.2}
        >
          <div className="h-72">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={radarData}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                >
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="item"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#6366F1"
                    fill="#6366F1"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center pt-12">
                데이터 없음
              </p>
            )}
          </div>
        </Card>

        <Card
          title="항목별 점수"
          subtitle="SEO 설정 완성도 세부 항목"
          delay={0.25}
        >
          <div className="space-y-3 pt-1">
            {(data.scoreBreakdown || []).map((item: any, i: number) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate">
                  {ITEM_LABELS[item.name] || item.name}
                </span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        item.score / item.maxScore >= 0.8
                          ? "#22C55E"
                          : item.score / item.maxScore >= 0.5
                            ? "#F59E0B"
                            : "#EF4444",
                    }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(item.score / item.maxScore) * 100}%`,
                    }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.04 }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 w-12 text-right">
                  {item.score}/{item.maxScore}
                </span>
                <span className="text-[11px] text-gray-400 w-16 truncate text-right">
                  {item.details}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Meta tags — basic */}
      <Card
        title="기본 메타 태그"
        subtitle="검색엔진이 페이지를 이해하는 핵심 태그"
        delay={0.3}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1">
          <MetaItem
            label="Title"
            value={data.metadata?.title?.content}
            badge={`${data.metadata?.title?.length}자`}
          />
          <MetaItem
            label="Description"
            value={data.metadata?.description?.content}
            badge={`${data.metadata?.description?.length}자`}
          />
          <MetaItem label="Canonical" value={data.metadata?.canonical} />
          <MetaItem label="Robots" value={data.metadata?.robots} />
        </div>
      </Card>

      {/* OG + Twitter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card delay={0.33}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </div>
            <div className="flex items-center gap-1">
              <h4 className="text-sm font-semibold text-gray-900">
                Open Graph
              </h4>
              <InfoTooltip text="카카오톡, 페이스북 등에 링크 공유 시 표시되는 제목·설명·이미지를 지정합니다" />
            </div>
          </div>
          {data.metadata?.ogTags &&
          Object.keys(data.metadata.ogTags).length > 0 ? (
            <div className="space-y-0.5">
              {Object.entries(data.metadata.ogTags).map(([k, v]) => (
                <MetaItem
                  key={k}
                  label={k.replace("og:", "")}
                  value={v as string}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="Open Graph 태그 미설정" />
          )}
        </Card>

        <Card delay={0.36}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-sky-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex items-center gap-1">
              <h4 className="text-sm font-semibold text-gray-900">
                Twitter Card
              </h4>
              <InfoTooltip text="X(구 트위터)에 링크 공유 시 표시되는 카드 형태를 지정합니다" />
            </div>
          </div>
          {data.metadata?.twitterTags &&
          Object.keys(data.metadata.twitterTags).length > 0 ? (
            <div className="space-y-0.5">
              {Object.entries(data.metadata.twitterTags).map(([k, v]) => (
                <MetaItem
                  key={k}
                  label={k.replace("twitter:", "")}
                  value={v as string}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="Twitter Card 태그 미설정" />
          )}
        </Card>
      </div>

      {/* JSON-LD + Headings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="구조화 데이터 (JSON-LD)"
          delay={0.39}
          infoTooltip="검색엔진이 페이지의 콘텐츠 유형(리뷰, FAQ, 조직 정보 등)을 정확히 이해하도록 돕는 데이터입니다"
        >
          <div className="mt-3">
            <JsonLdViewer data={data.structuredData?.jsonLd || []} />
          </div>
        </Card>
        <Card
          title="Heading 구조"
          delay={0.42}
          infoTooltip="H1~H6 태그의 계층 구조입니다. H1은 페이지당 1개, 논리적 순서가 중요합니다"
        >
          <div className="mt-3">
            <HeadingTree headings={data.semantic?.headings || []} />
          </div>
        </Card>
      </div>

      {/* Keywords — location + business separated */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Location keywords (compact) */}
        {(data.keywords?.locationKeywords?.length > 0) && (
          <Card title="타겟 지역" delay={0.44}
            infoTooltip="이 페이지가 타겟하는 지역/주소 키워드입니다. 행정구역, 도로명, 동/리 등">
            <div className="space-y-2">
              {data.keywords.locationKeywords.map((kw: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800">{kw.keyword}</span>
                  </div>
                  <span className="text-xs text-gray-400">{kw.count}회</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Business keywords (chart) */}
        {kwData.length > 0 && (
          <Card
            title="비즈니스 키워드 빈도"
            subtitle={`본문 ${data.keywords?.totalText?.chars?.toLocaleString()}자 기준`}
            className={data.keywords?.locationKeywords?.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}
            delay={0.46}
            infoTooltip="지역/주소 키워드를 제외한 서비스·상품 관련 핵심 키워드의 출현 빈도입니다"
          >
            <div style={{ height: kwChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kwData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis dataKey="keyword" type="category" tick={{ fontSize: 12, fill: '#334155' }} width={90} />
                  <Tooltip formatter={(v: any) => [`${v}회`, '빈도']} />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 6, 6, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Links & Content stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatMiniCard
          label="내부 링크"
          value={data.semantic?.links?.internal || 0}
          delay={0.48}
        />
        <StatMiniCard
          label="외부 링크"
          value={data.semantic?.links?.external || 0}
          delay={0.5}
        />
        <StatMiniCard
          label="이미지"
          value={data.semantic?.images?.total || 0}
          delay={0.52}
        />
        <StatMiniCard
          label="렌더링"
          value={data.technical?.renderingType || "unknown"}
          delay={0.54}
          tooltip={
            data.technical?.renderingType === "SSR"
              ? "서버 렌더링 — 검색엔진에 유리"
              : "클라이언트 렌더링 — SEO에 불리할 수 있음"
          }
        />
      </div>

      {/* CTA */}
      {data.content?.ctaButtons?.length > 0 && (
        <Card
          title="CTA 버튼 텍스트"
          delay={0.56}
          infoTooltip="사용자 행동을 유도하는 버튼 텍스트입니다. 경쟁사의 전환 유도 전략을 파악할 수 있습니다"
        >
          <div className="flex flex-wrap gap-2 mt-3">
            {data.content.ctaButtons.map((cta: string, i: number) => (
              <span
                key={i}
                className="text-sm px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg"
              >
                {cta}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* =========================================================
   MULTI-PAGE REPORT — 사이트 탐색 크롤링 뷰
   ========================================================= */
function MultiPageReport({
  session,
  pages,
  successPages,
  sessionId,
}: {
  session: any;
  pages: any[];
  successPages: any[];
  sessionId: string;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "pages">("overview");
  const summary = session.summary || {};
  const navigate = useNavigate();

  // Score distribution
  const scoreDistribution = successPages
    .map((p: any) => ({
      url: new URL(p.url).pathname.slice(0, 30) || "/",
      score: p.seo_data?.score || 0,
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 15);

  // Page type pie
  const pageTypePie = Object.entries(summary.pageTypeDistribution || {}).map(
    ([name, value]) => ({
      name:
        { main: "메인", list: "목록", detail: "상세", other: "기타" }[name] ||
        name,
      value: value as number,
    }),
  );

  const tabs = [
    { id: "overview" as const, label: "전체 요약" },
    { id: "pages" as const, label: `페이지 목록 (${pages.length})` },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab.id ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="multiTab"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="평균 SEO 완성도"
              value={summary.avgScore || 0}
              sub="/100점"
              color="indigo"
              delay={0}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <KpiCard
              label="분석 페이지"
              value={successPages.length}
              color="emerald"
              delay={0.05}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            />
            <KpiCard
              label="주요 키워드"
              value={summary.topKeywords?.length || 0}
              color="amber"
              delay={0.1}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              }
            />
            <KpiCard
              label="JSON-LD 타입"
              value={Object.keys(summary.jsonLdTypes || {}).length}
              color="rose"
              delay={0.15}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="페이지별 점수" className="lg:col-span-2" delay={0.2}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scoreDistribution}
                    margin={{ left: -10, right: 10, top: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="url"
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      angle={-30}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {scoreDistribution.map((_: any, i: number) => (
                        <Cell
                          key={i}
                          fill={
                            scoreDistribution[i].score >= 80
                              ? "#22C55E"
                              : scoreDistribution[i].score >= 50
                                ? "#F59E0B"
                                : "#EF4444"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="페이지 유형" delay={0.25}>
              <div className="h-56 flex items-center justify-center">
                {pageTypePie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pageTypePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pageTypePie.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400">데이터 없음</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {pageTypePie.map((entry, i) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-1.5 text-xs text-gray-500"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {summary.topKeywords?.length > 0 && (
            <Card title="사이트 전체 주요 키워드" delay={0.3}>
              <div className="flex flex-wrap gap-2">
                {summary.topKeywords.map((kw: any, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium"
                  >
                    {kw.keyword}{" "}
                    <span className="text-[11px] text-indigo-400">
                      ({kw.count})
                    </span>
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "pages" && (
        <Card noPadding delay={0.1}>
          <div className="divide-y divide-gray-50">
            {pages
              .sort(
                (a: any, b: any) =>
                  (b.seo_data?.score || 0) - (a.seo_data?.score || 0),
              )
              .map((page: any, i: number) => {
                const s = page.seo_data?.score;
                return (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() =>
                      navigate(`/report/${sessionId}/page/${page.id}`)
                    }
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                        s >= 80
                          ? "bg-emerald-50 text-emerald-600"
                          : s >= 50
                            ? "bg-amber-50 text-amber-600"
                            : s != null
                              ? "bg-red-50 text-red-500"
                              : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      {s ?? "-"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {page.url}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {page.page_type || "기타"} · 깊이 {page.depth}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </motion.div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* =========== SHARED HELPERS =========== */
const ITEM_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  canonical: "Canonical",
  ogTags: "OG 태그",
  jsonLd: "JSON-LD",
  h1: "H1 태그",
  imageAlt: "이미지 Alt",
  semanticTags: "시맨틱",
  robotsTxt: "robots.txt",
  sitemap: "sitemap",
};

function MetaItem({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <p className="flex-1 text-sm text-gray-800 break-all min-w-0">
        {value || <span className="text-gray-300">-</span>}
      </p>
      {badge && (
        <span className="text-[11px] text-gray-400 flex-shrink-0">{badge}</span>
      )}
    </div>
  );
}

export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group/tip inline-flex ml-1">
      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-gray-100 text-gray-400 rounded-full cursor-help hover:bg-gray-200 transition-colors">
        ?
      </span>
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
      <svg
        className="w-4 h-4 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
      <span className="text-xs text-gray-400">{text}</span>
    </div>
  );
}

function StatMiniCard({
  label,
  value,
  delay,
  tooltip,
}: {
  label: string;
  value: any;
  delay: number;
  tooltip?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-4 group"
    >
      <p className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
        {label}
        {tooltip && (
          <span className="relative">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] bg-gray-100 text-gray-400 rounded-full cursor-help">
              ?
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {tooltip}
            </span>
          </span>
        )}
      </p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} className="text-gray-300">
          {e.name}: <span className="text-white font-semibold">{e.value}</span>
        </p>
      ))}
    </div>
  );
}
