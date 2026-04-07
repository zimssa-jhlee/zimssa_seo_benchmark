import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ScoreCard from '../components/ScoreCard';

type TabId = 'summary' | 'pages' | 'keywords' | 'technical' | 'compare';

export default function Report() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  useEffect(() => {
    fetch(`/api/reports/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        setReport(data);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) return <div className="text-center py-12 text-gray-500">보고서 로딩 중...</div>;
  if (!report) return <div className="text-center py-12 text-gray-500">보고서를 찾을 수 없습니다.</div>;

  const { session, pages } = report;
  const summary = session.summary || {};
  const successPages = pages.filter((p: any) => p.status === 'success');

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'summary', label: '요약' },
    { id: 'pages', label: `페이지 목록 (${pages.length})` },
    { id: 'keywords', label: '키워드 분석' },
    { id: 'technical', label: '기술 분석' },
    { id: 'compare', label: '비교' },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; 대시보드로 돌아가기</Link>
        <h2 className="text-2xl font-bold text-gray-900 mt-2">{session.domain}</h2>
        <p className="text-sm text-gray-500">{session.url} — {new Date(session.created_at).toLocaleString('ko-KR')}</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'summary' && <SummaryTab summary={summary} pages={successPages} />}
      {activeTab === 'pages' && <PagesTab pages={pages} sessionId={sessionId!} />}
      {activeTab === 'keywords' && <KeywordsTab summary={summary} pages={successPages} />}
      {activeTab === 'technical' && <TechnicalTab pages={successPages} />}
      {activeTab === 'compare' && <CompareTab sessionId={sessionId!} />}
    </div>
  );
}

function SummaryTab({ summary, pages }: { summary: any; pages: any[] }) {
  const avgBreakdown = pages.length > 0 && pages[0].seo_data?.scoreBreakdown
    ? pages[0].seo_data.scoreBreakdown
    : undefined;

  return (
    <div className="space-y-6">
      <ScoreCard score={summary.avgScore || 0} breakdown={avgBreakdown} />

      {summary.topKeywords?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">주요 키워드 TOP 10</h3>
          <div className="flex flex-wrap gap-2">
            {summary.topKeywords.map((kw: any, i: number) => (
              <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {kw.keyword} ({kw.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.jsonLdTypes && Object.keys(summary.jsonLdTypes).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">JSON-LD 사용 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.jsonLdTypes).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                <div className="text-sm text-gray-600">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.pageTypeDistribution && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">페이지 유형 분포</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.pageTypeDistribution).map(([type, count]) => {
              const labels: Record<string, string> = { main: '메인', list: '목록', detail: '상세', other: '기타' };
              return (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                  <div className="text-sm text-gray-600">{labels[type] || type}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PagesTab({ pages, sessionId }: { pages: any[]; sessionId: string }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? pages : pages.filter((p) => p.page_type === filter);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
        <span className="text-sm text-gray-600">필터:</span>
        {['all', 'main', 'list', 'detail', 'other'].map((f) => {
          const labels: Record<string, string> = { all: '전체', main: '메인', list: '목록', detail: '상세', other: '기타' };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>
      <table className="w-full">
        <thead className="bg-gray-50 text-left text-sm text-gray-600">
          <tr>
            <th className="px-6 py-3">URL</th>
            <th className="px-6 py-3 w-24">유형</th>
            <th className="px-6 py-3 w-24">상태</th>
            <th className="px-6 py-3 w-32">SEO 설정 완성도</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.map((page: any) => (
            <tr key={page.id} className="hover:bg-gray-50">
              <td className="px-6 py-3">
                <Link
                  to={`/report/${sessionId}/page/${page.id}`}
                  className="text-blue-600 hover:underline text-sm truncate block max-w-lg"
                >
                  {page.url}
                </Link>
              </td>
              <td className="px-6 py-3 text-sm text-gray-600">{page.page_type || '-'}</td>
              <td className="px-6 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  page.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {page.status}
                </span>
              </td>
              <td className="px-6 py-3 text-sm font-medium">
                {page.seo_data?.score != null ? `${page.seo_data.score}/100` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeywordsTab({ summary, pages }: { summary: any; pages: any[] }) {
  const allKeywords = new Map<string, { count: number; inTitle: number; inDesc: number; inH1: number }>();

  for (const page of pages) {
    const density = page.seo_data?.keywords?.density || [];
    for (const kw of density) {
      const existing = allKeywords.get(kw.keyword) || { count: 0, inTitle: 0, inDesc: 0, inH1: 0 };
      existing.count += kw.count;
      if (kw.inTitle) existing.inTitle++;
      if (kw.inDescription) existing.inDesc++;
      if (kw.inH1) existing.inH1++;
      allKeywords.set(kw.keyword, existing);
    }
  }

  const sorted = [...allKeywords.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 20);
  const maxCount = sorted[0]?.[1].count || 1;

  return (
    <div className="space-y-6">
      {summary.topKeywords?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">추정 타겟 키워드</h3>
          <p className="text-sm text-gray-500 mb-4">title, description, h1, og:title에서 공통으로 등장하는 핵심 키워드</p>
          <div className="flex flex-wrap gap-2">
            {summary.topKeywords.map((kw: any, i: number) => (
              <span key={i} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">키워드 밀도 (상위 20개)</h3>
        <div className="space-y-3">
          {sorted.map(([keyword, data]) => (
            <div key={keyword} className="flex items-center gap-4">
              <span className="w-24 text-sm text-gray-700 text-right truncate">{keyword}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(data.count / maxCount) * 100}%`, minWidth: '2rem' }}
                  >
                    <span className="text-xs text-white font-medium">{data.count}</span>
                  </div>
                </div>
                {data.inTitle > 0 && <span className="text-xs px-1 py-0.5 bg-green-100 text-green-700 rounded">T</span>}
                {data.inDesc > 0 && <span className="text-xs px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">D</span>}
                {data.inH1 > 0 && <span className="text-xs px-1 py-0.5 bg-purple-100 text-purple-700 rounded">H1</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <span><span className="px-1 py-0.5 bg-green-100 text-green-700 rounded">T</span> = Title에 포함</span>
          <span><span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">D</span> = Description에 포함</span>
          <span><span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded">H1</span> = H1에 포함</span>
        </div>
      </div>
    </div>
  );
}

function TechnicalTab({ pages }: { pages: any[] }) {
  if (pages.length === 0) return <p className="text-gray-500">데이터가 없습니다.</p>;

  const firstPage = pages[0].seo_data;
  const technical = firstPage?.technical;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">렌더링 방식</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          technical?.renderingType === 'SSR' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {technical?.renderingType || 'unknown'}
        </span>
        <p className="text-sm text-gray-500 mt-2">
          {technical?.renderingType === 'SSR' && 'Server-Side Rendering — 초기 HTML에 콘텐츠가 포함되어 검색엔진 크롤링에 유리합니다.'}
          {technical?.renderingType === 'CSR' && 'Client-Side Rendering — JavaScript 실행 후 콘텐츠가 로드됩니다. 검색엔진이 콘텐츠를 인식하지 못할 수 있습니다.'}
          {(!technical?.renderingType || technical?.renderingType === 'unknown') && '렌더링 방식을 판별할 수 없습니다.'}
        </p>
      </div>

      {technical?.robotsTxt && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">robots.txt</h3>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {technical.robotsTxt}
          </pre>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sitemap</h3>
        <p className="text-sm text-gray-700">
          {technical?.sitemapExists
            ? `sitemap.xml 존재 — ${technical.sitemapUrlCount}개 URL 포함`
            : 'sitemap.xml을 찾을 수 없습니다.'}
        </p>
      </div>

      {technical?.httpHeaders && Object.keys(technical.httpHeaders).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO 관련 HTTP 헤더</h3>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(technical.httpHeaders).map(([key, value]) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-600">{key}</td>
                  <td className="py-2 text-gray-900">{value as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">페이지별 JSON-LD 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">URL</th>
                <th className="px-4 py-2">JSON-LD 타입</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.slice(0, 30).map((page: any) => (
                <tr key={page.id}>
                  <td className="px-4 py-2 truncate max-w-xs text-gray-700">{page.url}</td>
                  <td className="px-4 py-2">
                    {page.seo_data?.structuredData?.jsonLd?.length > 0
                      ? page.seo_data.structuredData.jsonLd.map((ld: any) => ld.type).join(', ')
                      : <span className="text-gray-400">없음</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareTab({ sessionId }: { sessionId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [compareId, setCompareId] = useState<string>('');
  const [compareReport, setCompareReport] = useState<any>(null);
  const [currentReport, setCurrentReport] = useState<any>(null);

  useEffect(() => {
    fetch('/api/sessions').then((r) => r.json()).then((data) => {
      setSessions(data.filter((s: any) => s.id !== sessionId && s.status === 'completed'));
    });
    fetch(`/api/reports/${sessionId}`).then((r) => r.json()).then(setCurrentReport);
  }, [sessionId]);

  const handleCompare = async () => {
    if (!compareId) return;
    const res = await fetch(`/api/reports/${compareId}`);
    setCompareReport(await res.json());
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        비교할 다른 도메인의 크롤링 데이터가 없습니다. 다른 도메인을 먼저 크롤링하세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">도메인 비교</h3>
        <div className="flex gap-3">
          <select
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">비교할 도메인 선택</option>
            {sessions.map((s: any) => (
              <option key={s.id} value={s.id}>{s.domain} ({new Date(s.created_at).toLocaleDateString('ko-KR')})</option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={!compareId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            비교하기
          </button>
        </div>
      </div>

      {currentReport && compareReport && (
        <CompareResults current={currentReport} compare={compareReport} />
      )}
    </div>
  );
}

function CompareResults({ current, compare }: { current: any; compare: any }) {
  const cs = current.session.summary || {};
  const cps = compare.session.summary || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO 설정 완성도 비교</h3>
        <div className="grid grid-cols-2 gap-8 text-center">
          <div>
            <div className="text-sm text-gray-500 mb-1">{current.session.domain}</div>
            <div className="text-4xl font-bold text-blue-600">{cs.avgScore || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">{compare.session.domain}</div>
            <div className="text-4xl font-bold text-purple-600">{cps.avgScore || 0}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">메타데이터 완성도 비교 (%)</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">항목</th>
              <th className="px-4 py-2 text-center">{current.session.domain}</th>
              <th className="px-4 py-2 text-center">{compare.session.domain}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {['title', 'description', 'canonical', 'ogTags'].map((key) => (
              <tr key={key}>
                <td className="px-4 py-2 text-gray-700">{key}</td>
                <td className="px-4 py-2 text-center font-medium">{cs.metaCompleteness?.[key] ?? '-'}%</td>
                <td className="px-4 py-2 text-center font-medium">{cps.metaCompleteness?.[key] ?? '-'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">JSON-LD 타입 비교</h3>
        {(() => {
          const allTypes = new Set([
            ...Object.keys(cs.jsonLdTypes || {}),
            ...Object.keys(cps.jsonLdTypes || {}),
          ]);
          return (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">@type</th>
                  <th className="px-4 py-2 text-center">{current.session.domain}</th>
                  <th className="px-4 py-2 text-center">{compare.session.domain}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...allTypes].map((type) => (
                  <tr key={type}>
                    <td className="px-4 py-2 font-mono text-gray-700">{type}</td>
                    <td className="px-4 py-2 text-center">{cs.jsonLdTypes?.[type] || <span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-2 text-center">{cps.jsonLdTypes?.[type] || <span className="text-gray-300">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}
