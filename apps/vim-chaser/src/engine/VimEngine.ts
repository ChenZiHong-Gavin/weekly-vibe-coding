// ============================
// Vim Engine — 纯逻辑，无 React 依赖
// ============================
// 处理按键输入，返回新状态。所有状态转换 immutable。

import type { EditorState, EditorSnapshot, Cursor, VimMode, KeyResult } from '@/types';

// ---- helpers ----

function cloneCursor(c: Cursor): Cursor { return { line: c.line, col: c.col }; }

function cloneState(s: EditorState): EditorState {
  return {
    ...s,
    lines: [...s.lines],
    cursor: cloneCursor(s.cursor),
    visualStart: s.visualStart ? cloneCursor(s.visualStart) : null,
    registers: { ...s.registers },
    defaultRegister: [...s.defaultRegister],
    undoStack: [...s.undoStack],
    redoStack: [...s.redoStack],
    marks: { ...s.marks },
    lastEdit: [...s.lastEdit],
    jumpList: s.jumpList ? [...s.jumpList] : [],
    jumpIdx: s.jumpIdx ?? -1,
    macroReg: s.macroReg ?? '',
    macroBuffer: s.macroBuffer ? [...s.macroBuffer] : [],
    isRecording: s.isRecording ?? false,
    macros: s.macros ? { ...s.macros } : {},
  };
}

function clampCursor(cursor: Cursor, lines: string[], insertMode = false): Cursor {
  const line = Math.max(0, Math.min(cursor.line, lines.length - 1));
  const lineLen = lines[line]?.length ?? 0;
  const maxCol = insertMode ? lineLen : Math.max(0, lineLen - 1);
  const col = Math.max(0, Math.min(cursor.col, maxCol));
  return { line, col };
}

function isWordChar(ch: string): boolean { return /[\w]/.test(ch); }
function isPunctuation(ch: string): boolean { return /[^\w\s]/.test(ch); }
function isWhitespace(ch: string): boolean { return /\s/.test(ch); }

function pushSnapshot(state: EditorState): EditorSnapshot[] {
  const snap: EditorSnapshot = { lines: [...state.lines], cursor: cloneCursor(state.cursor) };
  return [...state.undoStack.slice(-50), snap];
}

function pushJump(s: EditorState): void {
  if (!s.jumpList) s.jumpList = [];
  s.jumpList = [...s.jumpList.slice(0, (s.jumpIdx ?? -1) + 1), cloneCursor(s.cursor)].slice(-50);
  s.jumpIdx = s.jumpList.length - 1;
}

// ---- 创建初始状态 ----

export function createEditorState(lines: string[], cursor?: Cursor, mode?: VimMode): EditorState {
  return {
    lines: [...lines],
    cursor: cursor ? cloneCursor(cursor) : { line: 0, col: 0 },
    mode: mode ?? 'normal',
    pendingOperator: '',
    count: 0,
    visualStart: null,
    searchPattern: '',
    searchDirection: 'forward',
    registers: {},
    defaultRegister: [],
    undoStack: [],
    redoStack: [],
    commandBuffer: '',
    message: '',
    lastFind: null,
    marks: {},
    lastEdit: [],
    jumpList: [],
    jumpIdx: -1,
    macroReg: '',
    macroBuffer: [],
    isRecording: false,
    macros: {},
  };
}

// ---- Motion 函数 ----

function motionH(s: EditorState, count: number): Cursor {
  return { line: s.cursor.line, col: Math.max(0, s.cursor.col - count) };
}
function motionL(s: EditorState, count: number): Cursor {
  const maxCol = Math.max(0, (s.lines[s.cursor.line]?.length ?? 1) - 1);
  return { line: s.cursor.line, col: Math.min(maxCol, s.cursor.col + count) };
}
function motionJ(s: EditorState, count: number): Cursor {
  return clampCursor({ line: Math.min(s.lines.length - 1, s.cursor.line + count), col: s.cursor.col }, s.lines);
}
function motionK(s: EditorState, count: number): Cursor {
  return clampCursor({ line: Math.max(0, s.cursor.line - count), col: s.cursor.col }, s.lines);
}

function motionW(s: EditorState, count: number): Cursor {
  let { line, col } = s.cursor;
  const lines = s.lines;
  for (let i = 0; i < count; i++) {
    const ln = lines[line] ?? '';
    if (col >= ln.length - 1) {
      if (line < lines.length - 1) { line++; col = 0; const nxt = lines[line]; let c = 0; while (c < nxt.length && isWhitespace(nxt[c])) c++; col = c; }
      continue;
    }
    const ch = ln[col];
    if (isWordChar(ch)) { while (col < ln.length && isWordChar(ln[col])) col++; }
    else if (isPunctuation(ch)) { while (col < ln.length && isPunctuation(ln[col])) col++; }
    while (col < ln.length && isWhitespace(ln[col])) col++;
    if (col >= ln.length && line < lines.length - 1) { line++; col = 0; const nxt = lines[line]; let c = 0; while (c < nxt.length && isWhitespace(nxt[c])) c++; col = c; }
  }
  return clampCursor({ line, col }, lines);
}

function motionB(s: EditorState, count: number): Cursor {
  let { line, col } = s.cursor;
  const lines = s.lines;
  for (let i = 0; i < count; i++) {
    if (col === 0) { if (line > 0) { line--; col = Math.max(0, lines[line].length - 1); } continue; }
    col--;
    const ln = lines[line];
    while (col > 0 && isWhitespace(ln[col])) col--;
    if (isWordChar(ln[col])) { while (col > 0 && isWordChar(ln[col - 1])) col--; }
    else if (isPunctuation(ln[col])) { while (col > 0 && isPunctuation(ln[col - 1])) col--; }
  }
  return clampCursor({ line, col }, lines);
}

function motionE(s: EditorState, count: number): Cursor {
  let { line, col } = s.cursor;
  const lines = s.lines;
  for (let i = 0; i < count; i++) {
    col++;
    let ln = lines[line] ?? '';
    if (col >= ln.length) { if (line < lines.length - 1) { line++; col = 0; } else { col = Math.max(0, ln.length - 1); continue; } }
    ln = lines[line];
    while (col < ln.length && isWhitespace(ln[col])) col++;
    if (col >= ln.length && line < lines.length - 1) { line++; col = 0; ln = lines[line]; while (col < ln.length && isWhitespace(ln[col])) col++; }
    ln = lines[line];
    if (isWordChar(ln[col])) { while (col < ln.length - 1 && isWordChar(ln[col + 1])) col++; }
    else if (isPunctuation(ln[col])) { while (col < ln.length - 1 && isPunctuation(ln[col + 1])) col++; }
  }
  return clampCursor({ line, col }, lines);
}

function motionWBig(s: EditorState, count: number): Cursor {
  let { line, col } = s.cursor;
  const lines = s.lines;
  for (let i = 0; i < count; i++) {
    const ln = lines[line] ?? '';
    while (col < ln.length && !isWhitespace(ln[col])) col++;
    while (col < ln.length && isWhitespace(ln[col])) col++;
    if (col >= ln.length && line < lines.length - 1) { line++; col = 0; const nxt = lines[line]; let c = 0; while (c < nxt.length && isWhitespace(nxt[c])) c++; col = c; }
  }
  return clampCursor({ line, col }, lines);
}

function motionBBig(s: EditorState, count: number): Cursor {
  let { line, col } = s.cursor;
  const lines = s.lines;
  for (let i = 0; i < count; i++) {
    if (col === 0) { if (line > 0) { line--; col = Math.max(0, lines[line].length - 1); } continue; }
    col--;
    const ln = lines[line];
    while (col > 0 && isWhitespace(ln[col])) col--;
    while (col > 0 && !isWhitespace(ln[col - 1])) col--;
  }
  return clampCursor({ line, col }, lines);
}

function motion0(s: EditorState): Cursor { return { line: s.cursor.line, col: 0 }; }
function motionDollar(s: EditorState): Cursor { return { line: s.cursor.line, col: Math.max(0, (s.lines[s.cursor.line]?.length ?? 1) - 1) }; }
function motionCaret(s: EditorState): Cursor {
  const ln = s.lines[s.cursor.line] ?? '';
  let col = 0;
  while (col < ln.length && (ln[col] === ' ' || ln[col] === '\t')) col++;
  return { line: s.cursor.line, col: Math.min(col, Math.max(0, ln.length - 1)) };
}

function motionGG(s: EditorState, count: number | null): Cursor {
  if (count !== null && count > 0) return clampCursor({ line: count - 1, col: 0 }, s.lines);
  return clampCursor({ line: 0, col: 0 }, s.lines);
}
function motionG(s: EditorState, count: number | null): Cursor {
  if (count !== null && count > 0) return clampCursor({ line: count - 1, col: 0 }, s.lines);
  return clampCursor({ line: s.lines.length - 1, col: 0 }, s.lines);
}

function motionBraceForward(s: EditorState, count: number): Cursor {
  let { line } = s.cursor;
  for (let i = 0; i < count; i++) {
    while (line < s.lines.length && s.lines[line].trim() !== '') line++;
    while (line < s.lines.length && s.lines[line].trim() === '') line++;
  }
  return clampCursor({ line: Math.min(line, s.lines.length - 1), col: 0 }, s.lines);
}
function motionBraceBackward(s: EditorState, count: number): Cursor {
  let { line } = s.cursor;
  for (let i = 0; i < count; i++) {
    if (line > 0) line--;
    while (line > 0 && s.lines[line].trim() !== '') line--;
    while (line > 0 && s.lines[line].trim() === '') line--;
    if (s.lines[line].trim() !== '' && line > 0) { while (line > 0 && s.lines[line - 1].trim() !== '') line--; }
  }
  return clampCursor({ line, col: 0 }, s.lines);
}

function motionF(s: EditorState, char: string, count: number): Cursor | null {
  const ln = s.lines[s.cursor.line] ?? '';
  let col = s.cursor.col;
  for (let i = 0; i < count; i++) { col++; while (col < ln.length && ln[col] !== char) col++; if (col >= ln.length) return null; }
  return { line: s.cursor.line, col };
}
function motionFBack(s: EditorState, char: string, count: number): Cursor | null {
  const ln = s.lines[s.cursor.line] ?? '';
  let col = s.cursor.col;
  for (let i = 0; i < count; i++) { col--; while (col >= 0 && ln[col] !== char) col--; if (col < 0) return null; }
  return { line: s.cursor.line, col };
}
function motionT(s: EditorState, char: string, count: number): Cursor | null {
  const r = motionF(s, char, count); return r ? { line: r.line, col: Math.max(0, r.col - 1) } : null;
}
function motionTBack(s: EditorState, char: string, count: number): Cursor | null {
  const r = motionFBack(s, char, count); return r ? { line: r.line, col: r.col + 1 } : null;
}

function motionPercent(s: EditorState): Cursor | null {
  const ln = s.lines[s.cursor.line] ?? '';
  const ch = ln[s.cursor.col];
  const pairs: Record<string, string> = { '(': ')', ')': '(', '{': '}', '}': '{', '[': ']', ']': '[' };
  const match = pairs[ch]; if (!match) return null;
  const forward = '({['.includes(ch);
  let depth = 1, line = s.cursor.line, col = s.cursor.col;
  while (depth > 0) {
    if (forward) col++; else col--;
    if (col < 0) { line--; if (line < 0) return null; col = s.lines[line].length - 1; continue; }
    if (col >= (s.lines[line]?.length ?? 0)) { line++; if (line >= s.lines.length) return null; col = 0; continue; }
    if (s.lines[line][col] === ch) depth++;
    if (s.lines[line][col] === match) depth--;
  }
  return { line, col };
}

function motionH_screen(s: EditorState): Cursor { return clampCursor({ line: 0, col: 0 }, s.lines); }
function motionM_screen(s: EditorState): Cursor { return clampCursor({ line: Math.floor(s.lines.length / 2), col: 0 }, s.lines); }
function motionL_screen(s: EditorState): Cursor { return clampCursor({ line: s.lines.length - 1, col: 0 }, s.lines); }

// ---- Text Range & Delete ----

interface TextRange { startLine: number; startCol: number; endLine: number; endCol: number; linewise: boolean; }

function rangeFromMotion(s: EditorState, dest: Cursor, linewise = false): TextRange {
  const c = s.cursor;
  const before = c.line < dest.line || (c.line === dest.line && c.col <= dest.col);
  if (linewise) {
    const sL = before ? c.line : dest.line;
    const eL = before ? dest.line : c.line;
    return { startLine: sL, startCol: 0, endLine: eL, endCol: (s.lines[eL]?.length ?? 0), linewise: true };
  }
  return before
    ? { startLine: c.line, startCol: c.col, endLine: dest.line, endCol: dest.col, linewise: false }
    : { startLine: dest.line, startCol: dest.col, endLine: c.line, endCol: c.col, linewise: false };
}

function deleteRange(state: EditorState, range: TextRange): { lines: string[]; deleted: string[] } {
  const nl = [...state.lines];
  if (range.linewise) {
    const d = nl.splice(range.startLine, range.endLine - range.startLine + 1);
    if (nl.length === 0) nl.push('');
    return { lines: nl, deleted: d };
  }
  if (range.startLine === range.endLine) {
    const ln = nl[range.startLine];
    const d = [ln.slice(range.startCol, range.endCol + 1)];
    nl[range.startLine] = ln.slice(0, range.startCol) + ln.slice(range.endCol + 1);
    return { lines: nl, deleted: d };
  }
  const first = nl[range.startLine].slice(0, range.startCol);
  const last = nl[range.endLine].slice(range.endCol + 1);
  const d: string[] = [];
  for (let i = range.startLine; i <= range.endLine; i++) d.push(nl[i]);
  nl.splice(range.startLine, range.endLine - range.startLine + 1, first + last);
  return { lines: nl, deleted: d };
}

// ---- Search ----

function searchForward(s: EditorState, pat: string): Cursor | null {
  if (!pat) return null;
  const lp = pat.toLowerCase();
  for (let i = s.cursor.line; i < s.lines.length; i++) {
    const sc = i === s.cursor.line ? s.cursor.col + 1 : 0;
    const idx = s.lines[i].toLowerCase().indexOf(lp, sc);
    if (idx !== -1) return { line: i, col: idx };
  }
  for (let i = 0; i <= s.cursor.line; i++) {
    const idx = s.lines[i].toLowerCase().indexOf(lp);
    if (idx !== -1 && (i < s.cursor.line || idx <= s.cursor.col)) return { line: i, col: idx };
  }
  return null;
}
function searchBackward(s: EditorState, pat: string): Cursor | null {
  if (!pat) return null;
  const lp = pat.toLowerCase();
  for (let i = s.cursor.line; i >= 0; i--) {
    const ec = i === s.cursor.line ? s.cursor.col - 1 : s.lines[i].length;
    const idx = s.lines[i].toLowerCase().lastIndexOf(lp, ec);
    if (idx !== -1) return { line: i, col: idx };
  }
  for (let i = s.lines.length - 1; i >= s.cursor.line; i--) {
    const idx = s.lines[i].toLowerCase().lastIndexOf(lp);
    if (idx !== -1 && (i > s.cursor.line || idx > s.cursor.col)) return { line: i, col: idx };
  }
  return null;
}

function getWordUnderCursor(s: EditorState): string | null {
  const ln = s.lines[s.cursor.line] ?? '';
  let start = s.cursor.col, end = s.cursor.col;
  if (!isWordChar(ln[start])) return null;
  while (start > 0 && isWordChar(ln[start - 1])) start--;
  while (end < ln.length - 1 && isWordChar(ln[end + 1])) end++;
  return ln.slice(start, end + 1);
}

// ---- Substitute command ----

function executeSubstitute(s: EditorState, cmd: string): void {
  // Parse :%s/old/new/g  or  :s/old/new/g
  const m = cmd.match(/^(%)?s\/(.+?)\/(.*)\/([gi]*)$/);
  if (!m) { s.message = 'Invalid substitute'; return; }
  const [, range, pattern, replacement, flags] = m;
  const global = flags.includes('g');
  const caseInsensitive = flags.includes('i');
  const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), (global ? 'g' : '') + (caseInsensitive ? 'i' : ''));
  let count = 0;
  if (range === '%') {
    for (let i = 0; i < s.lines.length; i++) {
      const newLine = s.lines[i].replace(re, replacement);
      if (newLine !== s.lines[i]) count++;
      s.lines[i] = newLine;
    }
  } else {
    const newLine = s.lines[s.cursor.line].replace(re, replacement);
    if (newLine !== s.lines[s.cursor.line]) count++;
    s.lines[s.cursor.line] = newLine;
  }
  s.message = count > 0 ? `${count} substitution(s)` : 'Pattern not found';
}

// ============================
// 主处理函数
// ============================

export function processKey(state: EditorState, key: string): KeyResult {
  const s = cloneState(state);
  // 录制宏
  if (s.isRecording && key !== 'q' && s.mode !== 'command') {
    s.macroBuffer.push(key);
  }
  if (s.mode === 'insert') return handleInsertMode(s, key);
  if (s.mode === 'replace') return handleReplaceMode(s, key);
  if (s.mode === 'command') return handleCommandMode(s, key);
  if (s.mode === 'visual' || s.mode === 'visual-line') return handleVisualMode(s, key);
  return handleNormalMode(s, key);
}

// ---- INSERT ----
function handleInsertMode(s: EditorState, key: string): KeyResult {
  if (key === 'Escape') {
    s.mode = 'normal';
    if (s.cursor.col > 0) s.cursor.col--;
    s.cursor = clampCursor(s.cursor, s.lines);
    return mk(s, 'Esc', true, false);
  }
  if (key === 'Backspace') {
    if (s.cursor.col > 0) {
      const ln = s.lines[s.cursor.line];
      s.lines[s.cursor.line] = ln.slice(0, s.cursor.col - 1) + ln.slice(s.cursor.col);
      s.cursor.col--;
    } else if (s.cursor.line > 0) {
      const pLen = s.lines[s.cursor.line - 1].length;
      s.lines[s.cursor.line - 1] += s.lines[s.cursor.line];
      s.lines.splice(s.cursor.line, 1);
      s.cursor = { line: s.cursor.line - 1, col: pLen };
    }
    return mk(s, null, true, true);
  }
  if (key === 'Enter') {
    const ln = s.lines[s.cursor.line];
    s.lines[s.cursor.line] = ln.slice(0, s.cursor.col);
    s.lines.splice(s.cursor.line + 1, 0, ln.slice(s.cursor.col));
    s.cursor = { line: s.cursor.line + 1, col: 0 };
    return mk(s, null, true, true);
  }
  if (key.length === 1) {
    const ln = s.lines[s.cursor.line];
    s.lines[s.cursor.line] = ln.slice(0, s.cursor.col) + key + ln.slice(s.cursor.col);
    s.cursor.col++;
    return mk(s, null, true, true);
  }
  return mk(s, null, false, false);
}

// ---- REPLACE ----
function handleReplaceMode(s: EditorState, key: string): KeyResult {
  if (key === 'Escape') { s.mode = 'normal'; return mk(s, 'Esc', true, false); }
  if (key.length === 1) {
    const ln = s.lines[s.cursor.line];
    s.lines[s.cursor.line] = s.cursor.col < ln.length
      ? ln.slice(0, s.cursor.col) + key + ln.slice(s.cursor.col + 1)
      : ln + key;
    s.cursor.col++;
    s.cursor = clampCursor(s.cursor, s.lines);
    return mk(s, 'R:' + key, true, true);
  }
  return mk(s, null, false, false);
}

// ---- COMMAND (:, /, ?) ----
function handleCommandMode(s: EditorState, key: string): KeyResult {
  if (key === 'Escape') { s.mode = 'normal'; s.commandBuffer = ''; return mk(s, 'Esc', true, false); }
  if (key === 'Backspace') {
    if (s.commandBuffer.length <= 1) { s.mode = 'normal'; s.commandBuffer = ''; }
    else s.commandBuffer = s.commandBuffer.slice(0, -1);
    return mk(s, null, true, false);
  }
  if (key === 'Enter') {
    const buf = s.commandBuffer;
    s.mode = 'normal'; s.commandBuffer = '';
    if (buf.startsWith('/') || buf.startsWith('?')) {
      const pat = buf.slice(1);
      s.searchPattern = pat;
      s.searchDirection = buf[0] === '/' ? 'forward' : 'backward';
      const found = buf[0] === '/' ? searchForward(s, pat) : searchBackward(s, pat);
      if (found) { pushJump(s); s.cursor = found; } else s.message = `Pattern not found: ${pat}`;
      return mk(s, buf, true, false);
    }
    if (buf.startsWith(':')) {
      const cmd = buf.slice(1).trim();
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      if (cmd.includes('s/')) { executeSubstitute(s, cmd); }
      else s.message = `Not implemented: :${cmd}`;
      s.cursor = clampCursor(s.cursor, s.lines);
      return mk(s, buf, true, true);
    }
    return mk(s, buf, true, false);
  }
  if (key.length === 1) { s.commandBuffer += key; return mk(s, null, true, false); }
  return mk(s, null, false, false);
}

// ---- VISUAL ----
function handleVisualMode(s: EditorState, key: string): KeyResult {
  if (key === 'Escape') { s.mode = 'normal'; s.visualStart = null; s.pendingOperator = ''; return mk(s, 'Esc', true, false); }
  if (key === 'v') { if (s.mode === 'visual') { s.mode = 'normal'; s.visualStart = null; return mk(s, 'v', true, false); } s.mode = 'visual'; return mk(s, 'v', true, false); }
  if (key === 'V') { if (s.mode === 'visual-line') { s.mode = 'normal'; s.visualStart = null; return mk(s, 'V', true, false); } s.mode = 'visual-line'; return mk(s, 'V', true, false); }

  const count = s.count || 1;
  s.count = 0;

  // 数字
  if (/^[1-9]$/.test(key) || (key === '0' && s.count > 0)) { s.count = s.count * 10 + parseInt(key); return mk(s, null, true, false); }

  // 移动命令
  const movResult = applyMotionKey(s, key, count);
  if (movResult) return movResult;

  // 操作（d/c/y/>/</~/U/u/r）作用于选区
  const vStart = s.visualStart!;
  const vEnd = s.cursor;
  const sLine = Math.min(vStart.line, vEnd.line);
  const eLine = Math.max(vStart.line, vEnd.line);
  const sCol = sLine === vStart.line ? vStart.col : vEnd.col;
  const eCol = eLine === vEnd.line ? vEnd.col : vStart.col;
  const minCol = Math.min(sCol, eCol);
  const maxCol = Math.max(sCol, eCol);
  const isLine = s.mode === 'visual-line';

  const range: TextRange = isLine
    ? { startLine: sLine, startCol: 0, endLine: eLine, endCol: s.lines[eLine].length, linewise: true }
    : { startLine: sLine, startCol: sLine === eLine ? minCol : (sLine === vStart.line ? vStart.col : vEnd.col), endLine: eLine, endCol: sLine === eLine ? maxCol : (eLine === vEnd.line ? vEnd.col : vStart.col), linewise: false };

  if (key === 'd' || key === 'x') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    const { lines, deleted } = deleteRange(s, range);
    s.lines = lines; s.defaultRegister = deleted;
    s.cursor = clampCursor({ line: range.startLine, col: range.startCol }, s.lines);
    s.mode = 'normal'; s.visualStart = null;
    return mk(s, 'd', true, true);
  }
  if (key === 'c') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    const { lines, deleted } = deleteRange(s, range);
    s.lines = lines; s.defaultRegister = deleted;
    s.cursor = clampCursor({ line: range.startLine, col: range.startCol }, s.lines);
    s.mode = 'insert'; s.visualStart = null;
    return mk(s, 'c', true, true);
  }
  if (key === 'y') {
    if (isLine) { s.defaultRegister = s.lines.slice(sLine, eLine + 1); }
    else if (sLine === eLine) { s.defaultRegister = [s.lines[sLine].slice(minCol, maxCol + 1)]; }
    else {
      const r: string[] = []; r.push(s.lines[sLine].slice(sLine === vStart.line ? vStart.col : vEnd.col));
      for (let i = sLine + 1; i < eLine; i++) r.push(s.lines[i]);
      r.push(s.lines[eLine].slice(0, (eLine === vEnd.line ? vEnd.col : vStart.col) + 1));
      s.defaultRegister = r;
    }
    s.mode = 'normal'; s.visualStart = null;
    s.cursor = clampCursor({ line: sLine, col: minCol }, s.lines);
    return mk(s, 'y', true, false);
  }
  if (key === '>') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    for (let i = sLine; i <= eLine; i++) s.lines[i] = '  ' + s.lines[i];
    s.mode = 'normal'; s.visualStart = null;
    return mk(s, '>', true, true);
  }
  if (key === '<') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    for (let i = sLine; i <= eLine; i++) s.lines[i] = s.lines[i].replace(/^  /, '');
    s.mode = 'normal'; s.visualStart = null;
    return mk(s, '<', true, true);
  }
  if (key === '~') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    if (isLine) {
      for (let i = sLine; i <= eLine; i++) s.lines[i] = toggleCase(s.lines[i]);
    } else if (sLine === eLine) {
      const ln = s.lines[sLine];
      s.lines[sLine] = ln.slice(0, minCol) + toggleCase(ln.slice(minCol, maxCol + 1)) + ln.slice(maxCol + 1);
    }
    s.mode = 'normal'; s.visualStart = null;
    return mk(s, '~', true, true);
  }
  if (key === 'U') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    if (isLine) { for (let i = sLine; i <= eLine; i++) s.lines[i] = s.lines[i].toUpperCase(); }
    else if (sLine === eLine) { const ln = s.lines[sLine]; s.lines[sLine] = ln.slice(0, minCol) + ln.slice(minCol, maxCol + 1).toUpperCase() + ln.slice(maxCol + 1); }
    s.mode = 'normal'; s.visualStart = null;
    return mk(s, 'U', true, true);
  }
  if (key === 'u') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    if (isLine) { for (let i = sLine; i <= eLine; i++) s.lines[i] = s.lines[i].toLowerCase(); }
    else if (sLine === eLine) { const ln = s.lines[sLine]; s.lines[sLine] = ln.slice(0, minCol) + ln.slice(minCol, maxCol + 1).toLowerCase() + ln.slice(maxCol + 1); }
    s.mode = 'normal'; s.visualStart = null;
    return mk(s, 'u', true, true);
  }
  if (key === 'r') {
    s.pendingOperator = 'vr';
    return mk(s, null, true, false);
  }
  if (s.pendingOperator === 'vr' && key.length === 1) {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    if (sLine === eLine) {
      const ln = s.lines[sLine];
      s.lines[sLine] = ln.slice(0, minCol) + key.repeat(maxCol - minCol + 1) + ln.slice(maxCol + 1);
    }
    s.pendingOperator = ''; s.mode = 'normal'; s.visualStart = null;
    return mk(s, 'r' + key, true, true);
  }
  if (key === 'J') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    for (let i = sLine; i < eLine && sLine < s.lines.length - 1; i++) {
      const cur = s.lines[sLine];
      const next = s.lines[sLine + 1].trimStart();
      s.lines[sLine] = cur + (next ? ' ' + next : '');
      s.lines.splice(sLine + 1, 1);
    }
    s.mode = 'normal'; s.visualStart = null;
    return mk(s, 'J', true, true);
  }

  return mk(s, null, false, false);
}

function toggleCase(str: string): string {
  return str.split('').map(c => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()).join('');
}

// ---- Shared motion dispatcher (used by normal & visual) ----
function applyMotionKey(s: EditorState, key: string, count: number): KeyResult | null {
  switch (key) {
    case 'h': case 'ArrowLeft': s.cursor = motionH(s, count); return mk(s, 'h');
    case 'l': case 'ArrowRight': s.cursor = motionL(s, count); return mk(s, 'l');
    case 'j': case 'ArrowDown': s.cursor = motionJ(s, count); return mk(s, 'j');
    case 'k': case 'ArrowUp': s.cursor = motionK(s, count); return mk(s, 'k');
    case 'w': s.cursor = motionW(s, count); return mk(s, 'w');
    case 'W': s.cursor = motionWBig(s, count); return mk(s, 'W');
    case 'b': s.cursor = motionB(s, count); return mk(s, 'b');
    case 'B': s.cursor = motionBBig(s, count); return mk(s, 'B');
    case 'e': s.cursor = motionE(s, count); return mk(s, 'e');
    case '0': s.cursor = motion0(s); return mk(s, '0');
    case '$': s.cursor = motionDollar(s); return mk(s, '$');
    case '^': s.cursor = motionCaret(s); return mk(s, '^');
    case '{': s.cursor = motionBraceBackward(s, count); return mk(s, '{');
    case '}': s.cursor = motionBraceForward(s, count); return mk(s, '}');
    case 'G': pushJump(s); s.cursor = motionG(s, count > 1 ? count : null); return mk(s, 'G');
    case 'H': s.cursor = motionH_screen(s); return mk(s, 'H');
    case 'M': s.cursor = motionM_screen(s); return mk(s, 'M');
    case 'L': s.cursor = motionL_screen(s); return mk(s, 'L');
    case '%': { const d = motionPercent(s); if (d) { s.cursor = d; return mk(s, '%'); } return null; }
  }
  // f/F/t/T (in visual we handle pending)
  if ('fFtT'.includes(key)) {
    s.pendingOperator = key; s.count = count;
    return mk(s, null, true, false);
  }
  return null;
}

// ---- NORMAL MODE ----
function handleNormalMode(s: EditorState, key: string): KeyResult {
  // -- pending: r (replace char) --
  if (s.pendingOperator === 'r') {
    if (key === 'Escape') { s.pendingOperator = ''; return mk(s, null, true, false); }
    if (key.length === 1) {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      const ln = s.lines[s.cursor.line];
      if (s.cursor.col < ln.length) s.lines[s.cursor.line] = ln.slice(0, s.cursor.col) + key + ln.slice(s.cursor.col + 1);
      s.pendingOperator = '';
      s.lastEdit = ['r', key];
      return mk(s, 'r' + key, true, true);
    }
    return mk(s, null, false, false);
  }

  // -- pending: f/F/t/T --
  if ('fFtT'.includes(s.pendingOperator) && s.pendingOperator.length === 1) {
    if (key === 'Escape') { s.pendingOperator = ''; return mk(s, null, true, false); }
    if (key.length === 1) {
      const op = s.pendingOperator as 'f' | 'F' | 't' | 'T';
      const cnt = s.count || 1;
      let dest: Cursor | null = null;
      if (op === 'f') dest = motionF(s, key, cnt);
      else if (op === 'F') dest = motionFBack(s, key, cnt);
      else if (op === 't') dest = motionT(s, key, cnt);
      else if (op === 'T') dest = motionTBack(s, key, cnt);
      s.pendingOperator = ''; s.count = 0;
      if (dest) { s.cursor = dest; s.lastFind = { type: op, char: key }; return mk(s, op + key); }
      return mk(s, null, false, false);
    }
    return mk(s, null, false, false);
  }

  // -- pending: g (gg, gU, gu) --
  if (s.pendingOperator === 'g') {
    s.pendingOperator = '';
    const cnt = s.count || 0; s.count = 0;
    if (key === 'g') { pushJump(s); s.cursor = motionGG(s, cnt > 0 ? cnt : null); return mk(s, 'gg'); }
    if (key === 'U') { s.pendingOperator = 'gU'; return mk(s, null, true, false); }
    if (key === 'u') { s.pendingOperator = 'gu'; return mk(s, null, true, false); }
    return mk(s, null, false, false);
  }

  // -- pending: gU{motion} / gu{motion} --
  if (s.pendingOperator === 'gU' || s.pendingOperator === 'gu') {
    const isUpper = s.pendingOperator === 'gU';
    s.pendingOperator = '';
    const cnt = s.count || 1; s.count = 0;
    // text object shortcut: gUiw, guiw etc
    if (key === 'i' || key === 'a') { s.pendingOperator = (isUpper ? 'gU' : 'gu') + key; return mk(s, null, true, false); }
    if (key === 'w') {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      const dest = motionW(s, cnt);
      const r = rangeFromMotion(s, dest);
      caseRange(s, r, isUpper);
      return mk(s, isUpper ? 'gUw' : 'guw', true, true);
    }
    if (key === '$') {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      const dest = motionDollar(s);
      const r = rangeFromMotion(s, dest);
      caseRange(s, r, isUpper);
      return mk(s, isUpper ? 'gU$' : 'gu$', true, true);
    }
    return mk(s, null, false, false);
  }
  // gUiw / guiw etc
  if (s.pendingOperator.match(/^g[Uu][ia]$/)) {
    const isUpper = s.pendingOperator[1] === 'U';
    const scope = s.pendingOperator[2] as 'i' | 'a';
    s.pendingOperator = ''; s.count = 0;
    const range = getTextObjectRange(s, scope, key);
    if (range) { s.undoStack = pushSnapshot(s); s.redoStack = []; caseRange(s, range, isUpper); return mk(s, `g${isUpper ? 'U' : 'u'}${scope}${key}`, true, true); }
    return mk(s, null, false, false);
  }

  // -- pending: m (mark) --
  if (s.pendingOperator === 'm') {
    s.pendingOperator = '';
    if (key.length === 1 && /[a-zA-Z]/.test(key)) {
      s.marks[key] = cloneCursor(s.cursor);
      return mk(s, 'm' + key);
    }
    return mk(s, null, false, false);
  }

  // -- pending: ' or ` (jump to mark) --
  if (s.pendingOperator === "'" || s.pendingOperator === '`') {
    const exact = s.pendingOperator === '`';
    s.pendingOperator = '';
    if (key.length === 1 && s.marks[key]) {
      pushJump(s);
      s.cursor = exact ? cloneCursor(s.marks[key]) : { line: s.marks[key].line, col: 0 };
      s.cursor = clampCursor(s.cursor, s.lines);
      return mk(s, (exact ? '`' : "'") + key);
    }
    return mk(s, null, false, false);
  }

  // -- pending: > or < (indent) --
  if (s.pendingOperator === '>') {
    s.pendingOperator = ''; const cnt = s.count || 1; s.count = 0;
    if (key === '>') {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      for (let i = 0; i < cnt; i++) s.lines[s.cursor.line + i] && (s.lines[s.cursor.line + i] = '  ' + s.lines[s.cursor.line + i]);
      return mk(s, '>>', true, true);
    }
    return mk(s, null, false, false);
  }
  if (s.pendingOperator === '<') {
    s.pendingOperator = ''; const cnt = s.count || 1; s.count = 0;
    if (key === '<') {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      for (let i = 0; i < cnt; i++) s.lines[s.cursor.line + i] && (s.lines[s.cursor.line + i] = s.lines[s.cursor.line + i].replace(/^  /, ''));
      return mk(s, '<<', true, true);
    }
    return mk(s, null, false, false);
  }

  // -- pending: q (macro) --
  if (s.pendingOperator === 'q_start') {
    s.pendingOperator = '';
    if (key.length === 1 && /[a-z]/.test(key)) {
      s.macroReg = key; s.macroBuffer = []; s.isRecording = true;
      s.message = `Recording @${key}`;
      return mk(s, 'q' + key);
    }
    return mk(s, null, false, false);
  }

  // -- pending: @ (play macro) --
  if (s.pendingOperator === '@_play') {
    s.pendingOperator = '';
    if (key === '@') {
      // repeat last
      if (s.macroReg && s.macros[s.macroReg]) {
        return playMacro(s, s.macroReg);
      }
      return mk(s, null, false, false);
    }
    if (key.length === 1 && /[a-z]/.test(key) && s.macros[key]) {
      return playMacro(s, key);
    }
    return mk(s, null, false, false);
  }

  // -- pending: d/c/y (operator) --
  if (s.pendingOperator === 'd' || s.pendingOperator === 'c' || s.pendingOperator === 'y') {
    return handleOperatorPending(s, key);
  }
  // -- deeper pending: di/da/df/dt etc --
  if (s.pendingOperator.length >= 2 && 'dcy'.includes(s.pendingOperator[0])) {
    return handleOperatorPending(s, key);
  }

  // ==== Top-level keys ====

  if (key === 'Escape') {
    s.pendingOperator = ''; s.count = 0; s.visualStart = null; s.commandBuffer = ''; s.mode = 'normal';
    return mk(s, 'Esc', true, false);
  }

  // Digits
  if (/^[1-9]$/.test(key) || (key === '0' && s.count > 0)) { s.count = s.count * 10 + parseInt(key); return mk(s, null, true, false); }

  const count = s.count || 1;
  s.count = 0;

  // -- Motion keys --
  const movResult = applyMotionKey(s, key, count);
  if (movResult) return movResult;

  // -- Search --
  if (key === '/' || key === '?') { s.mode = 'command'; s.commandBuffer = key; return mk(s, null, true, false); }
  if (key === ':') { s.mode = 'command'; s.commandBuffer = ':'; return mk(s, null, true, false); }
  if (key === 'n') {
    if (s.searchPattern) { const f = s.searchDirection === 'forward' ? searchForward(s, s.searchPattern) : searchBackward(s, s.searchPattern); if (f) { pushJump(s); s.cursor = f; return mk(s, 'n'); } }
    return mk(s, null, false, false);
  }
  if (key === 'N') {
    if (s.searchPattern) { const f = s.searchDirection === 'forward' ? searchBackward(s, s.searchPattern) : searchForward(s, s.searchPattern); if (f) { pushJump(s); s.cursor = f; return mk(s, 'N'); } }
    return mk(s, null, false, false);
  }
  if (key === '*') { const w = getWordUnderCursor(s); if (w) { s.searchPattern = w; s.searchDirection = 'forward'; const f = searchForward(s, w); if (f) { pushJump(s); s.cursor = f; } return mk(s, '*'); } return mk(s, null, false, false); }
  if (key === '#') { const w = getWordUnderCursor(s); if (w) { s.searchPattern = w; s.searchDirection = 'backward'; const f = searchBackward(s, w); if (f) { pushJump(s); s.cursor = f; } return mk(s, '#'); } return mk(s, null, false, false); }

  // ; , (repeat find)
  if (key === ';') {
    if (s.lastFind) {
      const { type: t, char: c } = s.lastFind;
      let d: Cursor | null = null;
      if (t === 'f') d = motionF(s, c, count); else if (t === 'F') d = motionFBack(s, c, count);
      else if (t === 't') d = motionT(s, c, count); else if (t === 'T') d = motionTBack(s, c, count);
      if (d) { s.cursor = d; return mk(s, ';'); }
    }
    return mk(s, null, false, false);
  }
  if (key === ',') {
    if (s.lastFind) {
      const rv: Record<string, 'f' | 'F' | 't' | 'T'> = { f: 'F', F: 'f', t: 'T', T: 't' };
      const rt = rv[s.lastFind.type]; const c = s.lastFind.char;
      let d: Cursor | null = null;
      if (rt === 'f') d = motionF(s, c, count); else if (rt === 'F') d = motionFBack(s, c, count);
      else if (rt === 't') d = motionT(s, c, count); else if (rt === 'T') d = motionTBack(s, c, count);
      if (d) { s.cursor = d; return mk(s, ','); }
    }
    return mk(s, null, false, false);
  }

  // g (gg, gU, gu)
  if (key === 'g') { s.pendingOperator = 'g'; s.count = count; return mk(s, null, true, false); }

  // -- Enter insert mode --
  if (key === 'i') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.mode = 'insert'; s.lastEdit = ['i']; return mk(s, 'i', true, true); }
  if (key === 'I') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.mode = 'insert'; s.cursor = motionCaret(s); s.lastEdit = ['I']; return mk(s, 'I', true, true); }
  if (key === 'a') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.mode = 'insert'; s.cursor.col = Math.min(s.cursor.col + 1, s.lines[s.cursor.line].length); s.lastEdit = ['a']; return mk(s, 'a', true, true); }
  if (key === 'A') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.mode = 'insert'; s.cursor.col = s.lines[s.cursor.line].length; s.lastEdit = ['A']; return mk(s, 'A', true, true); }
  if (key === 'o') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.lines.splice(s.cursor.line + 1, 0, ''); s.cursor = { line: s.cursor.line + 1, col: 0 }; s.mode = 'insert'; s.lastEdit = ['o']; return mk(s, 'o', true, true); }
  if (key === 'O') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.lines.splice(s.cursor.line, 0, ''); s.cursor = { line: s.cursor.line, col: 0 }; s.mode = 'insert'; s.lastEdit = ['O']; return mk(s, 'O', true, true); }
  if (key === 's') { s.undoStack = pushSnapshot(s); s.redoStack = []; const ln = s.lines[s.cursor.line]; if (s.cursor.col < ln.length) s.lines[s.cursor.line] = ln.slice(0, s.cursor.col) + ln.slice(s.cursor.col + 1); s.mode = 'insert'; s.lastEdit = ['s']; return mk(s, 's', true, true); }
  if (key === 'S') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.lines[s.cursor.line] = ''; s.cursor.col = 0; s.mode = 'insert'; s.lastEdit = ['S']; return mk(s, 'S', true, true); }
  if (key === 'C') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.lines[s.cursor.line] = s.lines[s.cursor.line].slice(0, s.cursor.col); s.mode = 'insert'; s.lastEdit = ['C']; return mk(s, 'C', true, true); }
  if (key === 'R') { s.undoStack = pushSnapshot(s); s.redoStack = []; s.mode = 'replace'; return mk(s, 'R', true, true); }

  // -- Editing (stay normal) --
  if (key === 'x') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    for (let i = 0; i < count; i++) { const l = s.lines[s.cursor.line]; if (s.cursor.col < l.length) { s.defaultRegister = [l[s.cursor.col]]; s.lines[s.cursor.line] = l.slice(0, s.cursor.col) + l.slice(s.cursor.col + 1); } }
    s.cursor = clampCursor(s.cursor, s.lines);
    s.lastEdit = ['x']; return mk(s, 'x', true, true);
  }
  if (key === 'X') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    for (let i = 0; i < count; i++) { if (s.cursor.col > 0) { const l = s.lines[s.cursor.line]; s.lines[s.cursor.line] = l.slice(0, s.cursor.col - 1) + l.slice(s.cursor.col); s.cursor.col--; } }
    return mk(s, 'X', true, true);
  }
  if (key === 'D') { s.undoStack = pushSnapshot(s); s.redoStack = []; const ln = s.lines[s.cursor.line]; s.defaultRegister = [ln.slice(s.cursor.col)]; s.lines[s.cursor.line] = ln.slice(0, s.cursor.col); s.cursor = clampCursor(s.cursor, s.lines); return mk(s, 'D', true, true); }
  if (key === 'J') {
    if (s.cursor.line < s.lines.length - 1) {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      const cur = s.lines[s.cursor.line]; const next = s.lines[s.cursor.line + 1].trimStart();
      s.lines[s.cursor.line] = cur + (next ? ' ' + next : '');
      s.lines.splice(s.cursor.line + 1, 1);
      s.cursor.col = cur.length;
      return mk(s, 'J', true, true);
    }
    return mk(s, null, false, false);
  }
  if (key === '~') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    const ln = s.lines[s.cursor.line];
    if (s.cursor.col < ln.length) {
      const ch = ln[s.cursor.col];
      const toggled = ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
      s.lines[s.cursor.line] = ln.slice(0, s.cursor.col) + toggled + ln.slice(s.cursor.col + 1);
      s.cursor.col = Math.min(s.cursor.col + 1, Math.max(0, s.lines[s.cursor.line].length - 1));
    }
    return mk(s, '~', true, true);
  }

  // r (replace)
  if (key === 'r') { s.pendingOperator = 'r'; return mk(s, null, true, false); }

  // -- Operators --
  if (key === 'd') { s.pendingOperator = 'd'; s.count = count; return mk(s, null, true, false); }
  if (key === 'c') { s.pendingOperator = 'c'; s.count = count; return mk(s, null, true, false); }
  if (key === 'y') { s.pendingOperator = 'y'; s.count = count; return mk(s, null, true, false); }

  // -- p/P --
  if (key === 'p') { return doPaste(s, false); }
  if (key === 'P') { return doPaste(s, true); }

  // -- u / Ctrl+r --
  if (key === 'u') {
    if (s.undoStack.length > 0) {
      const snap = s.undoStack.pop()!;
      s.redoStack.push({ lines: [...s.lines], cursor: cloneCursor(s.cursor) });
      s.lines = snap.lines; s.cursor = snap.cursor;
      return mk(s, 'u', true, true);
    }
    return mk(s, null, false, false);
  }
  if (key === 'Ctrl+r') {
    if (s.redoStack.length > 0) {
      const snap = s.redoStack.pop()!;
      s.undoStack.push({ lines: [...s.lines], cursor: cloneCursor(s.cursor) });
      s.lines = snap.lines; s.cursor = snap.cursor;
      return mk(s, 'Ctrl+r', true, true);
    }
    return mk(s, null, false, false);
  }

  // -- Ctrl+o / Ctrl+i (jump list) --
  if (key === 'Ctrl+o') {
    if (s.jumpList && s.jumpIdx !== undefined && s.jumpIdx > 0) {
      s.jumpIdx--;
      s.cursor = cloneCursor(s.jumpList[s.jumpIdx]);
      s.cursor = clampCursor(s.cursor, s.lines);
      return mk(s, 'Ctrl+o');
    }
    return mk(s, null, false, false);
  }
  if (key === 'Ctrl+i') {
    if (s.jumpList && s.jumpIdx !== undefined && s.jumpIdx < s.jumpList.length - 1) {
      s.jumpIdx++;
      s.cursor = cloneCursor(s.jumpList[s.jumpIdx]);
      s.cursor = clampCursor(s.cursor, s.lines);
      return mk(s, 'Ctrl+i');
    }
    return mk(s, null, false, false);
  }

  // -- . (dot repeat) --
  if (key === '.') {
    if (s.lastEdit.length > 0) {
      let cur = s;
      for (const k of s.lastEdit) { const r = processKey(cur, k); cur = r.newState; }
      return mk(cur, '.', true, true);
    }
    return mk(s, null, false, false);
  }

  // -- v/V (visual) --
  if (key === 'v') { s.mode = 'visual'; s.visualStart = cloneCursor(s.cursor); return mk(s, 'v'); }
  if (key === 'V') { s.mode = 'visual-line'; s.visualStart = cloneCursor(s.cursor); return mk(s, 'V'); }

  // -- >>/<<  --
  if (key === '>') { s.pendingOperator = '>'; return mk(s, null, true, false); }
  if (key === '<') { s.pendingOperator = '<'; return mk(s, null, true, false); }

  // -- marks --
  if (key === 'm') { s.pendingOperator = 'm'; return mk(s, null, true, false); }
  if (key === '`' || key === "'") { s.pendingOperator = key; return mk(s, null, true, false); }

  // -- zz (center screen — noop in our simple editor, but valid) --
  if (key === 'z') { /* just consume, would need a second z */ return mk(s, 'z'); }

  // -- q (macro record/stop) --
  if (key === 'q') {
    if (s.isRecording) {
      s.isRecording = false;
      s.macros[s.macroReg] = [...s.macroBuffer];
      s.macroBuffer = [];
      s.message = `Recorded @${s.macroReg}`;
      return mk(s, 'q');
    }
    s.pendingOperator = 'q_start';
    return mk(s, null, true, false);
  }

  // -- @ (play macro) --
  if (key === '@') { s.pendingOperator = '@_play'; return mk(s, null, true, false); }

  return mk(s, null, false, false);
}

// ---- Paste ----
function doPaste(s: EditorState, before: boolean): KeyResult {
  if (s.defaultRegister.length === 0) return mk(s, null, false, false);
  s.undoStack = pushSnapshot(s); s.redoStack = [];
  if (s.defaultRegister.length === 1 && !s.defaultRegister[0].includes('\n')) {
    const text = s.defaultRegister[0];
    const ln = s.lines[s.cursor.line];
    const pos = before ? s.cursor.col : s.cursor.col + 1;
    s.lines[s.cursor.line] = ln.slice(0, pos) + text + ln.slice(pos);
    s.cursor.col = pos + text.length - 1;
  } else {
    if (before) { s.lines.splice(s.cursor.line, 0, ...s.defaultRegister); }
    else { s.lines.splice(s.cursor.line + 1, 0, ...s.defaultRegister); s.cursor = { line: s.cursor.line + 1, col: 0 }; }
  }
  s.cursor = clampCursor(s.cursor, s.lines);
  return mk(s, before ? 'P' : 'p', true, true);
}

// ---- Macro playback ----
function playMacro(s: EditorState, reg: string): KeyResult {
  const keys = s.macros[reg];
  if (!keys || keys.length === 0) return mk(s, null, false, false);
  let cur = s;
  for (const k of keys) { const r = processKey(cur, k); cur = r.newState; }
  return mk(cur, '@' + reg, true, true);
}

// ---- Case transform for range ----
function caseRange(s: EditorState, r: TextRange, upper: boolean): void {
  if (r.linewise) {
    for (let i = r.startLine; i <= r.endLine; i++) s.lines[i] = upper ? s.lines[i].toUpperCase() : s.lines[i].toLowerCase();
  } else if (r.startLine === r.endLine) {
    const ln = s.lines[r.startLine];
    const part = ln.slice(r.startCol, r.endCol + 1);
    s.lines[r.startLine] = ln.slice(0, r.startCol) + (upper ? part.toUpperCase() : part.toLowerCase()) + ln.slice(r.endCol + 1);
  }
}

// ---- Operator pending (d/c/y + motion) ----
function handleOperatorPending(s: EditorState, key: string): KeyResult {
  const op = s.pendingOperator;
  const count = s.count || 1;

  if (key === 'Escape') { s.pendingOperator = ''; s.count = 0; return mk(s, null, true, false); }

  // dd/cc/yy
  if (key === op[0] && op.length === 1) {
    s.pendingOperator = ''; s.count = 0;
    if (op === 'd') {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      const d: string[] = [];
      for (let i = 0; i < count; i++) { if (s.cursor.line < s.lines.length) d.push(...s.lines.splice(s.cursor.line, 1)); }
      if (s.lines.length === 0) s.lines.push('');
      s.defaultRegister = d; s.cursor = clampCursor(s.cursor, s.lines);
      s.lastEdit = Array(count).fill('d').concat('d');
      return mk(s, 'dd', true, true);
    }
    if (op === 'c') {
      s.undoStack = pushSnapshot(s); s.redoStack = [];
      const d = s.lines.splice(s.cursor.line, count, '');
      s.defaultRegister = d; s.cursor = { line: s.cursor.line, col: 0 }; s.mode = 'insert';
      return mk(s, 'cc', true, true);
    }
    if (op === 'y') {
      const y = s.lines.slice(s.cursor.line, s.cursor.line + count);
      s.defaultRegister = y; s.message = `${y.length} line(s) yanked`;
      s.pendingOperator = '';
      return mk(s, 'yy');
    }
  }

  // text objects: di/da/ci/ca/yi/ya
  if (op.length === 1 && (key === 'i' || key === 'a')) {
    s.pendingOperator = op + key;
    return mk(s, null, true, false);
  }
  // text object second char
  if (op.length === 2 && (op[1] === 'i' || op[1] === 'a')) {
    return handleTextObject(s, op[0], op[1] as 'i' | 'a', key);
  }

  // f/F/t/T after operator
  if (op.length === 1 && 'fFtT'.includes(key)) {
    s.pendingOperator = op + key;
    return mk(s, null, true, false);
  }
  // df{x}, dt{x} etc
  if (op.length === 2 && 'fFtT'.includes(op[1])) {
    if (key.length === 1) {
      const ft = op[1] as 'f' | 'F' | 't' | 'T';
      let dest: Cursor | null = null;
      if (ft === 'f') dest = motionF(s, key, count); else if (ft === 'F') dest = motionFBack(s, key, count);
      else if (ft === 't') dest = motionT(s, key, count); else if (ft === 'T') dest = motionTBack(s, key, count);
      s.lastFind = { type: ft, char: key };
      s.pendingOperator = ''; s.count = 0;
      if (!dest) return mk(s, null, false, false);
      return applyOperator(s, op[0], dest, false, op + key);
    }
    s.pendingOperator = ''; return mk(s, null, false, false);
  }

  // motion keys
  let dest: Cursor | null = null;
  let linewise = false;
  let cmdName = op + key;
  switch (key) {
    case 'w': dest = motionW(s, count); break;
    case 'W': dest = motionWBig(s, count); break;
    case 'b': dest = motionB(s, count); break;
    case 'B': dest = motionBBig(s, count); break;
    case 'e': dest = motionE(s, count); break;
    case '0': dest = motion0(s); break;
    case '$': dest = motionDollar(s); break;
    case '^': dest = motionCaret(s); break;
    case 'h': dest = motionH(s, count); break;
    case 'l': dest = motionL(s, count); break;
    case 'j': dest = motionJ(s, count); linewise = true; break;
    case 'k': dest = motionK(s, count); linewise = true; break;
    case 'G': dest = motionG(s, null); linewise = true; break;
    case '{': dest = motionBraceBackward(s, count); linewise = true; break;
    case '}': dest = motionBraceForward(s, count); linewise = true; break;
    case '%': dest = motionPercent(s); break;
  }

  s.pendingOperator = ''; s.count = 0;
  if (!dest) return mk(s, null, false, false);
  return applyOperator(s, op[0], dest, linewise, cmdName);
}

function applyOperator(s: EditorState, op: string, dest: Cursor, linewise: boolean, cmdName: string): KeyResult {
  const range = rangeFromMotion(s, dest, linewise);
  if (op === 'd') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    const { lines, deleted } = deleteRange(s, range);
    s.lines = lines; s.defaultRegister = deleted;
    s.cursor = clampCursor({ line: range.startLine, col: range.startCol }, s.lines);
    s.lastEdit = [cmdName.length > 0 ? cmdName : 'dw'];
    return mk(s, cmdName, true, true);
  }
  if (op === 'c') {
    s.undoStack = pushSnapshot(s); s.redoStack = [];
    const { lines, deleted } = deleteRange(s, range);
    s.lines = lines; s.defaultRegister = deleted;
    s.cursor = clampCursor({ line: range.startLine, col: range.startCol }, s.lines);
    s.mode = 'insert';
    return mk(s, cmdName, true, true);
  }
  if (op === 'y') {
    if (range.linewise) s.defaultRegister = s.lines.slice(range.startLine, range.endLine + 1);
    else if (range.startLine === range.endLine) s.defaultRegister = [s.lines[range.startLine].slice(range.startCol, range.endCol + 1)];
    else {
      const r: string[] = [s.lines[range.startLine].slice(range.startCol)];
      for (let i = range.startLine + 1; i < range.endLine; i++) r.push(s.lines[i]);
      r.push(s.lines[range.endLine].slice(0, range.endCol + 1));
      s.defaultRegister = r;
    }
    s.message = 'Yanked';
    return mk(s, cmdName);
  }
  return mk(s, null, false, false);
}

// ---- Text Objects ----
function handleTextObject(s: EditorState, op: string, scope: 'i' | 'a', key: string): KeyResult {
  s.pendingOperator = ''; s.count = 0;
  const range = getTextObjectRange(s, scope, key);
  if (!range) return mk(s, null, false, false);
  // For text objects we need special range handling—set cursor to start, create dest as end
  const saved = cloneCursor(s.cursor);
  s.cursor = { line: range.startLine, col: range.startCol };
  const dest = { line: range.endLine, col: range.endCol };
  const result = applyOperator(s, op, dest, range.linewise, op + scope + key);
  return result;
}

function getTextObjectRange(state: EditorState, scope: 'i' | 'a', key: string): TextRange | null {
  const { lines, cursor } = state;
  const ln = lines[cursor.line] ?? '';

  // word
  if (key === 'w' || key === 'W') {
    let start = cursor.col, end = cursor.col;
    const big = key === 'W';
    if (big) {
      while (start > 0 && !isWhitespace(ln[start - 1])) start--;
      while (end < ln.length - 1 && !isWhitespace(ln[end + 1])) end++;
    } else {
      if (isWordChar(ln[cursor.col])) { while (start > 0 && isWordChar(ln[start - 1])) start--; while (end < ln.length - 1 && isWordChar(ln[end + 1])) end++; }
      else if (isPunctuation(ln[cursor.col])) { while (start > 0 && isPunctuation(ln[start - 1])) start--; while (end < ln.length - 1 && isPunctuation(ln[end + 1])) end++; }
    }
    if (scope === 'a') { while (end < ln.length - 1 && isWhitespace(ln[end + 1])) end++; }
    return { startLine: cursor.line, startCol: start, endLine: cursor.line, endCol: end, linewise: false };
  }

  // quotes
  const quoteChars = ['"', "'", '`'];
  if (quoteChars.includes(key)) {
    const first = ln.indexOf(key);
    const last = ln.lastIndexOf(key);
    if (first === -1 || first === last) return null;
    // find the pair surrounding cursor
    let open = -1, close = -1;
    // If cursor is between a pair
    for (let i = 0; i < ln.length; i++) {
      if (ln[i] === key) {
        if (open === -1) { open = i; } else { close = i; if (cursor.col >= open && cursor.col <= close) break; open = close; close = -1; }
      }
    }
    if (open === -1 || close === -1) return null;
    if (scope === 'i') return { startLine: cursor.line, startCol: open + 1, endLine: cursor.line, endCol: close - 1, linewise: false };
    return { startLine: cursor.line, startCol: open, endLine: cursor.line, endCol: close, linewise: false };
  }

  // brackets
  const brackets: Record<string, [string, string]> = {
    '(': ['(', ')'], ')': ['(', ')'], 'b': ['(', ')'],
    '{': ['{', '}'], '}': ['{', '}'], 'B': ['{', '}'],
    '[': ['[', ']'], ']': ['[', ']'],
    '<': ['<', '>'], '>': ['<', '>'],
  };
  const br = brackets[key];
  if (br) {
    const [open, close] = br;
    let depth = 0, sL = cursor.line, sC = cursor.col, found = false;
    outer1: for (let i = cursor.line; i >= 0; i--) {
      const l = lines[i];
      const sc = i === cursor.line ? cursor.col : l.length - 1;
      for (let j = sc; j >= 0; j--) {
        if (l[j] === close && !(i === cursor.line && j === cursor.col)) depth++;
        if (l[j] === open) { if (depth === 0) { sL = i; sC = j; found = true; break outer1; } depth--; }
      }
    }
    if (!found) return null;
    depth = 0; let eL = cursor.line, eC = cursor.col; found = false;
    outer2: for (let i = sL; i < lines.length; i++) {
      const l = lines[i]; const sc = i === sL ? sC : 0;
      for (let j = sc; j < l.length; j++) {
        if (l[j] === open && !(i === sL && j === sC)) depth++;
        if (l[j] === close) { if (depth === 0) { eL = i; eC = j; found = true; break outer2; } depth--; }
      }
    }
    if (!found) return null;
    if (scope === 'i') return { startLine: sL, startCol: sC + 1, endLine: eL, endCol: eC - 1, linewise: false };
    return { startLine: sL, startCol: sC, endLine: eL, endCol: eC, linewise: false };
  }

  // tag (simplified)
  if (key === 't') {
    // Simple: find < > pairs
    const lineStr = ln;
    const closeIdx = lineStr.indexOf('</', cursor.col);
    const openIdx = lineStr.lastIndexOf('<', cursor.col);
    if (openIdx === -1 || closeIdx === -1) return null;
    const openEnd = lineStr.indexOf('>', openIdx);
    const closeEnd = lineStr.indexOf('>', closeIdx);
    if (openEnd === -1 || closeEnd === -1) return null;
    if (scope === 'i') return { startLine: cursor.line, startCol: openEnd + 1, endLine: cursor.line, endCol: closeIdx - 1, linewise: false };
    return { startLine: cursor.line, startCol: openIdx, endLine: cursor.line, endCol: closeEnd, linewise: false };
  }

  // paragraph
  if (key === 'p') {
    let start = cursor.line, end = cursor.line;
    while (start > 0 && lines[start - 1].trim() !== '') start--;
    while (end < lines.length - 1 && lines[end + 1].trim() !== '') end++;
    if (scope === 'a') { while (end < lines.length - 1 && lines[end + 1].trim() === '') end++; }
    return { startLine: start, startCol: 0, endLine: end, endCol: (lines[end]?.length ?? 1) - 1, linewise: true };
  }

  return null;
}

// ---- Helper ----
function mk(s: EditorState, cmd: string | null, valid = true, isEdit = false): KeyResult {
  return { newState: s, executedCommand: cmd, valid, isEdit };
}