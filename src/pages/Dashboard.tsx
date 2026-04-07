import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CrawlForm from '../components/CrawlForm';
import CrawlProgress from '../components/CrawlProgress';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeCrawl, setActiveCrawl] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/sessions');
    setSessions(await res.json());
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleStart = async (url: string, options: { depth: number; maxPages: number }) => {
    const res = await fetch('/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, options }),
    });
    const { sessionId } = await res.json();
    setActiveCrawl(sessionId);
  };

  const handleComplete = useCallback((sessionId: string) => {
    setActiveCrawl(null);
    navigate(`/report/${sessionId}`);
  }, [navigate]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    fetchSessions();
  };

  const recentCompleted = sessions.filter(s => s.status === 'completed').slice(0, 6);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">경쟁사 SEO 설정을 분석하고 벤치마킹하세요</p>
      </div>

      {/* Crawl form */}
      <CrawlForm onStart={handleStart} isLoading={!!activeCrawl} />

      {/* Active crawl */}
      <AnimatePresence>
        {activeCrawl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <CrawlProgress sessionId={activeCrawl} onComplete={handleComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent crawls — grid cards */}
      {recentCompleted.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-900">최근 분석</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentCompleted.map((session, i) => (
              <SessionCard key={session.id} session={session} index={i} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, index, onDelete }: { session: any; index: number; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const summary = session.summary || {};
  const score = summary.avgScore ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => navigate(`/report/${session.id}`)}
      className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{session.domain}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(session.created_at).toLocaleDateString('ko-KR')} · {session.crawled_pages}페이지
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('삭제하시겠습니까?')) onDelete(session.id);
          }}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-4">
        <ScoreRing score={score} size={56} />
        <div className="flex-1 space-y-1.5">
          {summary.metaCompleteness && (
            <>
              <MiniProgress label="Title" value={summary.metaCompleteness.title} />
              <MiniProgress label="Description" value={summary.metaCompleteness.description} />
              <MiniProgress label="OG Tags" value={summary.metaCompleteness.ogTags} />
            </>
          )}
        </div>
      </div>

      {/* Keywords */}
      {summary.topKeywords?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {summary.topKeywords.slice(0, 4).map((kw: any, i: number) => (
            <span key={i} className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
              {kw.keyword}
            </span>
          ))}
          {summary.topKeywords.length > 4 && (
            <span className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md">
              +{summary.topKeywords.length - 4}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ScoreRing({ score, size }: { score: number; size: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
        {score}
      </span>
    </div>
  );
}

function MiniProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 w-16 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: value >= 80 ? '#22C55E' : value >= 50 ? '#F59E0B' : '#EF4444' }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <span className="text-[11px] font-medium text-gray-500 w-8 text-right">{value}%</span>
    </div>
  );
}
