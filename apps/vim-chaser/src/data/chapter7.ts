// ============================
// Chapter 7: 视觉 — Visual Mode
// ============================

import type { Level, Chapter } from '@/types';

const levels: Level[] = [
  {
    id: 'ch7-1',
    chapter: 7,
    index: 1,
    title: '选择之力',
    subtitle: 'Power of Selection',
    story: '按 v 进入 Visual 模式，移动光标来选择文本，然后对选区执行操作（d 删除、y 复制、c 修改）。',
    task: '用 v 选中 "remove this" 然后按 d 删除',
    initialCode: [
      'const data = remove this"valid";',
    ],
    initialCursor: { line: 0, col: 13 },
    goals: [
      { type: 'text', lineIndex: 0, expectedText: 'const data = "valid";', description: '删除多余文字' },
    ],
    newCommands: [
      { keys: 'v', name: 'Visual 模式', description: '按字符选择文本' },
      { keys: 'V', name: 'Visual Line 模式', description: '按整行选择文本' },
      { keys: 'Ctrl+v', name: 'Visual Block 模式', description: '按矩形块选择文本' },
    ],
    hints: ['按 v 进入选择模式', '按 e 或 w 选到 "this" 末尾', '按 d 删除选中的文本'],
    starThresholds: [8, 6, 4],
  },
  {
    id: 'ch7-2',
    chapter: 7,
    index: 2,
    title: '整行选取',
    subtitle: 'Line Select',
    story: 'V（大写）进入行选择模式。选中整行后可以删除、复制、移动。',
    task: '选中中间两行，按 d 删除',
    initialCode: [
      'keep this',
      'delete this line 1',
      'delete this line 2',
      'keep this too',
    ],
    initialCursor: { line: 1, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.length === 2 &&
        s.lines[0] === 'keep this' &&
        s.lines[1] === 'keep this too',
        description: '删除中间两行',
      },
    ],
    newCommands: [],
    hints: ['按 V 进入行选择模式', '按 j 向下选择一行', '按 d 删除选中的两行'],
    starThresholds: [5, 4, 3],
  },
  {
    id: 'ch7-3',
    chapter: 7,
    index: 3,
    title: '缩进调整',
    subtitle: 'Indent Adjust',
    story: 'Visual 模式选中后，按 > 增加缩进，< 减少缩进。格式化代码的利器。',
    task: '给函数体（第 2-3 行）增加缩进',
    initialCode: [
      'function greet() {',
      'const name = "world";',
      'console.log(name);',
      '}',
    ],
    initialCursor: { line: 1, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[1].startsWith('  ') &&
        s.lines[2].startsWith('  '),
        description: '正确缩进函数体',
      },
    ],
    newCommands: [
      { keys: '>', name: '增加缩进', description: '对选中行增加一级缩进' },
      { keys: '<', name: '减少缩进', description: '对选中行减少一级缩进' },
      { keys: '=', name: '自动缩进', description: '自动格式化选中行的缩进' },
    ],
    hints: ['按 V 选中第 2 行', '按 j 扩展选择到第 3 行', '按 > 增加缩进'],
    starThresholds: [6, 4, 3],
  },
  {
    id: 'ch7-4',
    chapter: 7,
    index: 4,
    title: '大小写切换',
    subtitle: 'Case Toggle',
    story: '选中文本后按 ~ 或 U/u 切换大小写。',
    task: '把 "hello" 全部变成大写',
    initialCode: [
      'const GREETING = "hello";',
    ],
    initialCursor: { line: 0, col: 18 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].includes('"HELLO"'),
        description: '转为大写',
      },
    ],
    newCommands: [
      { keys: '~', name: '切换大小写', description: '切换光标下字符的大小写' },
      { keys: 'gU{motion}', name: '转大写', description: '将选区转为大写' },
      { keys: 'gu{motion}', name: '转小写', description: '将选区转为小写' },
    ],
    hints: ['按 viw 选中 hello', '按 U 全部转大写', '或者用 gUiw 不进入 visual 模式也行'],
    starThresholds: [8, 5, 3],
  },
  {
    id: 'ch7-5',
    chapter: 7,
    index: 5,
    title: '选中替换',
    subtitle: 'Select and Replace',
    story: 'Visual 选中后按 r{char} 把所有选中字符替换为同一个字符。',
    task: '把分隔线的 - 全部替换成 =',
    initialCode: [
      '// ----------',
      '// Section 1',
      '// ----------',
    ],
    initialCursor: { line: 0, col: 3 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].includes('==========') &&
        !s.lines[0].includes('-'),
        description: '替换分隔符',
      },
    ],
    newCommands: [],
    hints: ['按 v 进入选择模式', '按 $ 选到行尾', '按 r 然后按 =，所有选中的字符变成 ='],
    starThresholds: [6, 4, 3],
  },
  {
    id: 'ch7-6',
    chapter: 7,
    index: 6,
    title: '视觉大师',
    subtitle: 'Visual Master',
    story: '综合运用 Visual 模式完成复杂编辑。',
    task: '1) 删除注释行 2) 缩进函数体 3) 改变量名大写',
    initialCode: [
      '// TODO: cleanup',
      'function process() {',
      'const myVar = 42;',
      'return myVar;',
      '}',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        !s.lines.some(l => l.includes('TODO')) &&
        s.lines.some(l => l.includes('  const') || l.includes('  return')),
        description: '完成所有修改',
      },
    ],
    newCommands: [],
    hints: [
      'V + d 删除注释行',
      'V + j 选中函数体两行',
      '> 增加缩进',
    ],
    starThresholds: [14, 10, 7],
  },
];

export const chapter7: Chapter = {
  id: 7,
  title: '视觉',
  subtitle: 'Visual',
  description: '掌握 Visual 模式 — v V Ctrl+v 选择文本，配合操作符实现批量编辑。',
  levels,
};
