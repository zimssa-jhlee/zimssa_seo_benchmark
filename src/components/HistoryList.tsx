import { useNavigate } from 'react-router-dom';

interface Session {
  id: string;
  domain: string;
  url: string;
  status: string;
  crawled_pages: number;
  total_pages: number;
  summary: any;
  created_at: string;
}

interface HistoryListProps {
  sessions: Session[];
  onDelete: (id: string) => void;
}

export default function HistoryList({ sessions, onDelete }: HistoryListProps) {
  const navigate = useNavigate();

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        크롤링 히스토리가 없습니다. 위에서 URL을 입력하여 시작하세요.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">크롤링 히스토리</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
            onClick={() => navigate(`/report/${session.id}`)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900 truncate">{session.domain}</span>
                <StatusBadge status={session.status} />
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                <span>{new Date(session.created_at).toLocaleString('ko-KR')}</span>
                <span>{session.crawled_pages}페이지</span>
                {session.summary?.avgScore != null && (
                  <span>평균 완성도: {session.summary.avgScore}점</span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('이 크롤링 기록을 삭제하시겠습니까?')) onDelete(session.id);
              }}
              className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
