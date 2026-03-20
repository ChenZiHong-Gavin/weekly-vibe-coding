// ============================
// Challenge — 挑战模式 (Code Golf)
// ============================
// 给定起始代码和目标代码，用最少按键完成编辑。

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { KeyHistory } from '@/components/KeyHistory';
import { ScorePopup, showScorePopup } from '@/components/ScorePopup';
import { useVimEngine } from '@/hooks/useVimEngine';
import { Sound } from '@/engine/SoundEngine';
import type { KeyResult } from '@/types';

// ---- 挑战题目 ----
interface Challenge {
  id: string;
  title: string;
  description: string;
  startCode: string[];
  goalCode: string[];
  par: number;        // "par" — 参考步数
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

const CHALLENGES: Challenge[] = [
  {
    id: 'cg-1',
    title: '缩进修复',
    description: '给两行代码加缩进',
    startCode: ['function hello() {', 'console.log("hi");', 'return true;', '}'],
    goalCode: ['function hello() {', '  console.log("hi");', '  return true;', '}'],
    par: 6,
    difficulty: 'easy',
  },
  {
    id: 'cg-2',
    title: '变量重命名',
    description: '把 "foo" 全部改成 "bar"',
    startCode: ['const foo = 1;', 'const x = foo + 2;', 'console.log(foo);'],
    goalCode: ['const bar = 1;', 'const x = bar + 2;', 'console.log(bar);'],
    par: 12,
    difficulty: 'easy',
  },
  {
    id: 'cg-3',
    title: '删除注释',
    description: '删除所有注释行',
    startCode: ['// config', 'const host = "localhost";', '// port', 'const port = 3000;', '// done'],
    goalCode: ['const host = "localhost";', 'const port = 3000;'],
    par: 6,
    difficulty: 'easy',
  },
  {
    id: 'cg-4',
    title: '参数调整',
    description: '交换函数参数顺序',
    startCode: ['function add(a, b) {', '  return a + b;', '}'],
    goalCode: ['function add(b, a) {', '  return a + b;', '}'],
    par: 10,
    difficulty: 'medium',
  },
  {
    id: 'cg-5',
    title: '箭头函数',
    description: '把普通函数改成箭头函数',
    startCode: ['function double(x) {', '  return x * 2;', '}'],
    goalCode: ['const double = (x) => x * 2;'],
    par: 20,
    difficulty: 'medium',
  },
  {
    id: 'cg-6',
    title: 'var → const',
    description: '把所有 var 替换为 const 并加分号',
    startCode: ['var a = 1', 'var b = 2', 'var c = 3', 'var d = 4', 'var e = 5'],
    goalCode: ['const a = 1;', 'const b = 2;', 'const c = 3;', 'const d = 4;', 'const e = 5;'],
    par: 14,
    difficulty: 'medium',
  },
  {
    id: 'cg-7',
    title: '字符串拼接 → 模板',
    description: '把字符串拼接改成模板字符串',
    startCode: ['const msg = "Hello " + name + "!";'],
    goalCode: ['const msg = `Hello ${name}!`;'],
    par: 18,
    difficulty: 'hard',
  },
  {
    id: 'cg-8',
    title: '代码重组',
    description: '调整代码结构',
    startCode: ['return result;', 'const result = a + b;', 'const a = 10;', 'const b = 20;'],
    goalCode: ['const a = 10;', 'const b = 20;', 'const result = a + b;', 'return result;'],
    par: 12,
    difficulty: 'hard',
  },
  {
    id: 'cg-9',
    title: '全面重构',
    description: '重构这段代码：改名 + 格式化 + 修复',
    startCode: [
      'var getUserData = function(id) {',
      'var result = fetch("/api/" + id)',
      'return result',
      '}',
    ],
    goalCode: [
      'const getUserData = async (id) => {',
      '  const result = await fetch(`/api/${id}`);',
      '  return result;',
      '};',
    ],
    par: 45,
    difficulty: 'expert',
  },
];

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-terminal-green',
  medium: 'text-terminal-amber',
  hard: 'text-terminal-red',
  expert: 'text-terminal-purple',
};

interface ChallengeProps {
  onBack: () => void;
}

export const ChallengeMode: React.FC<ChallengeProps> = ({ onBack }) => {
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [complete, setComplete] = useState(false);
  const [bestScores, setBestScores] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('vim-chaser-golf') || '{}'); } catch { return {}; }
  });

  const checkGoal = useCallback((result: KeyResult) => {
    if (!selected || complete) return;
    if (!result.valid) return;
    const currentLines = result.newState.lines;
    if (currentLines.length === selected.goalCode.length &&
        currentLines.every((l, i) => l === selected.goalCode[i]) &&
        result.newState.mode === 'normal') {
      setComplete(true);
      Sound.levelComplete();
      showScorePopup('✅ COMPLETE!', 'text-terminal-green');
    }
  }, [selected, complete]);

  const {
    state: editorState,
    moveCount,
    commandHistory,
    reset: resetEditor,
  } = useVimEngine({
    initialLines: selected?.startCode ?? [''],
    onKey: checkGoal,
    enabled: !!selected && !complete,
  });

  const startChallenge = useCallback((ch: Challenge) => {
    setSelected(ch);
    setComplete(false);
    resetEditor(ch.startCode);
  }, [resetEditor]);

  const retry = useCallback(() => {
    if (!selected) return;
    setComplete(false);
    resetEditor(selected.startCode);
  }, [selected, resetEditor]);

  // 保存最佳成绩
  useEffect(() => {
    if (complete && selected) {
      const prev = bestScores[selected.id] ?? Infinity;
      if (moveCount < prev) {
        const newScores = { ...bestScores, [selected.id]: moveCount };
        setBestScores(newScores);
        localStorage.setItem('vim-chaser-golf', JSON.stringify(newScores));
      }
    }
  }, [complete, selected, moveCount]);

  // ---- 选择列表 ----
  if (!selected) {
    return (
      <div className="h-full flex flex-col bg-terminal-bg">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <button onClick={onBack} className="text-terminal-dim hover:text-terminal-text transition-colors text-sm">← Back</button>
          <h1 className="text-terminal-amber font-bold text-lg">🏌️ Code Golf</h1>
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-auto p-6">
          <p className="text-terminal-dim text-sm mb-6 text-center">
            Transform the code using the fewest keystrokes possible. Beat par to prove your mastery!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {CHALLENGES.map(ch => {
              const best = bestScores[ch.id];
              const beatPar = best !== undefined && best <= ch.par;
              return (
                <button
                  key={ch.id}
                  onClick={() => startChallenge(ch)}
                  className="p-4 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-amber/50 hover:bg-terminal-amber/5 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase ${DIFF_COLORS[ch.difficulty]}`}>{ch.difficulty}</span>
                    <span className="text-xs text-terminal-dim">Par: {ch.par}</span>
                  </div>
                  <h3 className="font-bold text-terminal-text group-hover:text-terminal-amber transition-colors">{ch.title}</h3>
                  <p className="text-xs text-terminal-dim mt-1">{ch.description}</p>
                  {best !== undefined && (
                    <div className={`mt-2 text-xs font-bold ${beatPar ? 'text-terminal-green' : 'text-terminal-amber'}`}>
                      Best: {best} {beatPar ? '🏆' : ''} {best <= ch.par ? `(par ${ch.par})` : `(par ${ch.par}, -${best - ch.par} to go)`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---- 游戏界面 ----
  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      <ScorePopup />
      {/* 顶部 */}
      <div className="flex-shrink-0 border-b border-terminal-border">
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={() => setSelected(null)} className="text-terminal-dim hover:text-terminal-text transition-colors text-sm">← Challenges</button>
          <div className="text-center">
            <span className={`text-xs font-bold ${DIFF_COLORS[selected.difficulty]}`}>{selected.difficulty.toUpperCase()}</span>
            <span className="text-terminal-text font-bold text-sm ml-2">{selected.title}</span>
          </div>
          <div className="text-terminal-dim text-sm tabular-nums">
            Keys: <span className={`font-bold ${moveCount <= selected.par ? 'text-terminal-green' : 'text-terminal-amber'}`}>{moveCount}</span>
            <span className="text-terminal-dim/60 ml-1">/ par {selected.par}</span>
          </div>
        </div>
      </div>

      {/* 目标预览 */}
      <div className="flex-shrink-0 border-b border-terminal-border bg-terminal-surface/30 px-4 py-2">
        <details className="text-sm">
          <summary className="text-terminal-amber cursor-pointer text-xs">🎯 Goal (click to see target code)</summary>
          <pre className="mt-2 text-terminal-green/70 text-xs overflow-auto max-h-32">
            {selected.goalCode.join('\n')}
          </pre>
        </details>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 relative overflow-hidden">
        <CodeEditor state={editorState} />

        {/* 完成 */}
        {complete && (
          <div className="absolute inset-0 bg-terminal-bg/90 backdrop-blur-sm flex items-center justify-center z-30 animate-fade-in">
            <div className="text-center">
              <div className="text-5xl mb-4">
                {moveCount <= selected.par ? '🏆' : moveCount <= selected.par * 1.5 ? '⭐' : '✅'}
              </div>
              <h2 className="text-2xl font-bold text-terminal-green mb-2">Challenge Complete!</h2>
              <p className="text-terminal-dim mb-1">
                Keystrokes: <span className={`font-bold ${moveCount <= selected.par ? 'text-terminal-green' : 'text-terminal-amber'}`}>{moveCount}</span>
                <span className="text-terminal-dim/60 ml-2">(par: {selected.par})</span>
              </p>
              <p className="text-sm mb-6">
                {moveCount <= selected.par ? '🎉 Under par! Amazing!' :
                 moveCount <= selected.par * 1.5 ? '👍 Good job! Can you beat par?' :
                 'Try to reduce your keystrokes!'}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={retry} className="px-5 py-2 bg-terminal-surface border border-terminal-border text-terminal-text rounded-lg hover:bg-terminal-border transition-colors">
                  Retry
                </button>
                <button onClick={() => setSelected(null)} className="px-5 py-2 bg-terminal-amber text-terminal-bg font-bold rounded-lg hover:bg-terminal-amber/90 transition-colors">
                  More Challenges
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-terminal-border bg-terminal-surface/30">
        <KeyHistory commands={commandHistory} />
      </div>
    </div>
  );
};
