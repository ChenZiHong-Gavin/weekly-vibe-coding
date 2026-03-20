// ============================
// CodeEditor — 代码显示 + 光标渲染
// ============================

import React, { useMemo } from 'react';
import type { EditorState, Cursor } from '@/types';

interface CodeEditorProps {
  state: EditorState;
  /** 要高亮的目标位置（黄色闪烁） */
  targetPositions?: Cursor[];
  /** 搜索高亮 */
  searchHighlight?: string;
  /** 是否震动 */
  isShaking?: boolean;
  /** 额外 class */
  className?: string;
}

const MODE_COLORS: Record<string, string> = {
  normal: 'bg-terminal-blue',
  insert: 'bg-terminal-green',
  visual: 'bg-terminal-purple',
  'visual-line': 'bg-terminal-purple',
  'visual-block': 'bg-terminal-purple',
  command: 'bg-terminal-amber',
  replace: 'bg-terminal-red',
};

const MODE_NAMES: Record<string, string> = {
  normal: 'NORMAL',
  insert: 'INSERT',
  visual: 'VISUAL',
  'visual-line': 'V-LINE',
  'visual-block': 'V-BLOCK',
  command: 'COMMAND',
  replace: 'REPLACE',
};

/** 简易语法高亮 */
function highlightSyntax(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  const patterns: [RegExp, string][] = [
    [/^(\/\/.*)/, 'text-gray-500 italic'],                          // 行注释
    [/^(["'`])(?:(?!\1).)*\1/, 'text-terminal-green'],              // 字符串
    [/^\b(function|const|let|var|return|if|else|for|while|class|import|export|from|async|await|new|this|typeof|instanceof)\b/, 'text-terminal-purple font-semibold'],
    [/^\b(true|false|null|undefined|NaN|Infinity)\b/, 'text-terminal-amber'],
    [/^\b(\d+\.?\d*)\b/, 'text-terminal-cyan'],                     // 数字
    [/^\b(console|log|Math|Array|Object|String|Number|JSON|Promise|Error)\b/, 'text-terminal-blue'],
  ];

  while (remaining.length > 0) {
    let matched = false;
    for (const [pattern, className] of patterns) {
      const m = remaining.match(pattern);
      if (m) {
        tokens.push(
          <span key={idx++} className={className}>{m[0]}</span>
        );
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // 普通字符
      tokens.push(<span key={idx++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  state,
  targetPositions = [],
  searchHighlight,
  isShaking = false,
  className = '',
}) => {
  const { lines, cursor, mode, commandBuffer, message } = state;

  // 预计算目标 set
  const targetSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of targetPositions) {
      set.add(`${t.line},${t.col}`);
    }
    return set;
  }, [targetPositions]);

  // 预计算可视选择范围
  const visualRange = useMemo(() => {
    if ((mode !== 'visual' && mode !== 'visual-line') || !state.visualStart) return null;
    const start = state.visualStart;
    const end = cursor;
    const startLine = Math.min(start.line, end.line);
    const endLine = Math.max(start.line, end.line);
    const startCol = startLine === start.line ? start.col : end.col;
    const endCol = endLine === end.line ? end.col : start.col;
    return { startLine, endLine, startCol: Math.min(startCol, endCol), endCol: Math.max(startCol, endCol), isLinewise: mode === 'visual-line' };
  }, [mode, state.visualStart, cursor]);

  return (
    <div className={`flex flex-col h-full bg-terminal-bg ${isShaking ? 'animate-shake' : ''} ${className}`}>
      {/* 编辑器主体 */}
      <div className="flex-1 overflow-auto font-mono text-sm leading-6">
        <div className="flex min-h-full">
          {/* 行号 */}
          <div className="flex-shrink-0 w-12 text-right pr-3 border-r border-terminal-border select-none">
            {lines.map((_, i) => (
              <div
                key={i}
                className={`h-6 text-xs flex items-center justify-end ${
                  i === cursor.line
                    ? 'text-terminal-text font-bold'
                    : 'text-terminal-dim'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* 代码内容 */}
          <div className="flex-1 pl-4 relative">
            {lines.map((line, lineIdx) => {
              const isCursorLine = lineIdx === cursor.line;
              const isVisualSelected = visualRange && lineIdx >= visualRange.startLine && lineIdx <= visualRange.endLine;

              return (
                <div
                  key={lineIdx}
                  className={`h-6 whitespace-pre relative ${
                    isCursorLine ? 'bg-white/[0.03]' : ''
                  } ${isVisualSelected ? 'bg-terminal-purple/20' : ''}`}
                >
                  {/* 渲染每个字符 */}
                  {(line || ' ').split('').map((char, colIdx) => {
                    const isCursor = isCursorLine && colIdx === cursor.col;
                    const isTarget = targetSet.has(`${lineIdx},${colIdx}`);
                    const isSearchHit = searchHighlight && line.toLowerCase().indexOf(searchHighlight.toLowerCase()) === colIdx;

                    return (
                      <span
                        key={colIdx}
                        className={`relative inline-block ${
                          isCursor && mode !== 'insert'
                            ? 'bg-terminal-green text-terminal-bg font-bold'
                            : isCursor && mode === 'insert'
                            ? ''
                            : isTarget
                            ? 'bg-terminal-amber/30 text-terminal-amber animate-glow-pulse'
                            : isSearchHit
                            ? 'bg-terminal-blue/30'
                            : ''
                        }`}
                      >
                        {char === ' ' ? '\u00A0' : char}
                        {/* Insert 模式光标（竖线） */}
                        {isCursor && mode === 'insert' && (
                          <span className="absolute left-0 top-0 w-0.5 h-full bg-terminal-green animate-cursor-blink" />
                        )}
                      </span>
                    );
                  })}
                  {/* 行尾的光标（当光标在空行或行尾时） */}
                  {isCursorLine && cursor.col >= line.length && (
                    <span className={`inline-block ${
                      mode === 'insert'
                        ? 'w-0.5 h-5 bg-terminal-green animate-cursor-blink align-middle'
                        : 'w-2 h-5 bg-terminal-green/80 align-middle'
                    }`}>
                      {mode !== 'insert' && '\u00A0'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex-shrink-0 h-7 flex items-center text-xs border-t border-terminal-border">
        {/* 模式指示 */}
        <div className={`px-3 py-1 font-bold text-black ${MODE_COLORS[mode] || 'bg-gray-500'}`}>
          {MODE_NAMES[mode] || mode.toUpperCase()}
        </div>

        {/* 录制宏指示器 */}
        {state.isRecording && (
          <div className="px-2 py-1 bg-terminal-red/20 text-terminal-red font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-terminal-red recording-dot" />
            REC @{state.macroReg}
          </div>
        )}

        {/* 命令缓冲区 / 消息 */}
        <div className="flex-1 px-3 text-terminal-dim truncate">
          {commandBuffer ? (
            <span className="text-terminal-amber">{commandBuffer}</span>
          ) : message ? (
            <span>{message}</span>
          ) : state.pendingOperator ? (
            <span className="text-terminal-amber">{state.pendingOperator}_</span>
          ) : null}
        </div>

        {/* 光标位置 */}
        <div className="px-3 text-terminal-dim">
          Ln {cursor.line + 1}, Col {cursor.col + 1}
        </div>
      </div>
    </div>
  );
};
