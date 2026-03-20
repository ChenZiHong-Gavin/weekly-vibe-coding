// ============================
// SpeedRun — 极速模式
// ============================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { KeyHistory } from '@/components/KeyHistory';
import { ScorePopup, showScorePopup } from '@/components/ScorePopup';
import { useVimEngine } from '@/hooks/useVimEngine';
import { Sound } from '@/engine/SoundEngine';
import type { Cursor, KeyResult, SpeedRunState } from '@/types';

// ---- 极速模式的代码素材 ----
const CODE_SAMPLES: string[][] = [
  [
    'function fibonacci(n) {',
    '  if (n <= 1) return n;',
    '  let a = 0, b = 1;',
    '  for (let i = 2; i <= n; i++) {',
    '    const temp = a + b;',
    '    a = b;',
    '    b = temp;',
    '  }',
    '  return b;',
    '}',
    '',
    'function quickSort(arr) {',
    '  if (arr.length <= 1) return arr;',
    '  const pivot = arr[0];',
    '  const left = arr.filter(x => x < pivot);',
    '  const right = arr.filter(x => x > pivot);',
    '  return [...quickSort(left), pivot, ...quickSort(right)];',
    '}',
    '',
    'const result = fibonacci(10);',
    'console.log("Result:", result);',
  ],
  [
    'class EventEmitter {',
    '  constructor() {',
    '    this.listeners = {};',
    '  }',
    '',
    '  on(event, callback) {',
    '    if (!this.listeners[event]) {',
    '      this.listeners[event] = [];',
    '    }',
    '    this.listeners[event].push(callback);',
    '    return this;',
    '  }',
    '',
    '  emit(event, ...args) {',
    '    const handlers = this.listeners[event];',
    '    if (handlers) {',
    '      handlers.forEach(fn => fn(...args));',
    '    }',
    '    return this;',
    '  }',
    '}',
  ],
  [
    'import { useState, useEffect } from "react";',
    '',
    'function useDebounce(value, delay) {',
    '  const [debounced, setDebounced] = useState(value);',
    '',
    '  useEffect(() => {',
    '    const timer = setTimeout(() => {',
    '      setDebounced(value);',
    '    }, delay);',
    '',
    '    return () => clearTimeout(timer);',
    '  }, [value, delay]);',
    '',
    '  return debounced;',
    '}',
    '',
    'export function SearchBox({ onSearch }) {',
    '  const [query, setQuery] = useState("");',
    '  const debouncedQuery = useDebounce(query, 300);',
    '',
    '  useEffect(() => {',
    '    if (debouncedQuery) {',
    '      onSearch(debouncedQuery);',
    '    }',
    '  }, [debouncedQuery, onSearch]);',
    '',
    '  return (',
    '    <input',
    '      value={query}',
    '      onChange={e => setQuery(e.target.value)}',
    '      placeholder="Search..."',
    '    />',
    '  );',
    '}',
  ],
];

/** 生成随机目标位置 */
function generateTarget(lines: string[], currentCursor: Cursor): { position: Cursor; label: string } {
  const validPositions: { pos: Cursor; label: string }[] = [];

  for (let line = 0; line < lines.length; line++) {
    const ln = lines[line];
    if (ln.trim() === '') continue;
    // 找到行中有意义的位置（单词开头）
    const wordStarts = [];
    for (let col = 0; col < ln.length; col++) {
      if (/\w/.test(ln[col]) && (col === 0 || !/\w/.test(ln[col - 1]))) {
        wordStarts.push(col);
      }
    }
    for (const col of wordStarts) {
      // 不要太靠近当前光标
      const dist = Math.abs(line - currentCursor.line) + Math.abs(col - currentCursor.col);
      if (dist >= 3) {
        // 提取单词作为 label
        let end = col;
        while (end < ln.length && /\w/.test(ln[end])) end++;
        validPositions.push({
          pos: { line, col },
          label: ln.slice(col, end),
        });
      }
    }
  }

  if (validPositions.length === 0) {
    return { position: { line: 0, col: 0 }, label: '?' };
  }

  const chosen = validPositions[Math.floor(Math.random() * validPositions.length)];
  return { position: chosen.pos, label: chosen.label };
}

/** 计算两点之间的最优移动数（简化估算） */
function estimateOptimalMoves(from: Cursor, to: Cursor, lines: string[]): number {
  const lineDiff = Math.abs(to.line - from.line);
  const colDiff = Math.abs(to.col - from.col);

  // 如果同行，可以用 w/b 跳
  if (lineDiff === 0) {
    // 粗略估计：每个 w/b 跳约 5-8 列
    return Math.max(1, Math.ceil(colDiff / 6));
  }

  // 不同行：j/k + w/b
  const verticalMoves = Math.min(lineDiff, 3); // gg/G/{/} 可以很快
  const horizontalMoves = Math.max(1, Math.ceil(colDiff / 6));
  return verticalMoves + horizontalMoves;
}

// ---- 主组件 ----

const GAME_DURATION = 60;

interface SpeedRunProps {
  onBack: () => void;
}

export const SpeedRun: React.FC<SpeedRunProps> = ({ onBack }) => {
  const codeRef = useRef(CODE_SAMPLES[Math.floor(Math.random() * CODE_SAMPLES.length)]);

  const [gameState, setGameState] = useState<SpeedRunState>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: GAME_DURATION,
    totalMoves: 0,
    targetsHit: 0,
    level: 1,
    isOnFire: false,
    currentTarget: null,
    isPaused: false,
  });

  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spawnTarget = useCallback((cursor: Cursor) => {
    const { position, label } = generateTarget(codeRef.current, cursor);
    const optimalMoves = estimateOptimalMoves(cursor, position, codeRef.current);
    setGameState(prev => ({
      ...prev,
      currentTarget: { position, label, optimalMoves },
    }));
  }, []);

  const onKey = useCallback((result: KeyResult, _key: string) => {
    if (!result.valid || !result.executedCommand) return;
    const gs = gameStateRef.current;
    if (!gs.currentTarget || gs.isPaused) return;

    const newCursor = result.newState.cursor;
    const target = gs.currentTarget;

    setGameState(prev => ({ ...prev, totalMoves: prev.totalMoves + 1 }));

    // 检查是否到达目标
    if (newCursor.line === target.position.line && newCursor.col === target.position.col) {
      const movesUsed = gs.totalMoves + 1;
      const isPerfect = movesUsed <= target.optimalMoves + 1;
      const newCombo = gs.combo + 1;
      const isOnFire = newCombo >= 3;

      // 计分
      let points = 10;
      if (isPerfect) points += 15;
      if (isOnFire) points *= 2;
      points += Math.min(newCombo * 5, 30);

      // 音效 & 视觉
      if (isPerfect) {
        Sound.perfect();
        showScorePopup('PERFECT!', 'text-terminal-amber');
        setTimeout(() => showScorePopup(`+${points}`, 'text-terminal-green'), 200);
      } else {
        Sound.hit();
        showScorePopup(`+${points}`, 'text-terminal-green');
      }

      if (isOnFire && !gs.isOnFire) {
        Sound.onFire();
        showScorePopup('🔥 ON FIRE!', 'text-terminal-red');
      } else if (newCombo > 1) {
        Sound.combo(newCombo);
      }

      setGameState(prev => ({
        ...prev,
        score: prev.score + points,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        targetsHit: prev.targetsHit + 1,
        isOnFire,
        totalMoves: 0, // 重置单次目标的移动计数
      }));

      // 生成新目标
      spawnTarget(newCursor);
    }
  }, [spawnTarget]);

  const {
    state: editorState,
    isShaking,
    commandHistory,
    reset: resetEditor,
  } = useVimEngine({
    initialLines: codeRef.current,
    onKey,
    enabled: isStarted && !isGameOver && !gameState.isPaused,
  });

  // 游戏计时器
  useEffect(() => {
    if (isStarted && !isGameOver && !gameState.isPaused) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            setIsGameOver(true);
            Sound.levelComplete();
            return { ...prev, timeLeft: 0 };
          }
          if (prev.timeLeft <= 10) {
            Sound.warning();
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isGameOver, gameState.isPaused]);

  const startGame = useCallback(() => {
    codeRef.current = CODE_SAMPLES[Math.floor(Math.random() * CODE_SAMPLES.length)];
    resetEditor(codeRef.current);
    setGameState({
      score: 0,
      combo: 0,
      maxCombo: 0,
      timeLeft: GAME_DURATION,
      totalMoves: 0,
      targetsHit: 0,
      level: 1,
      isOnFire: false,
      currentTarget: null,
      isPaused: false,
    });
    setIsStarted(true);
    setIsGameOver(false);
    // 延迟一帧再生成目标
    setTimeout(() => {
      spawnTarget({ line: 0, col: 0 });
    }, 100);
  }, [resetEditor, spawnTarget]);

  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      <ScorePopup />

      {/* 顶部信息栏 */}
      <div className="flex-shrink-0 border-b border-terminal-border">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={onBack}
            className="text-terminal-dim hover:text-terminal-text transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-terminal-green font-bold text-lg tracking-wider">
            ⚡ SPEED RUN
          </h1>
          <div className="w-16" /> {/* spacer */}
        </div>

        {/* 游戏数据 */}
        {isStarted && (
          <div className="flex items-center justify-center gap-6 px-4 py-2 bg-terminal-surface/50">
            {/* 得分 */}
            <div className="text-center">
              <div className="text-xs text-terminal-dim">SCORE</div>
              <div className="text-2xl font-bold text-terminal-green tabular-nums">{gameState.score}</div>
            </div>

            {/* 时间 */}
            <div className="text-center">
              <div className="text-xs text-terminal-dim">TIME</div>
              <div className={`text-2xl font-bold tabular-nums ${
                gameState.timeLeft <= 10 ? 'text-terminal-red animate-pulse' : 'text-terminal-blue'
              }`}>
                {gameState.timeLeft}s
              </div>
            </div>

            {/* 连击 */}
            <div className="text-center">
              <div className="text-xs text-terminal-dim">COMBO</div>
              <div className={`text-2xl font-bold tabular-nums ${
                gameState.isOnFire ? 'text-terminal-red' : gameState.combo > 0 ? 'text-terminal-amber' : 'text-terminal-dim'
              }`}>
                {gameState.combo}x
                {gameState.isOnFire && <span className="ml-1 text-sm">🔥</span>}
              </div>
            </div>

            {/* 命中 */}
            <div className="text-center">
              <div className="text-xs text-terminal-dim">HITS</div>
              <div className="text-2xl font-bold text-terminal-cyan tabular-nums">{gameState.targetsHit}</div>
            </div>
          </div>
        )}
      </div>

      {/* 目标提示 */}
      {isStarted && !isGameOver && gameState.currentTarget && (
        <div className="flex-shrink-0 px-4 py-2 bg-terminal-amber/5 border-b border-terminal-amber/20">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-terminal-amber">🎯 Target:</span>
            <code className="px-2 py-0.5 bg-terminal-amber/10 rounded text-terminal-amber font-bold">
              {gameState.currentTarget.label}
            </code>
            <span className="text-terminal-dim">
              at line {gameState.currentTarget.position.line + 1}, col {gameState.currentTarget.position.col + 1}
            </span>
          </div>
        </div>
      )}

      {/* 编辑器区域 */}
      <div className="flex-1 relative overflow-hidden">
        <CodeEditor
          state={editorState}
          targetPositions={gameState.currentTarget ? [gameState.currentTarget.position] : []}
          isShaking={isShaking}
        />

        {/* ON FIRE 边框效果 */}
        {gameState.isOnFire && (
          <div className="absolute inset-0 pointer-events-none border-2 border-terminal-red/40 rounded animate-glow-pulse" />
        )}

        {/* 开始画面 */}
        {!isStarted && (
          <div className="absolute inset-0 bg-terminal-bg/95 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <h2 className="text-4xl font-bold text-terminal-green mb-4">⚡ Speed Run</h2>
            <p className="text-terminal-dim mb-2">Navigate to targets as fast as possible!</p>
            <p className="text-terminal-dim mb-8 text-sm">Use Vim commands to reach highlighted targets. Faster = more points.</p>

            <div className="flex gap-2 mb-8 text-sm text-terminal-dim">
              {['h', 'j', 'k', 'l', 'w', 'b', 'e', 'f', '/', 'gg', 'G'].map(k => (
                <kbd key={k} className="px-2 py-1 bg-terminal-surface rounded border border-terminal-border text-terminal-green font-mono">
                  {k}
                </kbd>
              ))}
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3 bg-terminal-green text-terminal-bg font-bold rounded-lg hover:bg-terminal-green/90 transition-colors text-lg"
            >
              Start Game
            </button>
            <p className="mt-3 text-terminal-dim text-xs">60 seconds. Go!</p>
          </div>
        )}

        {/* 游戏结束画面 */}
        {isGameOver && (
          <div className="absolute inset-0 bg-terminal-bg/95 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fade-in">
            <h2 className="text-3xl font-bold text-terminal-text mb-6">Game Over!</h2>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
              <div className="text-right text-terminal-dim">Score</div>
              <div className="text-terminal-green font-bold text-2xl">{gameState.score}</div>

              <div className="text-right text-terminal-dim">Targets Hit</div>
              <div className="text-terminal-cyan font-bold">{gameState.targetsHit}</div>

              <div className="text-right text-terminal-dim">Max Combo</div>
              <div className="text-terminal-amber font-bold">{gameState.maxCombo}x</div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={startGame}
                className="px-6 py-2 bg-terminal-green text-terminal-bg font-bold rounded-lg hover:bg-terminal-green/90 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-terminal-surface text-terminal-text border border-terminal-border rounded-lg hover:bg-terminal-border transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部按键历史 */}
      {isStarted && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-terminal-border bg-terminal-surface/30">
          <KeyHistory commands={commandHistory} />
        </div>
      )}
    </div>
  );
};
