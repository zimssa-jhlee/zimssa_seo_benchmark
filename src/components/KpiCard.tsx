import { motion } from 'framer-motion';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
  tooltip?: string;
  delay?: number;
}

const BG_MAP = {
  indigo: 'bg-indigo-50 text-indigo-500',
  emerald: 'bg-emerald-50 text-emerald-500',
  amber: 'bg-amber-50 text-amber-500',
  rose: 'bg-rose-50 text-rose-500',
};

export default function KpiCard({ label, value, sub, icon, color, tooltip, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-500 flex items-center gap-1">
            {label}
            {tooltip && (
              <span className="relative">
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] bg-gray-200 text-gray-500 rounded-full cursor-help">?</span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {tooltip}
                </span>
              </span>
            )}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${BG_MAP[color]}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
