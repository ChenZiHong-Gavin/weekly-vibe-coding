// ============================
// Chapter 6: 文本对象 — The Vim Superpower
// ============================

import type { Level, Chapter } from '@/types';

const levels: Level[] = [
  {
    id: 'ch6-1',
    chapter: 6,
    index: 1,
    title: '词之核心',
    subtitle: 'Inner Word',
    story: '文本对象是 Vim 最强大的概念。iw = inner word（词内部），aw = a word（词+空格）。配合 d/c/y 使用：diw = 删除光标所在词。',
    task: '用 ciw 把 "wrong" 改成 "right"',
    initialCode: [
      'const answer = "wrong";',
    ],
    initialCursor: { line: 0, col: 18 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].includes('"right"') && s.mode === 'normal',
        description: '替换单词',
      },
    ],
    newCommands: [
      { keys: 'iw', name: '词内部', description: '选中光标所在的整个词（不含周围空格）' },
      { keys: 'aw', name: '一个词', description: '选中光标所在的整个词 + 一个空格' },
      { keys: 'ciw', name: '改词', description: '删除光标所在词并进入插入模式' },
      { keys: 'diw', name: '删词', description: '删除光标所在词' },
    ],
    hints: ['光标在 "wrong" 上任意位置都行', '按 ciw，整个 "wrong" 被删掉', '输入 "right" 然后 Esc'],
    starThresholds: [10, 7, 6],
  },
  {
    id: 'ch6-2',
    chapter: 6,
    index: 2,
    title: '括号领地',
    subtitle: 'Bracket Territory',
    story: 'i( = 括号内部。a( = 括号+括号本身。di( 删掉括号里的内容，da( 连括号一起删。',
    task: '用 ci( 把函数参数从 "oldArg" 改成 "newArg"',
    initialCode: [
      'myFunction(oldArg);',
    ],
    initialCursor: { line: 0, col: 12 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].includes('myFunction(newArg)') && s.mode === 'normal',
        description: '修改括号内容',
      },
    ],
    newCommands: [
      { keys: 'i(', name: '括号内部', description: '选中圆括号内部内容（也可以用 ib）' },
      { keys: 'a(', name: '整个括号', description: '选中圆括号 + 内部内容（也可以用 ab）' },
      { keys: 'i{', name: '花括号内部', description: '选中花括号内部内容（也可以用 iB）' },
      { keys: 'i[', name: '方括号内部', description: '选中方括号内部内容' },
    ],
    hints: ['光标在括号内部', '按 ci(，括号里的内容被清空', '输入 newArg 然后 Esc'],
    starThresholds: [10, 7, 5],
  },
  {
    id: 'ch6-3',
    chapter: 6,
    index: 3,
    title: '引号猎手',
    subtitle: 'Quote Hunter',
    story: 'i" 选中引号内部。字符串操作的利器。不管光标在字符串哪个位置都能用！',
    task: '用 ci" 把字符串内容从 "old text" 改成 "new text"',
    initialCode: [
      'const greeting = "old text";',
    ],
    initialCursor: { line: 0, col: 22 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].includes('"new text"') && s.mode === 'normal',
        description: '修改字符串内容',
      },
    ],
    newCommands: [
      { keys: "i\"", name: '双引号内部', description: '选中双引号内部内容' },
      { keys: "i'", name: '单引号内部', description: '选中单引号内部内容' },
      { keys: 'i`', name: '反引号内部', description: '选中反引号内部内容' },
    ],
    hints: ['光标在引号内部任何位置', '按 ci"，引号里的内容被清空', '输入 new text 然后 Esc'],
    starThresholds: [12, 8, 7],
  },
  {
    id: 'ch6-4',
    chapter: 6,
    index: 4,
    title: '标签之间',
    subtitle: 'Between Tags',
    story: 'it 选中 HTML 标签内部。写前端的必杀技！',
    task: '把标签内的文字改成 "Hello World"',
    initialCode: [
      '<h1>Old Title</h1>',
    ],
    initialCursor: { line: 0, col: 6 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0] === '<h1>Hello World</h1>' && s.mode === 'normal',
        description: '修改标签内容',
      },
    ],
    newCommands: [
      { keys: 'it', name: '标签内部', description: '选中 HTML 标签内部内容' },
      { keys: 'at', name: '整个标签', description: '选中标签 + 内部内容' },
    ],
    hints: ['按 cit，标签内的文字被清空', '输入 Hello World', '按 Esc'],
    starThresholds: [16, 12, 10],
  },
  {
    id: 'ch6-5',
    chapter: 6,
    index: 5,
    title: '段落对象',
    subtitle: 'Paragraph Object',
    story: 'ip = 段落内部（到空行为止）。dip 一次删除整个函数体。',
    task: '删除整个第二个函数（middle）',
    initialCode: [
      'function first() { return 1; }',
      '',
      'function middle() { return 2; }',
      '',
      'function last() { return 3; }',
    ],
    initialCursor: { line: 2, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        !s.lines.some(l => l.includes('middle')),
        description: '删除 middle 函数',
      },
    ],
    newCommands: [
      { keys: 'ip', name: '段落内部', description: '选中当前段落（到空行为止）' },
      { keys: 'ap', name: '整个段落', description: '选中段落 + 后面的空行' },
    ],
    hints: ['光标在 middle 函数上', '按 dap 删除整个段落（含空行）'],
    starThresholds: [5, 3, 2],
  },
  {
    id: 'ch6-6',
    chapter: 6,
    index: 6,
    title: '文本对象大师',
    subtitle: 'Text Object Master',
    story: '综合挑战！用各种文本对象快速编辑代码。',
    task: '1) 改函数名 2) 改参数 3) 改返回字符串',
    initialCode: [
      'function oldFunc(oldParam) {',
      '  return "old value";',
      '}',
    ],
    initialCursor: { line: 0, col: 10 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].includes('newFunc') &&
        s.lines[0].includes('newParam') &&
        s.lines[1].includes('"new value"') &&
        s.mode === 'normal',
        description: '全部替换完成',
      },
    ],
    newCommands: [],
    hints: [
      'ciw 改函数名为 newFunc',
      'f( 然后 ci( 改参数为 newParam',
      'j 到第二行，ci" 改字符串为 new value',
    ],
    starThresholds: [22, 16, 12],
  },
];

export const chapter6: Chapter = {
  id: 6,
  title: '精准',
  subtitle: 'Precision',
  description: '掌握文本对象 — iw aw i( a( i" it 等，精准选中目标，编辑效率翻倍。',
  levels,
};
