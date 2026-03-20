// ============================
// Adventure — 冒险模式
// ============================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { KeyHistory } from '@/components/KeyHistory';
import { ScorePopup, showScorePopup } from '@/components/ScorePopup';
import { useVimEngine } from '@/hooks/useVimEngine';
import { Sound } from '@/engine/SoundEngine';
import { CHAPTERS, getLevelById } from '@/data';
import type { Level, Chapter, KeyResult, Cursor } from '@/types';

interface AdventureProps {
  onBack: () => void;
}

export const Adventure: React.FC<AdventureProps> = ({ onBack }) => {
  const [currentChapter, setCurrentChapter] = useState<Chapter>(CHAPTERS[0]);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [levelComplete, setLevelComplete] = useState(false);
  const [stars, setStars] = useState(0);
  const [showNewCommand, setShowNewCommand] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintTimer, setHintTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const lastActionRef = useRef(Date.now());

  const level = currentChapter.levels[currentLevelIdx];

  const targetPositions: Cursor[] = level?.goals
    .filter(g => g.type === 'cursor' && g.position)
    .map(g => g.position!) ?? [];

  const checkGoals = useCallback((result: KeyResult) => {
    if (!level || levelComplete) return;
    if (!result.valid || !result.executedCommand) return;

    lastActionRef.current = Date.now();
    setShowHint(false);

    const state = result.newState;
    const allMet = level.goals.every(goal => {
      switch (goal.type) {
        case 'cursor':
          return goal.position &&
            state.cursor.line === goal.position.line &&
            state.cursor.col === goal.position.col;
        case 'text':
          return goal.lineIndex !== undefined &&
            goal.expectedText !== undefined &&
            state.lines[goal.lineIndex] === goal.expectedText;
        case 'lines':
          return goal.expectedLines !== undefined &&
            JSON.stringify(state.lines) === JSON.stringify(goal.expectedLines);
        case 'mode':
          return state.mode === goal.expectedMode;
        case 'custom':
          return goal.validate?.(state) ?? false;
        default:
          return false;
      }
    });

    if (allMet) {
      setLevelComplete(true);
      Sound.levelComplete();
      showScorePopup('✅ CLEAR!', 'text-terminal-green');
    }
  }, [level, levelComplete]);

  const {
    state: editorState,
    moveCount,
    isShaking,
    commandHistory,
    reset: resetEditor,
  } = useVimEngine({
    initialLines: level?.initialCode ?? [''],
    initialCursor: level?.initialCursor,
    initialMode: level?.initialMode,
    onKey: checkGoals,
    enabled: !showLevelSelect && !levelComplete,
  });

  // 计算星级
  useEffect(() => {
    if (levelComplete && level) {
      const [s1, s2, s3] = level.starThresholds;
      if (moveCount <= s3) setStars(3);
      else if (moveCount <= s2) setStars(2);
      else if (moveCount <= s1) setStars(1);
      else setStars(1); // 完成就至少 1 星
    }
  }, [levelComplete, moveCount, level]);

  // 5 秒无操作显示提示
  useEffect(() => {
    if (showLevelSelect || levelComplete) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActionRef.current > 5000) {
        setShowHint(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showLevelSelect, levelComplete]);

  // 新命令展示
  useEffect(() => {
    if (!showLevelSelect && level && level.newCommands.length > 0) {
      setShowNewCommand(true);
    }
  }, [showLevelSelect, level]);

  const startLevel = useCallback((chapterIdx: number, levelIdx: number) => {
    const chapter = CHAPTERS[chapterIdx];
    if (!chapter) return;
    const lv = chapter.levels[levelIdx];
    if (!lv) return;
    setCurrentChapter(chapter);
    setCurrentLevelIdx(levelIdx);
    setShowLevelSelect(false);
    setLevelComplete(false);
    setStars(0);
    setShowHint(false);
    setShowNewCommand(false);
    lastActionRef.current = Date.now();
    resetEditor(lv.initialCode, lv.initialCursor, lv.initialMode);
  }, [resetEditor]);

  const nextLevel = useCallback(() => {
    if (currentLevelIdx < currentChapter.levels.length - 1) {
      startLevel(CHAPTERS.indexOf(currentChapter), currentLevelIdx + 1);
    } else {
      // 章节完成，回到选关
      setShowLevelSelect(true);
    }
  }, [currentChapter, currentLevelIdx, startLevel]);

  const retryLevel = useCallback(() => {
    if (!level) return;
    setLevelComplete(false);
    setStars(0);
    setShowHint(false);
    lastActionRef.current = Date.now();
    resetEditor(level.initialCode, level.initialCursor, level.initialMode);
  }, [level, resetEditor]);

  // ---- 关卡选择界面 ----
  if (showLevelSelect) {
    return (
      <div className="h-full flex flex-col bg-terminal-bg">
        {/* 标题栏 */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <button onClick={onBack} className="text-terminal-dim hover:text-terminal-text transition-colors text-sm">
            ← Back
          </button>
          <h1 className="text-terminal-green font-bold text-lg">🎯 Adventure Mode</h1>
          <div className="w-16" />
        </div>

        {/* 章节列表 */}
        <div className="flex-1 overflow-auto p-6">
          {CHAPTERS.map((chapter, chIdx) => (
            <div key={chapter.id} className="mb-8">
              <h2 className="text-xl font-bold text-terminal-text mb-1">
                Ch.{chapter.id} — {chapter.title}
                <span className="text-terminal-dim text-sm font-normal ml-2">{chapter.subtitle}</span>
              </h2>
              <p className="text-terminal-dim text-sm mb-4">{chapter.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {chapter.levels.map((lv, lvIdx) => (
                  <button
                    key={lv.id}
                    onClick={() => startLevel(chIdx, lvIdx)}
                    className="p-3 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-green/50 hover:bg-terminal-green/5 transition-all text-left group"
                  >
                    <div className="text-xs text-terminal-dim mb-1">
                      {chapter.id}-{lv.index}
                    </div>
                    <div className="text-sm font-bold text-terminal-text group-hover:text-terminal-green transition-colors">
                      {lv.title}
                    </div>
                    <div className="text-xs text-terminal-dim mt-1 truncate">
                      {lv.subtitle}
                    </div>
                    {lv.newCommands.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {lv.newCommands.map(cmd => (
                          <kbd key={cmd.keys} className="px-1 py-0.5 bg-terminal-amber/10 text-terminal-amber text-xs rounded border border-terminal-amber/20">
                            {cmd.keys}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- 游戏界面 ----
  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      <ScorePopup />

      {/* 顶部信息 */}
      <div className="flex-shrink-0 border-b border-terminal-border">
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => setShowLevelSelect(true)}
            className="text-terminal-dim hover:text-terminal-text transition-colors text-sm"
          >
            ← Levels
          </button>
          <div className="text-center">
            <span className="text-terminal-dim text-xs">Ch.{currentChapter.id}</span>
            <span className="text-terminal-text font-bold text-sm ml-2">{level?.title}</span>
          </div>
          <div className="text-terminal-dim text-sm tabular-nums">
            Moves: <span className="text-terminal-green font-bold">{moveCount}</span>
          </div>
        </div>

        {/* 任务描述 */}
        <div className="px-4 py-2 bg-terminal-surface/30 border-t border-terminal-border">
          <div className="text-sm">
            <span className="text-terminal-amber mr-2">🎯</span>
            <span className="text-terminal-text">{level?.task}</span>
          </div>
          {/* 星级标准 */}
          {level && (
            <div className="flex gap-3 mt-1 text-xs text-terminal-dim">
              <span>⭐ ≤{level.starThresholds[0]} moves</span>
              <span>⭐⭐ ≤{level.starThresholds[1]} moves</span>
              <span>⭐⭐⭐ ≤{level.starThresholds[2]} moves</span>
            </div>
          )}
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 relative overflow-hidden">
        <CodeEditor
          state={editorState}
          targetPositions={targetPositions}
          isShaking={isShaking}
        />

        {/* 新命令介绍卡片 */}
        {showNewCommand && level && level.newCommands.length > 0 && (
          <div className="absolute inset-0 bg-terminal-bg/90 backdrop-blur-sm flex items-center justify-center z-30 animate-fade-in">
            <div className="bg-terminal-surface border border-terminal-green/30 rounded-xl p-6 max-w-sm shadow-lg shadow-terminal-green/10">
              <h3 className="text-terminal-green font-bold text-lg mb-4">🆕 New Commands</h3>
              <div className="space-y-3 mb-6">
                {level.newCommands.map(cmd => (
                  <div key={cmd.keys} className="flex items-start gap-3">
                    <kbd className="px-3 py-1.5 bg-terminal-bg rounded-lg text-terminal-green font-mono font-bold text-lg border border-terminal-green/30 flex-shrink-0">
                      {cmd.keys}
                    </kbd>
                    <div>
                      <div className="text-terminal-text font-bold text-sm">{cmd.name}</div>
                      <div className="text-terminal-dim text-xs">{cmd.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowNewCommand(false)}
                className="w-full px-4 py-2 bg-terminal-green text-terminal-bg font-bold rounded-lg hover:bg-terminal-green/90 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* 提示 */}
        {showHint && level && !levelComplete && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-slide-up">
            <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg px-4 py-2 text-sm">
              <span className="text-terminal-amber mr-2">💡</span>
              <span className="text-terminal-amber/80">{level.hints[0]}</span>
            </div>
          </div>
        )}

        {/* 关卡完成 */}
        {levelComplete && (
          <div className="absolute inset-0 bg-terminal-bg/90 backdrop-blur-sm flex items-center justify-center z-30 animate-fade-in">
            <div className="text-center">
              <div className="text-5xl mb-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className={i < stars ? 'opacity-100' : 'opacity-20'}>⭐</span>
                ))}
              </div>
              <h2 className="text-2xl font-bold text-terminal-green mb-2">Level Clear!</h2>
              <p className="text-terminal-dim mb-1">Moves used: <span className="text-terminal-text font-bold">{moveCount}</span></p>
              <p className="text-terminal-dim text-sm mb-6">
                {stars === 3 ? '🏆 Perfect!' : stars === 2 ? '👍 Great job!' : 'Try again for more stars!'}
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={retryLevel}
                  className="px-5 py-2 bg-terminal-surface border border-terminal-border text-terminal-text rounded-lg hover:bg-terminal-border transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={nextLevel}
                  className="px-5 py-2 bg-terminal-green text-terminal-bg font-bold rounded-lg hover:bg-terminal-green/90 transition-colors"
                >
                  {currentLevelIdx < currentChapter.levels.length - 1 ? 'Next Level →' : 'Back to Levels'}
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
