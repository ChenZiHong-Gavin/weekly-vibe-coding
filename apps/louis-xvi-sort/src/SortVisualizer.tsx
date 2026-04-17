import { motion, AnimatePresence } from "framer-motion";
import type { Bar } from "./types";

interface Props {
  bars: Bar[];
  maxValue: number;
  comparingIndices?: [number, number];
  beheadingIndex?: number;
}

const STATE_COLORS: Record<string, string> = {
  default: "#4a90d9",
  comparing: "#f59e0b",
  beheaded: "#e63946",
  sorted: "#10b981",
  active: "#8b5cf6",
};

const STATE_SHADOWS: Record<string, string> = {
  default: "0 0 8px rgba(74, 144, 217, 0.3)",
  comparing: "0 0 20px rgba(245, 158, 11, 0.6)",
  beheaded: "0 0 30px rgba(230, 57, 70, 0.8)",
  sorted: "0 0 12px rgba(16, 185, 129, 0.4)",
  active: "0 0 15px rgba(139, 92, 246, 0.5)",
};

export default function SortVisualizer({
  bars,
  maxValue,
  beheadingIndex,
}: Props) {
  const barWidth = Math.max(20, Math.min(60, 800 / bars.length - 4));

  return (
    <div className="relative flex items-end justify-center gap-[3px] h-[420px] px-4">
      <AnimatePresence mode="popLayout">
        {bars.map((bar, index) => {
          const heightPercent = (bar.value / maxValue) * 100;
          const isBeheading = beheadingIndex === index;

          return (
            <motion.div
              key={bar.id}
              className="relative flex flex-col items-center"
              style={{ width: barWidth }}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Value label */}
              <motion.span
                className="text-xs font-bold mb-1 tabular-nums"
                style={{ color: STATE_COLORS[bar.state] }}
                animate={{
                  scale: isBeheading ? [1, 1.4, 1] : 1,
                  color: STATE_COLORS[bar.state],
                }}
                transition={{ duration: 0.3 }}
              >
                {bar.value}
              </motion.span>

              {/* Bar */}
              <motion.div
                className="w-full rounded-t-md relative overflow-hidden"
                animate={{
                  height: `${heightPercent * 3.5}px`,
                  backgroundColor: STATE_COLORS[bar.state],
                  boxShadow: STATE_SHADOWS[bar.state],
                }}
                transition={{
                  height: { type: "spring", stiffness: 200, damping: 20 },
                  backgroundColor: { duration: 0.3 },
                }}
              >
                {/* Guillotine slash effect */}
                {isBeheading && (
                  <motion.div
                    className="absolute inset-x-0 top-0"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "100%",
                      opacity: [0, 1, 0.5],
                    }}
                    transition={{ duration: 0.5 }}
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(230,57,70,0.9) 0%, rgba(230,57,70,0) 100%)",
                    }}
                  />
                )}

                {/* Shine effect */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                  }}
                />
              </motion.div>

              {/* Index label */}
              <span className="text-[10px] text-gray-500 mt-1 tabular-nums">
                {index}
              </span>

              {/* Guillotine blade animation */}
              {isBeheading && (
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 z-10"
                  initial={{ top: -40, opacity: 0 }}
                  animate={{ top: 10, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                >
                  <span className="text-2xl">⚔️</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
