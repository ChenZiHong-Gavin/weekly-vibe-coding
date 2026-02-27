import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPiDigits, findAllMatches, SearchResult } from "@/data/pi-service";
import { Loader2 } from "lucide-react";

const BirthdayFinder = () => {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    if (!y || !m || !d) return;
    
    setLoading(true);
    try {
      const digits = await fetchPiDigits(100000);
      const matches = findAllMatches(digits, y, m, d);
      setResults(matches);
      setSearched(true);
    } catch {
      setSearched(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const canSearch = year && month && day && !loading;
  const bestResult = results.length > 0 ? results[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="bg-card/60 backdrop-blur-md rounded-2xl p-8 border border-border box-glow-gold">
        <h2 className="text-2xl font-bold mb-2 gradient-text">🔍 生日在 π 的哪里？</h2>
        <p className="text-muted-foreground text-sm mb-6">
          输入你的生日，在圆周率前10万位中搜索所有可能的格式
        </p>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">年</label>
            <input
              type="number" min={1900} max={2030} placeholder="YYYY"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-3 text-foreground font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">月</label>
            <input
              type="number" min={1} max={12} placeholder="MM"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-3 text-foreground font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">日</label>
            <input
              type="number" min={1} max={31} placeholder="DD"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-3 text-foreground font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!canSearch}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 搜索中...</> : "开始搜索"}
        </button>

        <AnimatePresence>
          {searched && !loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              {bestResult ? (
                <div className="space-y-4">
                  {/* Best match */}
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm mb-1">最佳匹配 ({bestResult.format})</p>
                    <p className="text-4xl font-bold text-glow-gold font-mono text-primary">
                      第 {bestResult.position.toLocaleString()} 位
                    </p>
                    <div className="mt-3 bg-secondary/30 rounded-lg p-3 font-mono text-sm overflow-hidden">
                      <span className="text-muted-foreground">...{bestResult.before}</span>
                      <span className="pi-highlight text-base">{bestResult.match}</span>
                      <span className="text-muted-foreground">{bestResult.after}...</span>
                    </div>
                  </div>

                  {/* All matches */}
                  {results.length > 1 && (
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        找到 {results.length} 种格式匹配：
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {results.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs bg-secondary/20 rounded px-3 py-1.5"
                          >
                            <span className="text-accent font-mono">{r.format}</span>
                            <span className="text-muted-foreground font-mono">{r.query}</span>
                            <span className="text-primary font-bold">第 {r.position.toLocaleString()} 位</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  未在前10万位中找到完整匹配，你的生日藏得更深 ✨
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default BirthdayFinder;
