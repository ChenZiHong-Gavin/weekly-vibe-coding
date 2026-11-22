// Browser smoke test for the board → pot → plate flow: samples on the board -> board operations
// applied in order and baked in -> the same two operations in the other order give a different
// picture -> drag one card onto another to mix -> drag one card into the pot, 炖, put another in with
// the 下锅 button, 收汁 -> the pot survives a reload -> 出锅 onto the plate -> the dish back into the
// pot. Then, on the compositor directly: different pot steps give clearly different dishes, and the
// order of adding vs cooking changes the dish.
// Usage: npm run dev (or preview) in another terminal, then `node tests/browser.mjs [url]`.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const url = process.argv[2] || 'http://127.0.0.1:5181/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const potCount = () => page.evaluate(() => Number(document.querySelector('#pot').dataset.count));
const potIdle = () => page.waitForFunction(() => ![...document.querySelectorAll('#methods button')].some((b) => b.disabled), null, { timeout: 15000 });
async function potStep(op, heat) {
  await page.locator(`#heats [data-value="${heat}"]`).click();
  await page.locator(`#methods [data-value="${op}"]`).click();
  await page.waitForFunction(() => [...document.querySelectorAll('#methods button')].every((b) => b.disabled));
  await potIdle();
}

await page.goto(url);
// A fresh worktop starts with four sample photos already on the board.
await page.waitForFunction(() => document.querySelectorAll('#photos .photo').length === 4);
const steps = (i) => page.locator('#photos .photo').nth(i).locator('.photo__steps').textContent();
const pixels = (i) => page.locator('#photos .photo').nth(i).locator('.photo__img').evaluate(async (img) => {
  await img.decode();
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 16, 16);
  return [...ctx.getImageData(0, 0, 16, 16).data];
});
const apply = async (i, op, expect) => {
  await page.locator('#photos .photo').nth(i).locator('.photo__img').click();
  await page.locator(`#preps [data-value="${op}"]`).click();
  await page.waitForFunction(([n, e]) => document.querySelectorAll('#photos .photo')[n].querySelector('.photo__steps').textContent === e, [i, expect]);
  await page.waitForFunction(() => !document.querySelector('.photo--working') && ![...document.querySelectorAll('#preps button')].some((b) => b.disabled));
};
// Operations stack in order on the picture: slice then mash on one card, mash then slice on its twin.
await apply(1, 'slice', '切片');
await apply(1, 'mash', '切片 → 捣碎');
const before = await pixels(1);
if ((await steps(0)) !== '原样') throw new Error('untouched photos should read 原样');
await mkdir('docs/screenshots', { recursive: true });
await apply(3, 'mash', '捣碎');
await apply(3, 'slice', '捣碎 → 切片');
if (before.join() !== (await pixels(1)).join()) throw new Error('photo 1 changed while working on another photo');
// Order matters: slice→mash and mash→slice on the same picture give different pictures.
const diff = await page.evaluate(async () => {
  const { createOp } = await import('/src/ops.js');
  const img = document.querySelector('#photos .photo .photo__img'); await img.decode();
  const base = document.createElement('canvas'); base.width = base.height = 256;
  base.getContext('2d').drawImage(img, 0, 0, 256, 256);
  const ab = createOp('mash', createOp('slice', base, 1).render(256), 2).render(256);
  const ba = createOp('slice', createOp('mash', base, 1).render(256), 2).render(256);
  const small = (c) => { const t = document.createElement('canvas'); t.width = t.height = 16; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 16, 16); return x.getImageData(0, 0, 16, 16).data; };
  const p = small(ab); const q = small(ba);
  let sum = 0; for (let k = 0; k < p.length; k += 1) if (k % 4 !== 3) sum += Math.abs(p[k] - q[k]);
  return sum / (p.length * 0.75);
});
// Mix: drag photo 3 onto photo 2. The two become one ingredient in photo 2's place.
await page.locator('#photos .photo').nth(3).dragTo(page.locator('#photos .photo').nth(2));
await page.waitForFunction(() => document.querySelectorAll('#photos .photo').length === 3
  && document.querySelectorAll('#photos .photo')[2].querySelector('.photo__steps').textContent.includes('拌在一起'));
await page.waitForFunction(() => !document.querySelector('.photo--working'));

// Into the pot: drag the sliced-then-mashed card in, stew it, then put the first card in with the button.
const names = await page.locator('#photos .photo .photo__name').allTextContents();
await page.locator('#photos .photo').nth(1).dragTo(page.locator('#pot'));
await page.waitForFunction(() => document.querySelectorAll('#photos .photo').length === 2 && document.querySelector('#pot').dataset.count === '1');
await potStep('stew', '2');
await page.locator('#photos .photo').nth(0).locator('.photo__img').click();
await page.click('#btn-to-pot');
await page.waitForFunction(() => document.querySelector('#pot').dataset.count === '2');
await potStep('reduce', '3');
const log = await page.locator('#pot-steps').textContent();
const wantLog = `下锅 ${names[1]} → 炖·中火 → 下锅 ${names[0]} → 收汁·大火`;
if (log !== wantLog) throw new Error(`pot log ${log} != ${wantLog}`);
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/01-table.png', fullPage: true });

// The pot, its order and its steps survive a reload; nothing came back to the board.
await page.reload();
await page.waitForFunction((w) => document.querySelector('#pot-steps').textContent === w && document.querySelectorAll('#photos .photo').length === 1, wantLog);

// 出锅: the dish lands on the plate and the pot is empty.
await page.click('#btn-cook');
await page.waitForFunction(() => document.querySelector('#pot').dataset.stage === 'cooking');
await page.waitForFunction(() => document.querySelector('#pot').dataset.stage === 'done', null, { timeout: 60000 });
const title = await page.locator('#plate-title').textContent();
const src = await page.locator('#plate-img').getAttribute('src');
if (!src?.startsWith('data:image/jpeg')) throw new Error('plate image missing');
if (await potCount() !== 0) throw new Error('the pot should be empty after serving');
const recipeText = await page.locator('#plate-recipe').textContent();
if (!recipeText.includes(wantLog)) throw new Error(`dish recipe should tell the pot: ${recipeText}`);
await page.waitForFunction(() => !document.querySelector('.dish-flight'));
await page.screenshot({ path: 'docs/screenshots/02-served.png', fullPage: true });

// Pot steps, and the order of adding vs cooking, must show in the dish (straight on the compositor).
const dishes = await page.evaluate(async () => {
  const { prepareCook, renderDish } = await import('/src/localCook.js');
  const { cookMethod, cookHeat } = await import('/src/state.js');
  const { makeSamples } = await import('/src/samples.js');
  const [a, b, c] = makeSamples();
  const ing = (x, i) => ({ ingredientId: `s${i}`, steps: [], amount: 2, ingredient: { ...x, id: `s${i}`, steps: [] } });
  const desc = async (rows, steps) => {
    const recipe = { steps, method: cookMethod(steps), heat: cookHeat(steps), title: '' };
    const prep = await prepareCook({ rows, recipe, seed: 7 });
    const { canvas } = await renderDish(prep);
    const t = document.createElement('canvas'); t.width = t.height = 8;
    const x = t.getContext('2d'); x.drawImage(canvas, 0, 0, 8, 8);
    return [...x.getImageData(0, 0, 8, 8).data].filter((_, k) => k % 4 !== 3);
  };
  const dist = (p, q) => Math.round(p.reduce((s, v, k) => s + Math.abs(v - q[k]), 0) / p.length);
  const st = (op, heat = 3) => ({ op, heat, seed: 1 });
  const base = [ing(a, 0), ing(b, 1), ing(c, 2)];
  const withPot = (steps, late = []) => base.map((r, i) => ({ ...r, potSteps: late.includes(i) ? steps.slice(1) : steps }));
  const looks = [];
  for (const steps of [[], [st('sear')], [st('stirfry')], [st('stew')], [st('steam')]]) looks.push(await desc(withPot(steps), steps));
  const distances = [];
  for (let i = 0; i < looks.length; i += 1) for (let j = i + 1; j < looks.length; j += 1) distances.push(dist(looks[i], looks[j]));
  // A stewed for two steps vs dropped in for the last one only.
  const steps = [st('stew', 2), st('reduce', 3)];
  const order = dist(await desc(withPot(steps), steps), await desc(withPot(steps, [0]), steps));
  return { distances, order };
});

// A served dish goes straight back into the pot, whole.
await page.locator('#plate-actions [data-act="pantry"]').click();
await page.waitForFunction(() => document.querySelector('#pot').dataset.count === '1');

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'docs/screenshots/03-mobile.png', fullPage: true });

const minDistance = Math.min(...dishes.distances);
console.log(JSON.stringify({ title, log, orderDiff: Math.round(diff), minDistance, distances: dishes.distances, potOrder: dishes.order, errors }, null, 2));
if (diff < 12) throw new Error(`slice→mash and mash→slice look too alike (${Math.round(diff)}/255)`);
if (minDistance < 14) throw new Error(`two pot steps give dishes that look too alike (min ${minDistance}/255): ${dishes.distances.join(',')}`);
if (dishes.order < 3) throw new Error(`adding late vs early makes no difference (${dishes.order}/255)`);
await browser.close();
if (errors.length) process.exit(1);
