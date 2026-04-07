import { InfoTooltip } from "@/pages/Report";
import { motion } from "framer-motion";

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
  infoTooltip?: string;
}

export default function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
  delay = 0,
  noPadding,
  infoTooltip,
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={`bg-white rounded-2xl border border-gray-100 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div>
            <div className="flex items-center gap-1">
              {title && (
                <h3 className="text-[15px] font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              {infoTooltip && <InfoTooltip text={infoTooltip} />}
            </div>
            {subtitle && (
              <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? "" : "px-6 py-5"}>{children}</div>
    </motion.div>
  );
}
