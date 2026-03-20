// ============================
// useProgress — 进度 & 统计管理
// ============================

import { useState, useCallback, useEffect } from 'react';
import type { PlayerProgress, LevelResult } from '@/types';
import { TITLES } from '@/types';

const STORAGE_KEY = 'vim-chaser-progress';

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    levelResults: {},
    speedRunHighScores: {},
    totalKeystrokes: 0,
    commandUsage: {},
    unlockedChapter: 1,
    xp: 0,
  };
}

function saveProgress(p: PlayerProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

export function useProgress() {
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);

  // 自动保存
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const recordLevel = useCallback((result: LevelResult) => {
    setProgress(prev => {
      const existing = prev.levelResults[result.levelId];
      // 只保留最好记录
      if (existing && existing.stars >= result.stars && existing.moves <= result.moves) {
        return prev;
      }
      const xpGain = result.stars * 20 + 10;
      return {
        ...prev,
        levelResults: { ...prev.levelResults, [result.levelId]: result },
        xp: prev.xp + xpGain,
      };
    });
  }, []);

  const recordSpeedRun = useCallback((level: number, score: number) => {
    setProgress(prev => {
      const existing = prev.speedRunHighScores[level] ?? 0;
      if (score <= existing) return prev;
      return {
        ...prev,
        speedRunHighScores: { ...prev.speedRunHighScores, [level]: score },
        xp: prev.xp + Math.floor(score / 10),
      };
    });
  }, []);

  const recordKeystroke = useCallback((command: string) => {
    setProgress(prev => ({
      ...prev,
      totalKeystrokes: prev.totalKeystrokes + 1,
      commandUsage: {
        ...prev.commandUsage,
        [command]: (prev.commandUsage[command] ?? 0) + 1,
      },
    }));
  }, []);

  const unlockChapter = useCallback((chapter: number) => {
    setProgress(prev => ({
      ...prev,
      unlockedChapter: Math.max(prev.unlockedChapter, chapter),
    }));
  }, []);

  const getTitle = useCallback(() => {
    let current: (typeof TITLES)[number] = TITLES[0];
    for (const t of TITLES) {
      if (progress.xp >= t.xp) current = t;
    }
    return current;
  }, [progress.xp]);

  const getChapterStars = useCallback((chapter: number) => {
    let total = 0;
    for (const [id, result] of Object.entries(progress.levelResults)) {
      if (id.startsWith(`ch${chapter}-`)) {
        total += result.stars;
      }
    }
    return total;
  }, [progress.levelResults]);

  const resetProgress = useCallback(() => {
    const fresh: PlayerProgress = {
      levelResults: {},
      speedRunHighScores: {},
      totalKeystrokes: 0,
      commandUsage: {},
      unlockedChapter: 1,
      xp: 0,
    };
    setProgress(fresh);
  }, []);

  return {
    progress,
    recordLevel,
    recordSpeedRun,
    recordKeystroke,
    unlockChapter,
    getTitle,
    getChapterStars,
    resetProgress,
  };
}
