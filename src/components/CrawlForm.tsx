import { useState } from 'react';

interface CrawlFormProps {
  onStart: (url: string, options: { depth: number; maxPages: number }) => void;
  isLoading: boolean;
}

export default function CrawlForm({ onStart, isLoading }: CrawlFormProps) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(50);
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http')) fullUrl = `https://${fullUrl}`;
    onStart(fullUrl, { depth, maxPages });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">새 크롤링 시작</h2>

      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '크롤링 중...' : '크롤링 시작'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="mt-3 text-sm text-gray-500 hover:text-gray-700"
      >
        {showOptions ? '옵션 숨기기' : '크롤링 옵션 설정'}
      </button>

      {showOptions && (
        <div className="mt-3 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>탐색 깊이</span>
            <Tooltip text="시작 URL로부터 몇 단계까지 링크를 따라갈지 설정합니다" />
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>최대 페이지 수</span>
            <Tooltip text="한 번의 크롤링에서 수집할 최대 페이지 수입니다" />
            <select
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1"
            >
              {[10, 20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </form>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group">
      <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-gray-200 text-gray-600 rounded-full cursor-help">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {text}
      </span>
    </span>
  );
}
