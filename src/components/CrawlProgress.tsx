import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const eventSource = new EventSource(`/api/crawl/${sessionId}/progress`);

    eventSource.onmessage = (e) => {
      const event: ProgressEvent = JSON.parse(e.data);

      setEvents((prev) => [...prev.slice(-50), event]);

      switch (event.type) {
        case 'connected':
          setStatus('running');
          break;
        case 'progress':
          setCrawledPages(event.data.crawledPages);
          setTotalPages(event.data.totalPages);
          setCurrentUrl(event.data.currentUrl);
          break;
        case 'completed':
          setStatus('completed');
          eventSource.close();
          setTimeout(() => onComplete(sessionId), 1000);
          break;
        case 'failed':
          setStatus('failed');
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      setStatus('failed');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [sessionId, onComplete]);

  const progress = totalPages > 0 ? Math.round((crawledPages / totalPages) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">크롤링 진행 상황</h3>
        <StatusBadge status={status} />
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-gray-600 mb-4">
        <span>{crawledPages} / {totalPages} 페이지</span>
        <span>{progress}%</span>
      </div>

      {currentUrl && (
        <p className="text-sm text-gray-500 truncate mb-3">
          현재: {currentUrl}
        </p>
      )}

      <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 space-y-1">
        {events.map((event, i) => (
          <div key={i}>
            {event.type === 'page_crawled' && (
              <span className="text-green-600">OK {event.data?.url} (점수: {event.data?.score})</span>
            )}
            {event.type === 'page_failed' && (
              <span className="text-red-500">FAIL {event.data?.url}: {event.data?.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    connecting: 'bg-yellow-100 text-yellow-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    connecting: '연결 중',
    running: '크롤링 중',
    completed: '완료',
    failed: '실패',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
