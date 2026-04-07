interface HeadingTreeProps {
  headings: Array<{ level: number; text: string }>;
}

export default function HeadingTree({ headings }: HeadingTreeProps) {
  if (headings.length === 0) {
    return <p className="text-sm text-gray-500">Heading 태그가 없습니다.</p>;
  }

  return (
    <div className="space-y-1">
      {headings.map((h, i) => (
        <div
          key={i}
          className="flex items-center gap-2"
          style={{ paddingLeft: `${(h.level - 1) * 20}px` }}
        >
          <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
            h.level === 1 ? 'bg-red-100 text-red-700' :
            h.level === 2 ? 'bg-orange-100 text-orange-700' :
            h.level === 3 ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            H{h.level}
          </span>
          <span className="text-sm text-gray-800 truncate">{h.text}</span>
        </div>
      ))}
    </div>
  );
}
