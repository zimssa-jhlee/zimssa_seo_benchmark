import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import PageDetail from './pages/PageDetail';
import Compare from './pages/Compare';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/report/:sessionId" element={<Report />} />
        <Route path="/report/:sessionId/page/:pageId" element={<PageDetail />} />
        <Route path="/compare" element={<Compare />} />
      </Routes>
    </Layout>
  );
}

export default App;
