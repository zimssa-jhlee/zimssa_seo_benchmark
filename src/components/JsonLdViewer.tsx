import { useState } from 'react';

interface JsonLdViewerProps {
  data: Array<{ type: string; raw: object }>;
}

export default function JsonLdViewer({ data }: JsonLdViewerProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">JSON-LD 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <CollapsibleJson key={i} title={`@type: ${item.type}`} data={item.raw} />
      ))}
    </div>
  );
}

function CollapsibleJson({ title, data }: { title: string; data: object }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100"
      >
        <span className="font-mono text-sm font-medium text-gray-800">{title}</span>
        <span className="text-gray-400">{isOpen ? '\u25BC' : '\u25B6'}</span>
      </button>
      {isOpen && (
        <pre className="px-4 py-3 text-xs font-mono text-gray-700 bg-white overflow-x-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
