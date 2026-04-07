import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CrawlForm from '../components/CrawlForm';
import CrawlProgress from '../components/CrawlProgress';
import HistoryList from '../components/HistoryList';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeCrawl, setActiveCrawl] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    setSessions(data);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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

  return (
    <div className="space-y-6">
      <CrawlForm onStart={handleStart} isLoading={!!activeCrawl} />

      {activeCrawl && (
        <CrawlProgress sessionId={activeCrawl} onComplete={handleComplete} />
      )}

      <HistoryList sessions={sessions} onDelete={handleDelete} />
    </div>
  );
}
