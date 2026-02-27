import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPiDigits, calculateLoveScore, LoveResult } from "@/data/pi-service";
import { Loader2 } from "lucide-react";

const LoveMatch = () => {
  const [p1, setP1] = useState({ year: "", month: "", day: "" });
  const [p2, setP2] = useState({ year: "", month: "", day: "" });
  const [result, setResult] = useState<LoveResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const y1 = parseInt(p1.year), m1 = parseInt(p1.month), d1 = parseInt(p1.day);
    const y2 = parseInt(p2.year), m2 = parseInt(p2.month), d2 = parseInt(p2.day);
    if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return;

    setLoading(true);
    try {
      const digits = await fetchPiDigits(100000);
      const score = calculateLoveScore(digits, y1, m1, d1, y2, m2, d2);
      setResult(score);
      setSearched(true);
    } catch {
      setSearched(true);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const canSearch = p1.year && p1.month && p1.day && p2.year && p2.month && p2.day && !loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="bg-card/60 backdrop-blur-md rounded-2xl p-8 border border-border box-glow-purple">
        <h2 className="text-2xl font-bold mb-2 gradient-text">💞 圆周率姻缘测试</h2>
        <p className="text-muted-foreground text-sm mb-6">
          基于多维度匹配算法，分析两人生日在 π 中的关联度
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-accent font-medium mb-2">👤 第一个人</p>
            <div className="flex gap-2">
              <input
                type="number" min={1900} max={2030} placeholder="年"
                value={p1.year}
                onChange={(e) => setP1(prev => ({ ...prev, year: e.target.value }))}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-2 py-2.5 text-foreground font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
              <input
                type="number" min={1} max={12} placeholder="月"
                value={p1.month}
                onChange={(e) => setP1(prev => ({ ...prev, month: e.target.value }))}
                className="w-16 bg-secondary/50 border border-border rounded-lg px-2 py-2.5 text-foreground font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
              <input
                type="number" min={1} max={31} placeholder="日"
                value={p1.day}
                onChange={(e) => setP1(prev => ({ ...prev, day: e.target.value }))}
                className="w-16 bg-secondary/50 border border-border rounded-lg px-2 py-2.5 text-foreground font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-accent font-medium mb-2">👤 第二个人</p>
            <div className="flex gap-2">
              <input
                type="number" min={1900} max={2030} placeholder="年"
                value={p2.year}
                onChange={(e) => setP2(prev => ({ ...prev, year: e.target.value }))}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-2 py-2.5 text-foreground font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
              <input
                type="number" min={1} max={12} placeholder="月"
                value={p2.month}
                onChange={(e) => setP2(prev => ({ ...prev, month: e.target.value }))}
                className="w-16 bg-secondary/50 border border-border rounded-lg px-2 py-2.5 text-foreground font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
              <input
                type="number" min={1} max={31} placeholder="日"
                value={p2.day}
                onChange={(e) => setP2(prev => ({ ...prev, day: e.target.value }))}
                className="w-16 bg-secondary/50 border border-border rounded-lg px-2 py-2.5 text-foreground font-mono text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!canSearch}
          className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 计算中...</> : "测姻缘"}
        </button>

        <AnimatePresence>
          {searched && !loading && result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <div className="text-center space-y-3">
                <div className="text-5xl mb-1">{result.emoji}</div>
                <p className="text-2xl font-bold text-glow-purple text-accent">{result.level}</p>

                {/* Score bar */}
                <div className="relative w-full h-3 bg-secondary/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, hsl(280 60% 65%), hsl(38 90% 55%))`,
                    }}
                  />
                </div>
                <p className="text-3xl font-bold font-mono gradient-text">{result.score} 分</p>

                <p className="text-foreground/80 text-sm italic">"{result.description}"</p>

                {/* Details */}
                {result.details.bestMatch1 && result.details.bestMatch2 && (
                  <div className="mt-4 bg-secondary/20 rounded-lg p-4 text-left space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">匹配详情</p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-secondary/30 rounded p-2">
                        <span className="text-primary">{result.details.bestMatch1.query}</span>
                        <span className="text-muted-foreground"> ({result.details.bestMatch1.format})</span>
                        <br />
                        <span className="text-foreground">第 {result.details.bestMatch1.position.toLocaleString()} 位</span>
                      </div>
                      <div className="bg-secondary/30 rounded p-2">
                        <span className="text-accent">{result.details.bestMatch2.query}</span>
                        <span className="text-muted-foreground"> ({result.details.bestMatch2.format})</span>
                        <br />
                        <span className="text-foreground">第 {result.details.bestMatch2.position.toLocaleString()} 位</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                      <span>距离分: {result.details.distanceScore}</span>
                      <span>格式分: {result.details.formatBonus}</span>
                      <span>亲密分: {result.details.proximityBonus}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LoveMatch;
