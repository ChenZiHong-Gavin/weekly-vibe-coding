// ============================
// Chapter 5: 组合 — Operator + Motion
// ============================

import type { Level, Chapter } from '@/types';

const levels: Level[] = [
  {
    id: 'ch5-1',
    chapter: 5,
    index: 1,
    title: '删词',
    subtitle: 'Delete Word',
    story: 'Vim 的核心语法：{operator}{motion}。d 是删除 operator，w 是词 motion。dw = 删除一个词。',
    task: '用 dw 删除 "bad" 这个词（含后面的空格）',
    initialCode: [
      'const bad result = 42;',
    ],
    initialCursor: { line: 0, col: 6 },
    goals: [
      { type: 'text', lineIndex: 0, expectedText: 'const result = 42;', description: '删除多余的词' },
    ],
    newCommands: [
      { keys: 'dw', name: '删除到下一个词', description: 'operator d + motion w = 删除到下一个词开头' },
      { keys: 'db', name: '删除到上一个词', description: 'operator d + motion b = 向前删除一个词' },
      { keys: 'de', name: '删除到词尾', description: 'operator d + motion e = 删除到当前词末尾' },
    ],
    hints: ['光标在 "bad" 的 b 上', '按 d 然后按 w', 'dw 会删除 "bad " 四个字符'],
    starThresholds: [4, 2, 2],
  },
  {
    id: 'ch5-2',
    chapter: 5,
    index: 2,
    title: '删到目标',
    subtitle: 'Delete to Target',
    story: 'df{char} = 删除到字符。d$ = 删到行尾。d0 = 删到行首。Operator 可以接任何 motion！',
    task: '用 d$ 删掉行尾的注释',
    initialCode: [
      'const x = 42; // TODO: remove this comment',
    ],
    initialCursor: { line: 0, col: 14 },
    goals: [
      { type: 'text', lineIndex: 0, expectedText: 'const x = 42;', description: '删除行尾注释' },
    ],
    newCommands: [
      { keys: 'd$', name: '删到行尾', description: '从光标删除到行尾' },
      { keys: 'd0', name: '删到行首', description: '从光标删除到行首' },
      { keys: 'df{c}', name: '删到字符', description: '从光标删除到字符 c（含）' },
      { keys: 'dt{c}', name: '删到字符前', description: '从光标删除到字符 c（不含）' },
    ],
    hints: ['光标在分号后的空格上', '按 D 或 d$ 删掉后面所有内容'],
    starThresholds: [4, 2, 1],
  },
  {
    id: 'ch5-3',
    chapter: 5,
    index: 3,
    title: '改词',
    subtitle: 'Change Word',
    story: 'c 和 d 一样是 operator，但它删除后自动进入插入模式。cw = 改一个词。',
    task: '用 cw 把 "old" 改成 "new"',
    initialCode: [
      'const value = "old";',
    ],
    initialCursor: { line: 0, col: 15 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].includes('"new"') && s.mode === 'normal',
        description: '替换单词',
      },
    ],
    newCommands: [
      { keys: 'cw', name: '改到下一个词', description: '删除到下一个词开头并进入插入模式' },
      { keys: 'ce', name: '改到词尾', description: '删除到词尾并进入插入模式' },
      { keys: 'cc', name: '改整行', description: '清空整行并进入插入模式' },
    ],
    hints: ['光标在 "old" 的 o 上', '按 c 然后 w，"old" 被删掉并进入插入模式', '输入 "new" 然后按 Esc'],
    starThresholds: [8, 5, 4],
  },
  {
    id: 'ch5-4',
    chapter: 5,
    index: 4,
    title: '复制范围',
    subtitle: 'Yank Range',
    story: 'y 是复制 operator。yw = 复制一个词。y$ = 复制到行尾。然后 p 粘贴。',
    task: '复制 "hello" 并粘贴到行尾',
    initialCode: [
      'const a = "hello";',
      'const b = "";',
    ],
    initialCursor: { line: 0, col: 11 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[1].includes('hello'),
        description: '复制粘贴成功',
      },
    ],
    newCommands: [
      { keys: 'yw', name: '复制一个词', description: '复制到下一个词开头' },
      { keys: 'y$', name: '复制到行尾', description: '从光标复制到行尾' },
      { keys: 'yy', name: '复制整行', description: '复制当前整行' },
      { keys: 'p', name: '粘贴', description: '在光标后粘贴' },
    ],
    hints: ['先 yw 复制 "hello"', '然后 j 移到第二行', '移到引号中间，按 p 粘贴'],
    starThresholds: [12, 8, 6],
  },
  {
    id: 'ch5-5',
    chapter: 5,
    index: 5,
    title: '数字倍增',
    subtitle: 'Multiply',
    story: '几乎所有命令都可以加数字前缀。3dw = 删3个词。5j = 下移5行。',
    task: '用 3dw 一次性删掉三个多余的词',
    initialCode: [
      'const aaa bbb ccc result = 42;',
    ],
    initialCursor: { line: 0, col: 6 },
    goals: [
      { type: 'text', lineIndex: 0, expectedText: 'const result = 42;', description: '删除三个词' },
    ],
    newCommands: [
      { keys: '{n}dw', name: 'N 次删词', description: '数字前缀 + 操作 = 重复 N 次' },
      { keys: '{n}j', name: 'N 次下移', description: '数字可以用于任何移动命令' },
    ],
    hints: ['按 3 然后 dw', '效果等于 dw dw dw'],
    starThresholds: [6, 4, 3],
  },
  {
    id: 'ch5-6',
    chapter: 5,
    index: 6,
    title: '撤销与重做',
    subtitle: 'Undo & Redo',
    story: '犯了错？u 撤销。撤多了？Ctrl+r 重做。Vim 不怕你犯错。',
    task: '先用 dd 删掉第 2 行，然后按 u 撤销',
    initialCode: [
      'line 1: keep',
      'line 2: keep',
      'line 3: keep',
    ],
    initialCursor: { line: 1, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length === 3 &&
        s.lines[1].includes('line 2'),
        description: '撤销删除',
      },
    ],
    newCommands: [
      { keys: 'u', name: '撤销', description: '撤销上一步操作' },
      { keys: 'Ctrl+r', name: '重做', description: '重做被撤销的操作' },
    ],
    hints: ['先按 dd 删除第二行', '然后按 u 撤销删除', '三行又回来了'],
    starThresholds: [5, 4, 3],
  },
  {
    id: 'ch5-7',
    chapter: 5,
    index: 7,
    title: '语法拼图',
    subtitle: 'Syntax Puzzle',
    story: '综合挑战！用 operator + motion 组合以最少按键完成编辑。',
    task: '删除函数参数列表中 "extra, " 部分',
    initialCode: [
      'function calc(extra, a, b) {',
      '  return a + b;',
      '}',
    ],
    initialCursor: { line: 0, col: 14 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0] === 'function calc(a, b) {',
        description: '清理参数',
      },
    ],
    newCommands: [],
    hints: ['光标在 "extra" 的 e 上', '试试 dw 或 d2w', '也许 dt 配合逗号更精准？'],
    starThresholds: [6, 4, 2],
  },
  {
    id: 'ch5-8',
    chapter: 5,
    index: 8,
    title: '连招挑战',
    subtitle: 'Combo Challenge',
    story: '修复这段代码中的多个问题。用你学到的一切！',
    task: '修复全部问题：删多余行、改变量名、加分号',
    initialCode: [
      'const oldName = 100',
      '',
      'console.log(oldName)',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length === 2 &&
        s.lines[0] === 'const newName = 100;' &&
        s.lines[1] === 'console.log(newName);',
        description: '修复所有问题',
      },
    ],
    newCommands: [],
    hints: [
      '1. cw 把 oldName 改成 newName',
      '2. A; Esc 加分号',
      '3. j dd 删空行',
      '4. 对第二行也做类似修改',
    ],
    starThresholds: [25, 18, 14],
  },
];

export const chapter5: Chapter = {
  id: 5,
  title: '组合',
  subtitle: 'Combine',
  description: '掌握 Vim 的核心语法 — operator + motion。dw cw y$ 3dd 等组合技让效率飞跃。',
  levels,
};
