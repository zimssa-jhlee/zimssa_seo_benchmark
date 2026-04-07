import { motion } from 'framer-motion';

interface HeadingTreeProps {
  headings: Array<{ level: number; text: string }>;
}

const LEVEL_STYLES: Record<number, string> = {
  1: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  2: 'bg-amber-50 text-amber-600 border-amber-200',
  3: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  4: 'bg-gray-50 text-gray-500 border-gray-200',
  5: 'bg-gray-50 text-gray-400 border-gray-200',
  6: 'bg-gray-50 text-gray-400 border-gray-200',
};

export default function HeadingTree({ headings }: HeadingTreeProps) {
  if (headings.length === 0) {
    return <p className="text-sm text-gray-400">Heading 태그가 없습니다.</p>;
  }

  return (
    <div className="space-y-1.5">
      {headings.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: i * 0.03 }}
          className="flex items-center gap-2"
          style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
        >
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${LEVEL_STYLES[h.level] || LEVEL_STYLES[6]}`}>
            H{h.level}
          </span>
          <span className="text-sm text-gray-700 truncate">{h.text}</span>
        </motion.div>
      ))}
    </div>
  );
}
