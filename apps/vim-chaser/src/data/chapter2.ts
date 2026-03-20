// ============================
// Chapter 2: 跳跃 — 词级 & 行级移动
// ============================

import type { Level, Chapter } from '@/types';

const levels: Level[] = [
  {
    id: 'ch2-1',
    chapter: 2,
    index: 1,
    title: '跳板',
    subtitle: 'Springboard',
    story: '一格一格地挪太慢了。按 w 可以跳到下一个单词的开头——像跳板一样！',
    task: '用 w 跳到 "world" 的开头',
    initialCode: [
      'const message = "hello world";',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'cursor', position: { line: 0, col: 24 }, description: '到达 "world"' },
    ],
    newCommands: [
      { keys: 'w', name: '下一个词', description: '跳到下一个单词开头' },
    ],
    hints: ['按 w 跳到下一个单词开头', '注意标点符号也算单词边界', '用 l 一步步走需要 24 步，用 w 只需几步'],
    starThresholds: [8, 5, 4],
  },
  {
    id: 'ch2-2',
    chapter: 2,
    index: 2,
    title: '回头看',
    subtitle: 'Look Back',
    story: '跳过头了？按 b 可以跳回上一个单词的开头。',
    task: '从行尾跳回到 "const" 的位置',
    initialCode: [
      'const greeting = "hello world";',
    ],
    initialCursor: { line: 0, col: 30 },
    goals: [
      { type: 'cursor', position: { line: 0, col: 0 }, description: '回到 "const"' },
    ],
    newCommands: [
      { keys: 'b', name: '上一个词', description: '跳到上一个单词开头' },
    ],
    hints: ['按 b 往回跳', '连续按 b 跳过多个单词'],
    starThresholds: [8, 5, 4],
  },
  {
    id: 'ch2-3',
    chapter: 2,
    index: 3,
    title: '精准落点',
    subtitle: 'Precision Landing',
    story: 'w 跳到词头，e 跳到词尾。有时候你需要落在一个单词的最后一个字符上。',
    task: '跳到 "greeting" 的最后一个字符 g 上',
    initialCode: [
      'const greeting = "hi";',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'cursor', position: { line: 0, col: 13 }, description: '到达 "greeting" 末尾' },
    ],
    newCommands: [
      { keys: 'e', name: '词尾', description: '跳到当前/下一个单词末尾' },
    ],
    hints: ['按 e 跳到单词末尾', '第一个 e 到 "const" 末尾，第二个 e 到 "greeting" 末尾'],
    starThresholds: [5, 3, 2],
  },
  {
    id: 'ch2-4',
    chapter: 2,
    index: 4,
    title: '大步流星',
    subtitle: 'Giant Leaps',
    story: '小 w 在标点处停留。大 W 则只在空白处停——跳得更远！',
    task: '用 W 跳到 "args" 的位置',
    initialCode: [
      'obj.method(args).then(callback);',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (state) => state.cursor.col >= 11 && state.cursor.col <= 14, description: '到达 "args" 区域' },
    ],
    newCommands: [
      { keys: 'W', name: '下一个 WORD', description: '跳到下一个空白分隔的词' },
      { keys: 'B', name: '上一个 WORD', description: '跳到上一个空白分隔的词' },
    ],
    hints: ['大 W 按空白分隔跳跃，不在 . 和 ( 处停留', '这行没有空格，所以 W 会跳到行尾——试试用 w 配合'],
    starThresholds: [6, 4, 3],
  },
  {
    id: 'ch2-5',
    chapter: 2,
    index: 5,
    title: '行首行尾',
    subtitle: 'Line Boundaries',
    story: '0 跳到行首，$ 跳到行尾。一步到位。',
    task: '先按 $ 到行尾，再按 0 回到行首',
    initialCode: [
      '    const result = compute(x, y);',
    ],
    initialCursor: { line: 0, col: 15 },
    goals: [
      { type: 'cursor', position: { line: 0, col: 0 }, description: '到达行首' },
    ],
    newCommands: [
      { keys: '0', name: '行首', description: '跳到行首（第 0 列）' },
      { keys: '$', name: '行尾', description: '跳到行尾' },
    ],
    hints: ['按 0（数字零）跳到行首', '按 $ 跳到行尾', '从中间出发，先 $ 再 0'],
    starThresholds: [4, 2, 1],
  },
  {
    id: 'ch2-6',
    chapter: 2,
    index: 6,
    title: '缩进起点',
    subtitle: 'Indentation Start',
    story: '^ 比 0 更聪明——它跳到第一个非空白字符。适合有缩进的代码。',
    task: '用 ^ 跳到缩进后的第一个字符',
    initialCode: [
      '        const indented = true;',
    ],
    initialCursor: { line: 0, col: 20 },
    goals: [
      { type: 'cursor', position: { line: 0, col: 8 }, description: '到达第一个非空白字符' },
    ],
    newCommands: [
      { keys: '^', name: '软行首', description: '跳到第一个非空白字符' },
    ],
    hints: ['按 ^ 跳到第一个非空白字符', '0 会到绝对行首（空白前），^ 会跳过前导空白'],
    starThresholds: [3, 2, 1],
  },
  {
    id: 'ch2-7',
    chapter: 2,
    index: 7,
    title: '代码跑酷',
    subtitle: 'Code Parkour',
    story: '综合运用 w/b/e/0/$，在代码中自由穿梭。',
    task: '到达第 3 行的 "callback" 开头',
    initialCode: [
      'function processData(input) {',
      '  const result = transform(input);',
      '  return result.then(callback);',
      '}',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'cursor', position: { line: 2, col: 22 }, description: '到达 "callback"' },
    ],
    newCommands: [],
    hints: ['先用 j 到第 3 行', '然后用 w 或 $ 快速横向移动', '试试 j j $ b 这样的组合'],
    starThresholds: [10, 6, 4],
  },
];

export const chapter2: Chapter = {
  id: 2,
  title: '跳跃',
  subtitle: 'Leap',
  description: '学会 w b e 0 $ ^ 等词级和行级移动，让光标飞起来。',
  levels,
};
