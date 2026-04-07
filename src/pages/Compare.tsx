import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Card from '../components/Card';

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
        <p className="text-sm text-gray-500 mt-1">두 도메인의 SEO 설정을 비교합니다</p>
      </div>

      {/* Selector */}
      <Card delay={0.1}>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">도메인 A</label>
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
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">도메인 B</label>
            <select value={rightId} onChange={e => setRightId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none">
              <option value="">선택하세요</option>
              {sessions.filter(s => s.id !== leftId).map(s => <option key={s.id} value={s.id}>{s.domain} ({new Date(s.created_at).toLocaleDateString('ko-KR')})</option>)}
            </select>
          </div>
          <button
            onClick={handleCompare}
            disabled={!leftId || !rightId}
            className="px-6 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm"
          >
            비교하기
          </button>
        </div>
      </Card>

      {/* Results */}
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

  // Score comparison
  const scoreData = [
    { name: left.session.domain, score: ls.avgScore || 0 },
    { name: right.session.domain, score: rs.avgScore || 0 },
  ];

  // Meta completeness radar
  const radarData = ['title', 'description', 'canonical', 'ogTags'].map(key => ({
    item: { title: 'Title', description: 'Description', canonical: 'Canonical', ogTags: 'OG Tags' }[key],
    [left.session.domain]: ls.metaCompleteness?.[key] ?? 0,
    [right.session.domain]: rs.metaCompleteness?.[key] ?? 0,
  }));

  // JSON-LD comparison
  const allTypes = new Set([
    ...Object.keys(ls.jsonLdTypes || {}),
    ...Object.keys(rs.jsonLdTypes || {}),
  ]);
  const jsonLdData = [...allTypes].map(type => ({
    type,
    [left.session.domain]: ls.jsonLdTypes?.[type] || 0,
    [right.session.domain]: rs.jsonLdTypes?.[type] || 0,
  }));

  return (
    <div className="mt-6 space-y-6">
      {/* Score cards side by side */}
      <div className="grid grid-cols-2 gap-6">
        <ScoreCompareCard domain={left.session.domain} score={ls.avgScore || 0} pages={left.session.crawled_pages} color="#6366F1" delay={0.15} />
        <ScoreCompareCard domain={right.session.domain} score={rs.avgScore || 0} pages={right.session.crawled_pages} color="#8B5CF6" delay={0.2} />
      </div>

      {/* Radar + Bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="메타데이터 완성도 비교" delay={0.25}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="item" tick={{ fontSize: 12, fill: '#64748B' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Radar dataKey={left.session.domain} stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={2} />
                <Radar dataKey={right.session.domain} stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {jsonLdData.length > 0 && (
          <Card title="JSON-LD 타입 비교" delay={0.3}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jsonLdData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={120} />
                  <Tooltip />
                  <Bar dataKey={left.session.domain} fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  <Bar dataKey={right.session.domain} fill="#8B5CF6" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Keyword comparison */}
      <Card title="키워드 전략 비교" delay={0.35}>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">{left.session.domain}</p>
            <div className="flex flex-wrap gap-1.5">
              {(ls.topKeywords || []).map((kw: any, i: number) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg">{kw.keyword} ({kw.count})</span>
              ))}
              {(!ls.topKeywords || ls.topKeywords.length === 0) && <span className="text-xs text-gray-400">키워드 없음</span>}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">{right.session.domain}</p>
            <div className="flex flex-wrap gap-1.5">
              {(rs.topKeywords || []).map((kw: any, i: number) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-violet-50 text-violet-600 rounded-lg">{kw.keyword} ({kw.count})</span>
              ))}
              {(!rs.topKeywords || rs.topKeywords.length === 0) && <span className="text-xs text-gray-400">키워드 없음</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ScoreCompareCard({ domain, score, pages, color, delay }: { domain: string; score: number; pages: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-6 text-center"
    >
      <p className="text-sm font-medium text-gray-500 mb-3">{domain}</p>
      <div className="relative inline-flex" style={{ width: 100, height: 100 }}>
        <svg width={100} height={100} className="-rotate-90">
          <circle cx={50} cy={50} r={42} fill="none" stroke="#F1F5F9" strokeWidth={6} />
          <motion.circle
            cx={50} cy={50} r={42} fill="none" stroke={color} strokeWidth={6}
            strokeLinecap="round" strokeDasharray={42 * 2 * Math.PI}
            initial={{ strokeDashoffset: 42 * 2 * Math.PI }}
            animate={{ strokeDashoffset: 42 * 2 * Math.PI * (1 - score / 100) }}
            transition={{ duration: 1, ease: 'easeOut', delay: delay + 0.2 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">{score}</span>
      </div>
      <p className="text-xs text-gray-400 mt-2">{pages} 페이지 분석</p>
    </motion.div>
  );
}
