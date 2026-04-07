import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import PageDetail from './pages/PageDetail';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
          SEO Benchmarker
        </Link>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/report/:sessionId" element={<Report />} />
          <Route path="/report/:sessionId/page/:pageId" element={<PageDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
