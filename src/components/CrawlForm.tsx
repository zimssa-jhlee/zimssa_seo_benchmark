import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type CrawlMode = 'single' | 'deep';

interface CrawlFormProps {
  onStart: (url: string, options: { depth: number; maxPages: number }) => void;
  isLoading: boolean;
}

export default function CrawlForm({ onStart, isLoading }: CrawlFormProps) {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<CrawlMode>('single');
  const [depth, setDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let fullUrl = url.trim();
    if (fullUrl.startsWith('http://')) fullUrl = fullUrl.replace('http://', 'https://');
    else if (!fullUrl.startsWith('https://')) fullUrl = `https://${fullUrl}`;

    const options = mode === 'single'
      ? { depth: 0, maxPages: 1 }
      : { depth, maxPages };

    onStart(fullUrl, options);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="분석할 URL을 입력하세요 (예: zippoom.com)"
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-2 shadow-sm shadow-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/25"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              분석 중
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              분석 시작
            </>
          )}
        </button>
      </div>

      {/* Mode selector */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <ModeButton
            active={mode === 'single'}
            onClick={() => setMode('single')}
            label="단일 페이지"
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <ModeButton
            active={mode === 'deep'}
            onClick={() => setMode('deep')}
            label="사이트 탐색"
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
          />
        </div>
        <span className="text-[11px] text-gray-400">
          {mode === 'single'
            ? '입력한 URL 한 페이지만 분석합니다'
            : '링크를 따라가며 여러 페이지를 분석합니다'}
        </span>
      </div>

      {/* Deep crawl options */}
      <AnimatePresence>
        {mode === 'deep' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-6 pt-3 pb-1">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                탐색 깊이
                <select
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                  {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                최대 페이지
                <select
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                  {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function ModeButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
