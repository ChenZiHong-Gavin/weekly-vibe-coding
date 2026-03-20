// ============================
// Home — 主页
// ============================

import React from 'react';
import { useProgress } from '@/hooks/useProgress';
import { Particles } from '@/components/Particles';

interface HomeProps {
  onNavigate: (page: 'adventure' | 'speedrun' | 'challenge') => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { progress, getTitle } = useProgress();
  const title = getTitle();

  return (
    <div className="h-full flex flex-col items-center justify-center bg-terminal-bg p-6 relative overflow-hidden">
      {/* Background effects */}
      <Particles />
      <div className="pointer-events-none fixed inset-0 z-50 crt-overlay" />

      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-3 tracking-tight">
          <span className="text-terminal-green glow-text">Vim</span>
          <span className="text-terminal-text ml-2">Chaser</span>
        </h1>
        <p className="text-terminal-dim text-sm md:text-base tracking-wide">
          Chase the cursor. Master the keys.
        </p>
      </div>

      {/* 玩家信息 */}
      <div className="mb-8 text-center">
        <div className="text-2xl mb-1">{title.emoji}</div>
        <div className="text-terminal-amber font-bold text-sm">{title.title}</div>
        <div className="text-terminal-dim text-xs mt-1">{progress.xp} XP</div>
      </div>

      {/* 模式选择 */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* Adventure */}
        <button
          onClick={() => onNavigate('adventure')}
          className="group relative p-5 bg-terminal-surface border border-terminal-border rounded-xl hover:border-terminal-green/50 hover:bg-terminal-green/5 transition-all text-left hover:shadow-lg hover:shadow-terminal-green/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-terminal-text group-hover:text-terminal-green transition-colors">
                🎯 Adventure
              </h2>
              <p className="text-terminal-dim text-sm mt-1">
                Story-driven levels to learn Vim step by step
              </p>
            </div>
            <span className="text-terminal-dim group-hover:text-terminal-green transition-colors text-xl">→</span>
          </div>
          <div className="mt-3 text-xs text-terminal-green/70">
            10 chapters · 63 levels · 120+ commands
          </div>
        </button>

        {/* Speed Run */}
        <button
          onClick={() => onNavigate('speedrun')}
          className="group relative p-5 bg-terminal-surface border border-terminal-border rounded-xl hover:border-terminal-amber/50 hover:bg-terminal-amber/5 transition-all text-left hover:shadow-lg hover:shadow-terminal-amber/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-terminal-text group-hover:text-terminal-amber transition-colors">
                ⚡ Speed Run
              </h2>
              <p className="text-terminal-dim text-sm mt-1">
                60 seconds. Chase targets. Get high scores.
              </p>
            </div>
            <span className="text-terminal-dim group-hover:text-terminal-amber transition-colors text-xl">→</span>
          </div>
          {progress.speedRunHighScores[1] ? (
            <div className="mt-3 text-xs text-terminal-amber">
              High Score: {progress.speedRunHighScores[1]}
            </div>
          ) : (
            <div className="mt-3 text-xs text-terminal-dim">No high score yet</div>
          )}
        </button>

        {/* Challenge */}
        <button
          onClick={() => onNavigate('challenge')}
          className="group relative p-5 bg-terminal-surface border border-terminal-border rounded-xl hover:border-terminal-purple/50 hover:bg-terminal-purple/5 transition-all text-left hover:shadow-lg hover:shadow-terminal-purple/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-terminal-text group-hover:text-terminal-purple transition-colors">
                🏌️ Code Golf
              </h2>
              <p className="text-terminal-dim text-sm mt-1">
                Transform code in fewest keystrokes. Beat par!
              </p>
            </div>
            <span className="text-terminal-dim group-hover:text-terminal-purple transition-colors text-xl">→</span>
          </div>
          <div className="mt-3 text-xs text-terminal-dim">
            9 challenges · Easy to Expert
          </div>
        </button>
      </div>

      {/* 底部统计 */}
      <div className="mt-10 flex gap-8 text-center">
        <div>
          <div className="text-terminal-green font-bold text-lg tabular-nums">{progress.totalKeystrokes}</div>
          <div className="text-terminal-dim text-xs">Keystrokes</div>
        </div>
        <div>
          <div className="text-terminal-cyan font-bold text-lg tabular-nums">{Object.keys(progress.levelResults).length}</div>
          <div className="text-terminal-dim text-xs">Levels Cleared</div>
        </div>
        <div>
          <div className="text-terminal-amber font-bold text-lg tabular-nums">{Object.keys(progress.commandUsage).length}</div>
          <div className="text-terminal-dim text-xs">Commands Learned</div>
        </div>
      </div>

      {/* 键盘提示 */}
      <div className="mt-6 text-terminal-dim/40 text-xs">
        Best experienced with a physical keyboard
      </div>
    </div>
  );
};
