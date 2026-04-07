import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface ProgressEvent {
  type: string;
  sessionId: string;
  data?: any;
}

interface CrawlProgressProps {
  sessionId: string;
  onComplete: (sessionId: string) => void;
}

export default function CrawlProgress({ sessionId, onComplete }: CrawlProgressProps) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [crawledPages, setCrawledPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'running' | 'completed' | 'failed'>('connecting');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/crawl/${sessionId}/progress`);

    eventSource.onmessage = (e) => {
      const event: ProgressEvent = JSON.parse(e.data);
      setEvents((prev) => [...prev.slice(-50), event]);

      switch (event.type) {
        case 'connected': setStatus('running'); break;
        case 'progress':
          setCrawledPages(event.data.crawledPages);
          setTotalPages(event.data.totalPages);
          setCurrentUrl(event.data.currentUrl);
          break;
        case 'completed':
          setStatus('completed');
          eventSource.close();
          setTimeout(() => onComplete(sessionId), 1500);
          break;
        case 'failed':
          setStatus('failed');
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => { setStatus('failed'); eventSource.close(); };
    return () => eventSource.close();
  }, [sessionId, onComplete]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const progress = totalPages > 0 ? Math.round((crawledPages / totalPages) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {status === 'running' && (
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full bg-indigo-400/30 animate-ping" />
              <div className="relative w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
          )}
          {status === 'completed' && (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <h3 className="text-[15px] font-semibold text-gray-900">
            {status === 'running' ? '크롤링 진행 중' : status === 'completed' ? '크롤링 완료' : status === 'failed' ? '크롤링 실패' : '연결 중...'}
          </h3>
        </div>
        <span className="text-sm font-semibold text-indigo-500">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>{crawledPages} / {totalPages} 페이지 수집됨</span>
        {currentUrl && <span className="truncate max-w-[60%] text-right">{currentUrl}</span>}
      </div>

      {/* Event log */}
      <div
        ref={logRef}
        className="max-h-32 overflow-y-auto bg-gray-50 rounded-xl p-3 text-[11px] font-mono text-gray-500 space-y-0.5 scrollbar-thin"
      >
        {events.filter(e => e.type === 'page_crawled' || e.type === 'page_failed').map((event, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {event.type === 'page_crawled' ? (
              <>
                <span className="text-emerald-500">●</span>
                <span className="truncate">{event.data?.url}</span>
                <span className="ml-auto text-gray-400 flex-shrink-0">점수 {event.data?.score}</span>
              </>
            ) : (
              <>
                <span className="text-red-400">●</span>
                <span className="truncate text-red-400">{event.data?.url}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
