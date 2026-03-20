// ============================
// Chapter 8: 宏 — Macros & Registers
// ============================

import type { Level, Chapter } from '@/types';

const levels: Level[] = [
  {
    id: 'ch8-1',
    chapter: 8,
    index: 1,
    title: '复制之道',
    subtitle: 'Copy Paste Pro',
    story: 'Vim 用寄存器而非剪贴板。"ayy 把整行复制到寄存器 a。"ap 从寄存器 a 粘贴。',
    task: '用 yy 复制第一行，p 粘贴到下面',
    initialCode: [
      'console.log("hello");',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length >= 2 &&
        s.lines[0] === 'console.log("hello");' &&
        s.lines[1] === 'console.log("hello");',
        description: '复制粘贴成功',
      },
    ],
    newCommands: [
      { keys: 'yy', name: '复制整行', description: '复制当前行' },
      { keys: 'p', name: '粘贴到下面', description: '在光标下方粘贴' },
      { keys: 'P', name: '粘贴到上面', description: '在光标上方粘贴' },
      { keys: '"a', name: '指定寄存器', description: '下一个操作使用寄存器 a' },
    ],
    hints: ['按 yy 复制当前行', '按 p 粘贴到下方'],
    starThresholds: [4, 3, 2],
  },
  {
    id: 'ch8-2',
    chapter: 8,
    index: 2,
    title: '搬运工',
    subtitle: 'Line Mover',
    story: 'dd + p = 剪切粘贴。把行移到别的位置。',
    task: '把 return 语句移到函数末尾',
    initialCode: [
      'function calc() {',
      '  return result;',
      '  const a = 10;',
      '  const result = a * 2;',
      '}',
    ],
    initialCursor: { line: 1, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[s.lines.length - 2].includes('return result') &&
        s.lines[0] === 'function calc() {',
        description: '移动 return 到正确位置',
      },
    ],
    newCommands: [
      { keys: 'ddp', name: '下移一行', description: 'dd 剪切 + p 粘贴 = 下移当前行' },
      { keys: 'ddkP', name: '上移一行', description: 'dd 剪切 + k 上移 + P 上方粘贴' },
    ],
    hints: ['dd 剪切 return 行', 'j 移到 result 行后面', 'p 粘贴'],
    starThresholds: [8, 5, 4],
  },
  {
    id: 'ch8-3',
    chapter: 8,
    index: 3,
    title: '录制宏',
    subtitle: 'Record Macro',
    story: 'q{reg} 开始录制宏到寄存器。再按 q 停止。@{reg} 回放宏。',
    task: '给每行行尾加分号（用宏录制一次，重放两次）',
    initialCode: [
      'const a = 1',
      'const b = 2',
      'const c = 3',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.every(l => l.endsWith(';')),
        description: '每行都有分号',
      },
    ],
    newCommands: [
      { keys: 'q{r}', name: '录制宏', description: '开始录制宏到寄存器 r，再按 q 停止' },
      { keys: '@{r}', name: '回放宏', description: '执行寄存器 r 中录制的宏' },
      { keys: '@@', name: '重放上次宏', description: '再次执行上次回放的宏' },
    ],
    hints: [
      'qa 开始录制到寄存器 a',
      'A; Esc j 给行尾加分号并移到下一行',
      'q 停止录制',
      '@a 回放一次，@@ 再回放一次',
    ],
    starThresholds: [14, 10, 8],
  },
  {
    id: 'ch8-4',
    chapter: 8,
    index: 4,
    title: '点命令',
    subtitle: 'Dot Command',
    story: '按 . 重复上一次编辑操作。简单但强大——Vim 效率的秘密武器。',
    task: '用 . 重复 ciw 操作把所有 "old" 改成 "new"',
    initialCode: [
      'const old = getOld();',
      'setOld(old);',
      'return old;',
    ],
    initialCursor: { line: 0, col: 6 },
    goals: [
      { type: 'custom', validate: (s) =>
        !s.lines.some(l => l.includes('old')) &&
        s.lines.some(l => l.includes('new')),
        description: '全部替换',
      },
    ],
    newCommands: [
      { keys: '.', name: '重复上次编辑', description: '重复上一次的编辑操作' },
    ],
    hints: [
      '先 ciw 把第一个 "old" 改成 "new"，Esc',
      '用 n 或 w/f 跳到下一个 old',
      '按 . 重复修改，不用再输入 "new"',
    ],
    starThresholds: [20, 14, 10],
  },
  {
    id: 'ch8-5',
    chapter: 8,
    index: 5,
    title: '批量处理',
    subtitle: 'Batch Process',
    story: '综合运用宏和点命令完成批量编辑。',
    task: '把所有 var 改成 const 并加分号',
    initialCode: [
      'var x = 1',
      'var y = 2',
      'var z = 3',
      'var w = 4',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.every(l => l.startsWith('const ') && l.endsWith(';')),
        description: '全部修改完成',
      },
    ],
    newCommands: [],
    hints: [
      '方法 1：录制宏 qa → cw const Esc A; Esc j q → 3@a',
      '方法 2：cw const Esc A; Esc → j. 但 . 只重复最后一个操作',
      '宏更适合这种多步骤重复',
    ],
    starThresholds: [20, 14, 10],
  },
];

export const chapter8: Chapter = {
  id: 8,
  title: '效率',
  subtitle: 'Efficiency',
  description: '掌握寄存器、宏和点命令 — yy p dd "a q @。批量编辑的终极武器。',
  levels,
};
