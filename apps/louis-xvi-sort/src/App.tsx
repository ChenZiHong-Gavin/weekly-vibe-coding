import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SortVisualizer from "./SortVisualizer";
import CodePanel from "./CodePanel";
import { generateSteps, generateRandomArray } from "./sortEngine";
import type { Bar, SortStep, SortSpeed } from "./types";
import { SPEED_MS } from "./types";
import { resumeAudio, playCompare, playBehead, playSafe, playComplete } from "./sounds";

const DEFAULT_SIZE = 12;

export default function App() {
  const [bars, setBars] = useState<Bar[]>(() => generateRandomArray(DEFAULT_SIZE));
  const [steps, setSteps] = useState<SortStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<SortSpeed>("normal");
  const [arraySize, setArraySize] = useState(DEFAULT_SIZE);
  const [message, setMessage] = useState("按下 ▶ 开始排序");
  const [highlightLine, setHighlightLine] = useState(-1);
  const [comparingIndices, setComparingIndices] = useState<[number, number] | undefined>();
  const [beheadingIndex, setBeheadingIndex] = useState<number | undefined>();
  const [soundEnabled, setSoundEnabled] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepsRef = useRef<SortStep[]>([]);
  const currentStepRef = useRef(-1);
  const isRunningRef = useRef(false);
  const speedRef = useRef(speed);

  const maxValue = useRef(100);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsRunning(false);
    isRunningRef.current = false;
    setCurrentStep(-1);
    currentStepRef.current = -1;
    setHighlightLine(-1);
    setComparingIndices(undefined);
    setBeheadingIndex(undefined);
    setMessage("按下 ▶ 开始排序");
  }, []);

  const generateNew = useCallback(() => {
    reset();
    const newBars = generateRandomArray(arraySize);
    setBars(newBars);
    maxValue.current = Math.max(...newBars.map((b) => b.value));
    setSteps([]);
  }, [arraySize, reset]);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const applyStep = useCallback((step: SortStep, totalSteps?: number) => {
    setBars(step.array);
    setHighlightLine(step.highlightLine);
    setMessage(step.message);
    setComparingIndices(step.comparing);
    setBeheadingIndex(step.beheading);

    // Sound effects
    if (soundEnabledRef.current) {
      if (step.beheading !== undefined) {
        playBehead();
      } else if (step.comparing) {
        playCompare();
      } else if (step.message.includes("安全通过")) {
        playSafe();
      }
      // Check if this is the last step (sort complete)
      if (totalSteps !== undefined && step.message.includes("排序完成")) {
        playComplete();
      }
    }
  }, []);

  const runStep = useCallback(() => {
    if (!isRunningRef.current) return;
    const nextIdx = currentStepRef.current + 1;
    if (nextIdx >= stepsRef.current.length) {
      setIsRunning(false);
      isRunningRef.current = false;
      return;
    }
    currentStepRef.current = nextIdx;
    setCurrentStep(nextIdx);
    applyStep(stepsRef.current[nextIdx], stepsRef.current.length);

    timerRef.current = setTimeout(runStep, SPEED_MS[speedRef.current]);
  }, [applyStep]);

  const start = useCallback(() => {
    if (isRunning) return;
    resumeAudio();
    let allSteps = steps;
    if (allSteps.length === 0) {
      allSteps = generateSteps(bars);
      stepsRef.current = allSteps;
      setSteps(allSteps);
      maxValue.current = Math.max(...bars.map((b) => b.value));
    }
    // If finished, restart
    if (currentStepRef.current >= allSteps.length - 1) {
      currentStepRef.current = -1;
      setCurrentStep(-1);
    }
    setIsRunning(true);
    isRunningRef.current = true;
    timerRef.current = setTimeout(runStep, SPEED_MS[speedRef.current]);
  }, [bars, isRunning, runStep, steps]);

  const pause = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsRunning(false);
    isRunningRef.current = false;
  }, []);

  const stepForward = useCallback(() => {
    if (isRunning) return;
    resumeAudio();
    let allSteps = steps;
    if (allSteps.length === 0) {
      allSteps = generateSteps(bars);
      stepsRef.current = allSteps;
      setSteps(allSteps);
      maxValue.current = Math.max(...bars.map((b) => b.value));
    }
    const nextIdx = currentStepRef.current + 1;
    if (nextIdx >= allSteps.length) return;
    currentStepRef.current = nextIdx;
    setCurrentStep(nextIdx);
    applyStep(allSteps[nextIdx], allSteps.length);
  }, [applyStep, bars, isRunning, steps]);

  const stepBackward = useCallback(() => {
    if (isRunning) return;
    if (steps.length === 0) return;
    const prevIdx = currentStepRef.current - 1;
    if (prevIdx < 0) return;
    currentStepRef.current = prevIdx;
    setCurrentStep(prevIdx);
    applyStep(steps[prevIdx], steps.length);
  }, [applyStep, isRunning, steps]);

  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0e17]">
      {/* ===== Header ===== */}
      <header className="py-5 px-8 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <motion.span
            className="text-5xl"
            animate={{ rotate: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            👑
          </motion.span>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              路易十六排序
              <span className="text-[#d4a574] ml-3 text-lg font-normal">
                Louis XVI Sort
              </span>
            </h1>
            <p className="text-base text-gray-500 mt-1">
              "前面比后面大？砍头！"
            </p>
          </div>
        </div>

        {/* Speed & Size controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-base text-gray-500">数量</span>
            <input
              type="range"
              min={5}
              max={25}
              value={arraySize}
              onChange={(e) => setArraySize(Number(e.target.value))}
              onMouseUp={generateNew}
              onTouchEnd={generateNew}
              className="w-28 accent-[#d4a574] h-2"
              disabled={isRunning}
            />
            <span className="text-base text-[#d4a574] tabular-nums w-8 font-bold">
              {arraySize}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base text-gray-500">速度</span>
            {(["slow", "normal", "fast"] as SortSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-4 py-2 text-base rounded-lg transition-all ${
                  speed === s
                    ? "bg-[#d4a574] text-[#0f0e17] font-bold"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {s === "slow" ? "🐌" : s === "normal" ? "🚶" : "⚡"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-4 py-2 text-base rounded-lg transition-all ${
              soundEnabled
                ? "bg-white/10 text-white"
                : "bg-white/5 text-gray-500"
            }`}
            title={soundEnabled ? "关闭音效" : "开启音效"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* Left: Visualization */}
        <div className="flex-1 flex flex-col p-6">
          {/* Algorithm Description - above animation */}
          <div className="mb-4 flex justify-center">
            <p className="text-xl text-gray-200 leading-relaxed text-center max-w-3xl">
              <strong className="text-[#d4a574] text-2xl">路易十六排序：</strong>
              从后向前遍历，如果前面的元素比后面的大，就"砍掉"前面的头——将前面的值降到和后面一样。如同法国大革命，高人一等者必被铡刀削平。
            </p>
          </div>

          {/* Status message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={message}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center mb-4 h-10 flex items-center justify-center"
            >
              <span className="text-lg text-[#d4a574] font-medium tracking-wide">
                {message}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Bars */}
          <div className="flex-1 flex items-end justify-center bg-[#1a1a2e]/50 rounded-2xl border border-white/5 p-4 min-h-[320px]">
            <SortVisualizer
              bars={bars}
              maxValue={maxValue.current}
              comparingIndices={comparingIndices}
              beheadingIndex={beheadingIndex}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #d4a574, #e63946)",
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1.5">
            <span>步骤 {Math.max(0, currentStep + 1)} / {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Right: Code panel */}
        <div className="lg:w-[420px] border-l border-white/5 bg-[#13121f] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base text-[#d4a574] font-bold">📜 伪代码</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="bg-[#0f0e17] rounded-xl p-5 border border-white/5 flex-1">
            <CodePanel highlightLine={highlightLine} />
          </div>

          {/* Legend */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { color: "#4a90d9", label: "默认" },
              { color: "#8b5cf6", label: "当前扫描" },
              { color: "#f59e0b", label: "正在比较" },
              { color: "#e63946", label: "砍头！" },
              { color: "#10b981", label: "已排序" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Footer Controls ===== */}
      <footer className="py-6 px-8 border-t border-white/5 bg-[#13121f]/50">
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={generateNew}
            disabled={isRunning}
            className="px-7 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-lg font-medium transition-all disabled:opacity-30"
          >
            🎲 随机
          </button>
          <button
            onClick={stepBackward}
            disabled={isRunning || currentStep <= 0}
            className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xl transition-all disabled:opacity-30"
          >
            ⏮
          </button>
          {isRunning ? (
            <button
              onClick={pause}
              className="px-10 py-4 bg-[#e63946] hover:bg-[#e63946]/80 text-white rounded-xl text-xl font-bold transition-all"
            >
              ⏸ 暂停
            </button>
          ) : (
            <button
              onClick={start}
              className="px-10 py-4 bg-[#d4a574] hover:bg-[#d4a574]/80 text-[#0f0e17] rounded-xl text-xl font-bold transition-all"
            >
              ▶ {steps.length > 0 && currentStep >= steps.length - 1 ? "重新开始" : "开始"}
            </button>
          )}
          <button
            onClick={stepForward}
            disabled={isRunning || (steps.length > 0 && currentStep >= steps.length - 1)}
            className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xl transition-all disabled:opacity-30"
          >
            ⏭
          </button>
          <button
            onClick={() => { reset(); generateNew(); }}
            className="px-7 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-lg font-medium transition-all"
          >
            🔄 重置
          </button>
        </div>
      </footer>
    </div>
  );
}
