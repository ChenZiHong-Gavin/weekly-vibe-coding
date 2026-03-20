// ============================
// Chapter 10: 大师 — Master Challenge
// ============================

import type { Level, Chapter } from '@/types';

const levels: Level[] = [
  {
    id: 'ch10-1',
    chapter: 10,
    index: 1,
    title: '代码重构',
    subtitle: 'Refactor',
    story: '真实场景：重命名变量、调整结构、清理代码。一气呵成。',
    task: '重构这段代码：变量名 a→total, b→count, 加缩进和分号',
    initialCode: [
      'function calc() {',
      'var a = 0',
      'var b = 10',
      'for (var i=0; i<b; i++) {',
      'a += i',
      '}',
      'return a',
      '}',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.some(l => l.includes('total')) &&
        s.lines.some(l => l.includes('count')) &&
        !s.lines.some(l => /\bvar a\b/.test(l)) &&
        !s.lines.some(l => /\bvar b\b/.test(l)),
        description: '重构完成',
      },
    ],
    newCommands: [],
    hints: [
      '用 :%s/\\ba\\b/total/g 替换 a→total',
      '用 :%s/\\bb\\b/count/g 替换 b→count',
      '用 V 选中函数体 + > 加缩进',
    ],
    starThresholds: [40, 28, 20],
  },
  {
    id: 'ch10-2',
    chapter: 10,
    index: 2,
    title: '快速修 Bug',
    subtitle: 'Speed Debug',
    story: '这段代码有 5 个 bug。用最少的操作修复它们。',
    task: '修复所有 bug',
    initialCode: [
      'fucntion fibonacci(n) {',
      '  if (n <= 1) retrun n;',
      '  const a = fibonaci(n - 1);',
      '  const b = fibonacci(n - 2)',
      '  return a + b',
      '}',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines[0].startsWith('function ') &&
        s.lines[1].includes('return n;') &&
        s.lines[2].includes('fibonacci(n - 1);') &&
        s.lines[3].endsWith(';') &&
        s.lines[4].endsWith(';'),
        description: '修复所有 bug',
      },
    ],
    newCommands: [],
    hints: [
      'Bug 1: fucntion → function',
      'Bug 2: retrun → return',
      'Bug 3: fibonaci → fibonacci（少了一个 c）',
      'Bug 4-5: 缺分号',
    ],
    starThresholds: [30, 22, 16],
  },
  {
    id: 'ch10-3',
    chapter: 10,
    index: 3,
    title: '代码高尔夫',
    subtitle: 'Code Golf',
    story: '用最少的按键完成编辑。每一步都要精打细算。',
    task: '把所有 console.log 改成 logger.info',
    initialCode: [
      'console.log("start");',
      'const data = fetch("/api");',
      'console.log(data);',
      'const result = process(data);',
      'console.log("done:", result);',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        !s.lines.some(l => l.includes('console.log')) &&
        s.lines.filter(l => l.includes('logger.info')).length === 3,
        description: '全部替换',
      },
    ],
    newCommands: [],
    hints: [
      '最快方式：:%s/console.log/logger.info/g',
      '也可以用宏或 . 命令',
      '按键数越少，星级越高！',
    ],
    starThresholds: [22, 16, 12],
  },
  {
    id: 'ch10-4',
    chapter: 10,
    index: 4,
    title: '配置大师',
    subtitle: 'Config Master',
    story: '编辑真实的配置文件，这是日常 Vim 使用的场景。',
    task: '修改配置：把 port 改成 8080，debug 改成 true',
    initialCode: [
      '{',
      '  "host": "localhost",',
      '  "port": 3000,',
      '  "debug": false,',
      '  "timeout": 5000',
      '}',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) =>
        s.lines.some(l => l.includes('8080')) &&
        s.lines.some(l => l.includes('true')) &&
        !s.lines.some(l => l.includes('3000')) &&
        !s.lines.some(l => l.includes('false')),
        description: '修改配置值',
      },
    ],
    newCommands: [],
    hints: [
      '/3000 找到端口号，ciw 改成 8080',
      '/false 找到 debug，ciw 改成 true',
    ],
    starThresholds: [18, 12, 8],
  },
  {
    id: 'ch10-5',
    chapter: 10,
    index: 5,
    title: '终极试炼',
    subtitle: 'Final Boss',
    story: '你已经掌握了 Vim 的全部基础。这是最终的考验——用你学到的一切，以最高效率完成复杂编辑！',
    task: '重构整个文件：修复错误、改名、格式化、加注释',
    initialCode: [
      'var getUserData = function(userId) {',
      'var result = fetch("/users/" + userId)',
      'var name = result.name',
      'var email = result.email',
      'console.log(name, email)',
      'return {name: name, email: email}',
      '}',
    ],
    initialCursor: { line: 0, col: 0 },
    goals: [
      { type: 'custom', validate: (s) => {
        const joined = s.lines.join('\n');
        return (
          joined.includes('const') &&
          !joined.includes('var ') &&
          s.lines.filter(l => l.endsWith(';')).length >= 4 &&
          s.lines.some(l => l.startsWith('  '))
        );
      }, description: '完成终极重构' },
    ],
    newCommands: [],
    hints: [
      '步骤 1: :%s/var /const /g 把所有 var 改成 const',
      '步骤 2: V 选函数体 + > 加缩进',
      '步骤 3: 给每个语句加分号',
      '这是终极挑战，用你学到的一切！',
    ],
    starThresholds: [40, 28, 18],
  },
];

export const chapter10: Chapter = {
  id: 10,
  title: '大师',
  subtitle: 'Master',
  description: '终极挑战 — 综合运用所有 Vim 技能，在真实场景中展示你的实力。',
  levels,
};
