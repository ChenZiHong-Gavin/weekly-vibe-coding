import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, describeRecipe, suggestTitle, recipeSeed, makeRng } from '../src/recipe.js';

const potSteps = [{ op: 'stew', heat: 1, seed: 1 }, { op: 'reduce', heat: 3, seed: 2 }];
const rows = [
  { ingredientId: 'a', steps: ['slice', 'season'], amount: 3, potSteps, ingredient: { name: '海边的傍晚', flavor: '海风', colors: ['#f7b267', '#5c4b8a'], steps: ['slice', 'season'], inAt: 0 } },
  { ingredientId: 'b', steps: ['mix', 'mash'], amount: 1, potSteps: [], ingredient: { name: '外婆家的厨房', flavor: '', colors: [], steps: ['mix', 'mash'], parts: [{ name: '灶台', steps: ['dice'] }, { name: '窗', steps: [] }], inAt: 2 } },
];

test('prompt lists every ingredient with its steps in order, amount, colors and the method', () => {
  const p = buildPrompt(rows, { method: 'steam', heat: 3, title: '', steps: potSteps });
  assert.match(p, /a generous amount of "海边的傍晚" \(dominant colors #f7b267, #5c4b8a\), on the board sliced \(keep its recognizable details, in strips\), then salted \(crisper, a little sparkle\); in the pot: stewed [^;]*on low heat, then glazed in a reduced sauce \(deep, glossy\) on high heat, it tastes like "海风"/);
  assert.match(p, /a pinch of "外婆家的厨房", on the board tossed together from "灶台" \(diced [^)]*\)\) and "窗" \(as it is\), then mashed [^;]*; in the pot: added at the very end/);
  assert.match(p, /In the pot, in order: stewed/);
  assert.match(p, /Overall look, steam:/);
  assert.match(p, /high heat/);
  assert.doesNotMatch(p, /The dish is called/);
});

test('prompt includes the title when given and falls back for unknown method', () => {
  const p = buildPrompt(rows, { method: 'nope', heat: 9, title: '慢炖海风' });
  assert.match(p, /The dish is called "慢炖海风"/);
  assert.match(p, /slow stew/);
  assert.match(p, /medium heat/);
});

test('chinese summary tells the pot in order, then the board work', () => {
  assert.equal(describeRecipe(rows, { method: 'stew', heat: 3, steps: potSteps }), '下锅 海边的傍晚 → 炖·文火 → 收汁·大火 → 下锅 外婆家的厨房 ｜ 案板：海边的傍晚（切片 → 撒盐·大量）、外婆家的厨房（（灶台 + 窗）拌在一起 → 捣碎·少许）');
  assert.match(describeRecipe(rows, { method: 'raw', heat: 1, steps: [] }), /^生拌 · /);
});

test('title suggestion prefers flavors and is deterministic with a seeded rng', () => {
  const t = suggestTitle(rows, { method: 'stew', heat: 2 }, () => 0);
  assert.equal(t, '慢炖海风与外婆家的厨房');
  assert.equal(suggestTitle([], { method: 'raw' }, () => 0), '凉拌记忆');
});

test('seed is stable for the same recipe and changes with salt', () => {
  const r = { method: 'stew', heat: 2 };
  assert.equal(recipeSeed(rows, r), recipeSeed(rows, r));
  assert.notEqual(recipeSeed(rows, r), recipeSeed(rows, r, 1));
  assert.notEqual(recipeSeed(rows, r), recipeSeed(rows, { ...r, heat: 3 }));
  const rng = makeRng(recipeSeed(rows, r));
  const a = rng();
  assert.ok(a >= 0 && a < 1);
  assert.equal(makeRng(recipeSeed(rows, r))(), a);
});

