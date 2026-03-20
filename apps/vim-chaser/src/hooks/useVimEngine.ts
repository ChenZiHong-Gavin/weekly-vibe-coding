// ============================
// useVimEngine — Vim 引擎的 React Hook 封装
// ============================

import { useState, useCallback, useEffect, useRef } from 'react';
import type { EditorState, VimMode, KeyResult } from '@/types';
import { createEditorState, processKey } from '@/engine/VimEngine';
import { Sound } from '@/engine/SoundEngine';

interface UseVimEngineOptions {
  initialLines: string[];
  initialCursor?: { line: number; col: number };
  initialMode?: VimMode;
  /** 按键回调（每次有效按键后） */
  onKey?: (result: KeyResult, key: string) => void;
  /** 是否启用音效 */
  soundEnabled?: boolean;
  /** 是否启用（false 时不响应键盘） */
  enabled?: boolean;
}

export function useVimEngine(options: UseVimEngineOptions) {
  const {
    initialLines,
    initialCursor,
    initialMode,
    onKey,
    soundEnabled = true,
    enabled = true,
  } = options;

  const [state, setState] = useState<EditorState>(() =>
    createEditorState(initialLines, initialCursor, initialMode)
  );

  const [moveCount, setMoveCount] = useState(0);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const stateRef = useRef(state);
  stateRef.current = state;
  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabledRef.current) return;

    // 阻止浏览器默认行为
    const mode = stateRef.current.mode;
    const shouldPrevent =
      mode === 'normal' ||
      mode === 'command' ||
      mode === 'visual' ||
      mode === 'visual-line' ||
      mode === 'visual-block' ||
      e.key === 'Escape' ||
      e.key === 'Tab';

    if (shouldPrevent) {
      e.preventDefault();
    }
    // Insert 模式只阻止 Escape 和 Tab
    if (mode === 'insert' && (e.key === 'Escape' || e.key === 'Tab')) {
      e.preventDefault();
    }

    // 忽略纯修饰键
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

    // Ctrl 组合键
    let key = e.key;
    if (e.ctrlKey) {
      if (e.key === 'r') { key = 'Ctrl+r'; e.preventDefault(); }
      else if (e.key === 'o') { key = 'Ctrl+o'; e.preventDefault(); }
      else if (e.key === 'i') { key = 'Ctrl+i'; e.preventDefault(); }
      else if (e.key === 'v') { key = 'Ctrl+v'; e.preventDefault(); }
    }

    const result = processKey(stateRef.current, key);
    setState(result.newState);

    if (result.executedCommand) {
      setLastCommand(result.executedCommand);
      setMoveCount(prev => prev + 1);
      setCommandHistory(prev => [...prev.slice(-19), result.executedCommand!]);

      // 音效
      if (soundRef.current) {
        const cmd = result.executedCommand;
        if (['i', 'I', 'a', 'A', 'o', 'O', 'v', 'V', 'R', 'Esc'].includes(cmd)) {
          Sound.modeChange();
        } else if (result.isEdit) {
          Sound.move();
        } else {
          Sound.move();
        }
      }
    } else if (!result.valid && soundRef.current) {
      // 无效按键
      Sound.error();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }

    onKeyRef.current?.(result, key);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const reset = useCallback((lines?: string[], cursor?: { line: number; col: number }, mode?: VimMode) => {
    setState(createEditorState(
      lines ?? initialLines,
      cursor ?? initialCursor,
      mode ?? initialMode,
    ));
    setMoveCount(0);
    setLastCommand(null);
    setCommandHistory([]);
  }, [initialLines, initialCursor, initialMode]);

  return {
    state,
    moveCount,
    lastCommand,
    isShaking,
    commandHistory,
    reset,
  };
}
