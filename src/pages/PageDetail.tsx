import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ScoreCard from '../components/ScoreCard';
import JsonLdViewer from '../components/JsonLdViewer';
import HeadingTree from '../components/HeadingTree';

export default function PageDetail() {
  const { sessionId, pageId } = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${sessionId}/pages/${pageId}`)
      .then((r) => r.json())
      .then((data) => {
        setPage(data);
        setLoading(false);
      });
  }, [sessionId, pageId]);

  if (loading) return <div className="text-center py-12 text-gray-500">로딩 중...</div>;
  if (!page?.seo_data) return <div className="text-center py-12 text-gray-500">데이터가 없습니다.</div>;

  const { seo_data: data } = page;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/report/${sessionId}`} className="text-sm text-blue-600 hover:underline">&larr; 보고서로 돌아가기</Link>
        <h2 className="text-lg font-bold text-gray-900 mt-2 break-all">{page.url}</h2>
        <div className="flex gap-3 mt-1 text-sm text-gray-500">
          <span>유형: {page.page_type || '기타'}</span>
          <span>깊이: {page.depth}</span>
        </div>
      </div>

      <ScoreCard score={data.score || 0} breakdown={data.scoreBreakdown} />

      {/* Metadata */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">메타데이터</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <MetaRow label="Title" value={data.metadata?.title?.content} sub={`${data.metadata?.title?.length}자`} />
            <MetaRow label="Description" value={data.metadata?.description?.content} sub={`${data.metadata?.description?.length}자`} />
            <MetaRow label="Keywords" value={data.metadata?.keywords} />
            <MetaRow label="Canonical" value={data.metadata?.canonical} />
            <MetaRow label="Robots" value={data.metadata?.robots} />
            <MetaRow label="Viewport" value={data.metadata?.viewport} />
          </tbody>
        </table>

        {data.metadata?.ogTags && Object.keys(data.metadata.ogTags).length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-2">Open Graph</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(data.metadata.ogTags).map(([key, value]) => (
                  <MetaRow key={key} label={key} value={value as string} />
                ))}
              </tbody>
            </table>
          </>
        )}

        {data.metadata?.twitterTags && Object.keys(data.metadata.twitterTags).length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-2">Twitter Card</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(data.metadata.twitterTags).map(([key, value]) => (
                  <MetaRow key={key} label={key} value={value as string} />
                ))}
              </tbody>
            </table>
          </>
        )}

        {data.metadata?.verificationTags && Object.keys(data.metadata.verificationTags).length > 0 && (
          <>
            <h4 className="font-medium text-gray-900 mt-6 mb-2">검색엔진 인증</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(data.metadata.verificationTags).map(([key, value]) => (
                  <MetaRow key={key} label={key} value={value as string} />
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* JSON-LD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">구조화 데이터 (JSON-LD)</h3>
        <JsonLdViewer data={data.structuredData?.jsonLd || []} />
      </div>

      {/* Heading structure */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Heading 구조</h3>
        <HeadingTree headings={data.semantic?.headings || []} />
      </div>

      {/* Semantic tags */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">시맨틱 태그 사용</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {['nav', 'main', 'article', 'section', 'aside', 'footer', 'header'].map((tag) => (
            <div key={tag} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">{data.semantic?.semanticTags?.[tag] || 0}</div>
              <div className="text-xs text-gray-600 font-mono">&lt;{tag}&gt;</div>
            </div>
          ))}
        </div>
      </div>

      {/* Links & Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">링크 분석</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">내부 링크</span><span className="font-medium">{data.semantic?.links?.internal || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">외부 링크</span><span className="font-medium">{data.semantic?.links?.external || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">nofollow</span><span className="font-medium">{data.semantic?.links?.nofollow || 0}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">이미지 분석</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">전체 이미지</span><span className="font-medium">{data.semantic?.images?.total || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Alt 있음</span><span className="font-medium">{data.semantic?.images?.withAlt || 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Alt 비율</span><span className="font-medium">{Math.round((data.semantic?.images?.altRatio || 0) * 100)}%</span></div>
          </div>
        </div>
      </div>

      {/* Keywords */}
      {data.keywords?.density?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">키워드 밀도</h3>
          <p className="text-sm text-gray-500 mb-4">총 {data.keywords.totalText?.chars?.toLocaleString()}자, {data.keywords.totalText?.words?.toLocaleString()}단어</p>
          <div className="space-y-2">
            {data.keywords.density.slice(0, 20).map((kw: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-right text-gray-700 truncate">{kw.keyword}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5">
                  <div
                    className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(kw.ratio * 10, 100)}%`, minWidth: '2rem' }}
                  >
                    <span className="text-[10px] text-white">{kw.ratio}%</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-12">{kw.count}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content analysis */}
      {data.content && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">콘텐츠 분석</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat label="이미지" value={data.content.imageCount} />
            <Stat label="비디오" value={data.content.videoCount} />
            <Stat label="CTA 버튼" value={data.content.ctaButtons?.length || 0} />
            <Stat label="내부 링크 대상" value={data.content.internalLinkTargets?.length || 0} />
          </div>
          {data.content.ctaButtons?.length > 0 && (
            <>
              <h4 className="font-medium text-gray-900 mb-2">CTA 텍스트</h4>
              <div className="flex flex-wrap gap-2">
                {data.content.ctaButtons.map((cta: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">{cta}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value, sub }: { label: string; value?: string; sub?: string }) {
  return (
    <tr>
      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap w-40">{label}</td>
      <td className="py-2 text-gray-900 break-all">
        {value || <span className="text-gray-400">-</span>}
        {sub && <span className="ml-2 text-xs text-gray-400">({sub})</span>}
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
