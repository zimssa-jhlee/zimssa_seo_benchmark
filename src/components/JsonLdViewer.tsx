import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JsonLdViewerProps {
  data: Array<{ type: string; raw: object }>;
}

export default function JsonLdViewer({ data }: JsonLdViewerProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400">JSON-LD 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <CollapsibleJson key={i} title={item.type} data={item.raw} />
      ))}
    </div>
  );
}

function CollapsibleJson({ title, data }: { title: string; data: object }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md font-mono font-semibold">@type</span>
          <span className="text-sm font-medium text-gray-800">{title}</span>
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="px-4 py-3 text-[11px] font-mono text-gray-600 bg-gray-50/50 overflow-x-auto max-h-80 border-t border-gray-100">
              {JSON.stringify(data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
