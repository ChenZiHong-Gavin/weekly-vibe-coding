// ============================
// Chapter 4: 编辑 — 插入模式 & 基础编辑
// ============================

import type { Level, Chapter } from '@/types';

const levels: Level[] = [
  {
    id: 'ch4-1',
    chapter: 4,
    index: 1,
    title: '在此插入',
    subtitle: 'Insert Here',
    story: '光会看不会改可不行。按 i 在光标前进入插入模式，输入文字，按 Esc 退出。',
    task: '在 "helo" 中间插入缺失的 l，变成 "hello"',
    initialCode: [
      'const msg = "helo";',
    ],
    initialCursor: { line: 0, col: 15 },
    goals: [
      { type: 'text', lineIndex: 0, expectedText: 'const msg = "hello";', description: '修复拼写错误' },
    ],
    newCommands: [
      { keys: 'i', name: '插入（光标前）', description: '在光标位置前进入插入模式' },
      { keys: 'a', name: '追加（光标后）', description: '在光标位置后进入插入模式' },
    ],
    hints: ['光标在 o 上', '按 i 进入插入模式，输入 l', '按 Esc 返回 Normal 模式'],
    starThresholds: [6, 4, 3],
  },
  {
    id: 'ch4-2',
    chapter: 4,
    index: 2,
    title: '行首行尾追加',
    subtitle: 'Head and Tail',
    story: 'I 在行首插入，A 在行尾追加。给代码加注释和分号再也不用先移光标了。',
    task: '在行尾添加缺失的分号 ;',
    initialCode: [
      'const x = 42',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'text', lineIndex: 0, expectedText: 'const x = 42;', description: '添加行尾分号' },
    ],
    newCommands: [
      { keys: 'I', name: '行首插入', description: '跳到行首第一个非空字符前并进入插入模式' },
      { keys: 'A', name: '行尾追加', description: '跳到行尾并进入插入模式' },
    ],
    hints: ['按 A 直接跳到行尾进入插入模式', '输入 ; 然后按 Esc'],
    starThresholds: [5, 4, 3],
  },
  {
    id: 'ch4-3',
    chapter: 4,
    index: 3,
    title: '开新行',
    subtitle: 'New Line',
    story: 'o 在下方开一行，O 在上方开一行。自动进入插入模式。',
    task: '在第 2 行下方新增一行 "  return x + y;"',
    initialCode: [
      'function add(x, y) {',
      '  const result = x + y;',
      '}',
    ],
    initialCursor: { line: 1, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length === 4 &&
        s.lines[2].trim() === 'return x + y;' &&
        s.mode === 'normal',
        description: '新增 return 语句',
      },
    ],
    newCommands: [
      { keys: 'o', name: '下方新行', description: '在当前行下方新增一行并进入插入模式' },
      { keys: 'O', name: '上方新行', description: '在当前行上方新增一行并进入插入模式' },
    ],
    hints: ['按 o 在下方开新行', '输入 "  return x + y;"（带两个空格缩进）', '按 Esc 退出插入模式'],
    starThresholds: [22, 18, 16],
  },
  {
    id: 'ch4-4',
    chapter: 4,
    index: 4,
    title: '单字替换',
    subtitle: 'Quick Replace',
    story: 'r 替换光标下的单个字符，不用进入插入模式。修 typo 最快的方式。',
    task: '把 "lat" 改成 "let"',
    initialCode: [
      'lat x = 10;',
    ],
    initialCursor: { line: 0, col: 1 },
    goals: [
      { type: 'text', lineIndex: 0, expectedText: 'let x = 10;', description: '修复 typo' },
    ],
    newCommands: [
      { keys: 'r{c}', name: '替换字符', description: '用字符 c 替换光标下的字符（不进入插入模式）' },
    ],
    hints: ['光标在 a 上', '按 r 然后按 e，a 就变成 e 了'],
    starThresholds: [4, 2, 2],
  },
  {
    id: 'ch4-5',
    chapter: 4,
    index: 5,
    title: '斩尾',
    subtitle: 'Chop the Tail',
    story: 'D 删除从光标到行尾。C 删除到行尾并进入插入模式。快速重写行尾内容。',
    task: '把返回值从 "null" 改成 "result"',
    initialCode: [
      'function getData() {',
      '  return null;',
      '}',
    ],
    initialCursor: { line: 1, col: 9 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[1].trim() === 'return result;' && s.mode === 'normal',
        description: '修改返回值',
      },
    ],
    newCommands: [
      { keys: 'D', name: '删到行尾', description: '删除从光标到行尾（不进入插入模式）' },
      { keys: 'C', name: '改到行尾', description: '删除从光标到行尾并进入插入模式' },
    ],
    hints: ['光标在 "null;" 的 n 上', '按 C 删掉 "null;"', '输入 "result;" 然后 Esc'],
    starThresholds: [10, 8, 7],
  },
  {
    id: 'ch4-6',
    chapter: 4,
    index: 6,
    title: '删字符',
    subtitle: 'Delete Char',
    story: 'x 删除光标下的字符。快速删除多余字符。',
    task: '删除多余的 o，把 "toooo" 变成 "too"',
    initialCode: [
      'const msg = "toooo much";',
    ],
    initialCursor: { line: 0, col: 17 },
    goals: [
      { type: 'custom', validate: (s) => s.lines[0].includes('"too much"'), description: '删除多余字符' },
    ],
    newCommands: [
      { keys: 'x', name: '删除字符', description: '删除光标下的字符' },
      { keys: 'X', name: '删除前一字符', description: '删除光标前的字符' },
    ],
    hints: ['按 x 删除光标下的字符', '按两次 x 删掉两个多余的 o'],
    starThresholds: [5, 3, 2],
  },
  {
    id: 'ch4-7',
    chapter: 4,
    index: 7,
    title: '删除整行',
    subtitle: 'Kill the Line',
    story: 'dd 删除整行。又快又狠。',
    task: '删除包含 "DELETE ME" 的行',
    initialCode: [
      'const keep1 = true;',
      '// DELETE ME',
      'const keep2 = true;',
    ],
    initialCursor: { line: 1, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length === 2 &&
        !s.lines.some(l => l.includes('DELETE')),
        description: '删除标记行',
      },
    ],
    newCommands: [
      { keys: 'dd', name: '删除整行', description: '删除光标所在的整行' },
    ],
    hints: ['光标已经在要删除的行上', '按 d 两次（dd）'],
    starThresholds: [4, 2, 2],
  },
  {
    id: 'ch4-8',
    chapter: 4,
    index: 8,
    title: '拼接合并',
    subtitle: 'Join Lines',
    story: 'J 把下一行接到当前行末尾。合并被拆散的代码。',
    task: '把两行合并成一行',
    initialCode: [
      'const message = "hello"',
      '  + " world";',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length === 1 &&
        s.lines[0].includes('"hello"') &&
        s.lines[0].includes('" world"'),
        description: '合并两行',
      },
    ],
    newCommands: [
      { keys: 'J', name: '合并行', description: '把下一行接到当前行末尾（用空格连接）' },
    ],
    hints: ['按 J（大写）合并当前行和下一行'],
    starThresholds: [3, 2, 1],
  },
  {
    id: 'ch4-9',
    chapter: 4,
    index: 9,
    title: '代码修复赛',
    subtitle: 'Bug Fix Rush',
    story: '这段代码有多个 bug。综合运用编辑命令修复它们！',
    task: '把 "conts" 改成 "const"，删除多余的空行，在行尾加分号',
    initialCode: [
      'conts x = 10',
      '',
      'console.log(x)',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length === 2 &&
        s.lines[0] === 'const x = 10;' &&
        s.lines[1] === 'console.log(x);',
        description: '修复所有 bug',
      },
    ],
    newCommands: [],
    hints: ['先用 f 定位到 "conts" 的 t，按 x 删掉它，然后用 f 或 $ 跳到行尾', '用 A 追加分号，用 j dd 删空行', '最后给 console.log 也加分号'],
    starThresholds: [18, 14, 10],
  },
];

export const chapter4: Chapter = {
  id: 4,
  title: '编辑',
  subtitle: 'Edit',
  description: '学会 i a o r x dd J C D 等编辑命令，开始改变代码世界。',
  levels,
};
