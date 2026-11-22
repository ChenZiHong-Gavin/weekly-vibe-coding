// npm run dev -- --port 5181, then node tests/ops-sheet.mjs [origin] [output]
// Standalone renderer: exercises ops.js without relying on the concurrently changing UI.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [origin = 'http://127.0.0.1:5181', output = 'docs/screenshots/ops.jpg'] = process.argv.slice(2);
const photos = await Promise.all(['kid', 'backlit'].map(async (name) => {
  // These are existing repository samples, not remote/runtime assets.
  const bytes = await readFile(new URL(`../../camera-twin/public/scenes/${name}.jpg`, import.meta.url));
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1376, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/__ops_sheet__', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>' }));
  await page.goto(`${origin.replace(/\/$/, '')}/__ops_sheet__`);
  const report = await page.evaluate(async (photos) => {
    const { OPS, createOp, createMix, planOp } = await import('/src/ops.js');
    const make = (s = 384) => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };
    const source = async (url) => {
      const img = new Image(); img.src = url; await img.decode();
      const c = make(), ctx = c.getContext('2d'); const k = Math.max(c.width / img.width, c.height / img.height);
      ctx.drawImage(img, (c.width - img.width * k) / 2, (c.height - img.height * k) / 2, img.width * k, img.height * k); return c;
    };
    const [a, b] = await Promise.all(photos.map(source));
    const pixels = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const equal = (a, b) => a.every((v, i) => v === b[i]);
    const delta = (a, b) => {
      const x = pixels(a), y = pixels(b); let d = 0;
      for (let i = 0; i < x.length; i += 4) for (let j = 0; j < 3; j++) d += Math.abs((x[i + j] * x[i + 3] + 240 * (255 - x[i + 3])) / 255 - (y[i + j] * y[i + 3] + 240 * (255 - y[i + 3])) / 255);
      return d / (x.length / 4 * 3);
    };
    const measure = (c) => {
      const px = pixels(c); let alpha = 0, sum = 0, sum2 = 0, count = 0;
      for (let i = 0; i < px.length; i += 4) { alpha += px[i + 3] / 255; if (px[i + 3] < 80) continue; for (let j = 0; j < 3; j++) { sum += px[i + j]; sum2 += px[i + j] ** 2; count++; } }
      return { coverage: alpha / (px.length / 4), mean: sum / count || 0, deviation: Math.sqrt(Math.max(0, sum2 / count - (sum / count) ** 2)) || 0 };
    };
    document.head.insertAdjacentHTML('beforeend', `<style>
      *{box-sizing:border-box}body{margin:0;padding:30px 28px 34px;background:#e8d9bb;color:#4a4234;font:13px Georgia,'Songti SC',serif}
      h1{font-size:28px;font-weight:400;margin:0 0 8px}p{margin:0 0 20px;color:#81745d;font-size:13px}h2{font-size:18px;font-weight:400;margin:26px 0 12px;border-bottom:1px dashed #a69476;padding-bottom:8px}
      .grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px 12px}.cell{min-width:0;background:#f8f2e4;padding:7px;box-shadow:2px 3px 5px #6a4b2326}
      canvas{display:block;width:100%;height:auto;background:repeating-linear-gradient(92deg,#d8b77f12 0 3px,transparent 3px 10px),#e7c995}
      .cap{padding:7px 1px 2px;line-height:1.5;min-height:39px;font-size:12px}b{font-weight:400;color:#4f6246}small{display:block;color:#8d7c62;font-size:10px}
    </style>`);
    document.body.innerHTML = '<h1>记忆厨房 · 像素备料</h1><p>当前画面 → 工具作用 → 烘焙成下一份食材 / 透明区域展示为案板色；工具和筛子均不进入成品。</p>';
    const section = (name) => { const h = document.createElement('h2'); h.textContent = name; document.body.append(h); const grid = document.createElement('div'); grid.className = 'grid'; document.body.append(grid); return grid; };
    const tile = (grid, c, title, note = '') => {
      const el = document.createElement('div'); el.className = 'cell';
      const thumb = make(384); thumb.getContext('2d').drawImage(c, 0, 0, 384, 384);
      el.append(thumb); const caption = document.createElement('div'); caption.className = 'cap';
      const label = document.createElement('b'); label.textContent = title; const sub = document.createElement('small'); sub.textContent = note; caption.append(label, sub); el.append(caption); grid.append(el);
    };
    const draw = (op, u, tool = false) => { const c = make(); op.draw(c.getContext('2d'), 384, u); if (tool) op.tool(c.getContext('2d'), 384, u); return c; };
    const single = section('01 / 八种操作 · 开始、进行、成品');
    const endpoints = [], determinism = [], contours = [], timings = {}, frameReads = [];
    const seed = 179414;
    for (const [key, meta] of Object.entries(OPS)) {
      const t = performance.now(); const op = createOp(key, a, seed); const final = op.render(384); timings[key] = Math.round((performance.now() - t) * 10) / 10;
      endpoints.push({ key, start: equal(pixels(draw(op, 0)), pixels(a)), end: equal(pixels(draw(op, 1)), pixels(final)), cached: final === op.render(384), toolGone: pixels((() => { const c = make(); op.tool(c.getContext('2d'), 384, 1); return c; })()).every((v) => v === 0) });
      determinism.push({ key, equal: equal(pixels(final), pixels(createOp(key, a, seed).render(384))) });
      op.render(512); // warm all heavy layers before instrumenting animation frames
      const prototype = CanvasRenderingContext2D.prototype, read = prototype.getImageData;
      let reads = 0; prototype.getImageData = function (...args) { reads++; return read.apply(this, args); };
      try { for (const u of [.001, .02, .1, .32, .5, .81, .999, 1]) { const c = make(512); op.draw(c.getContext('2d'), 512, u); op.tool(c.getContext('2d'), 512, u); } }
      finally { prototype.getImageData = read; }
      frameReads.push({ key, reads });
      let n = 91; const polys = op.contours(() => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; });
      contours.push({ key, count: polys.length, valid: polys.length > 0 && polys.every((p) => p.length >= 3 && p.every((v) => v.length === 2 && v.every((x) => Number.isFinite(x) && x >= 0 && x <= 1))) });
      tile(single, draw(op, 0), `${meta.label} · 0`, '当前输入'); tile(single, draw(op, .5, true), `${meta.label} · ½`, `${meta.tool} / 动作中`); tile(single, final, `${meta.label} · 1`, '烘焙结果');
    }
    const chain = (input, keys, start = seed) => keys.reduce((c, key, i) => createOp(key, c, start + i * 7919).render(384), input);
    const pairs = section('02 / 顺序不可交换 · 同一张照片、同一组种子');
    const orders = [];
    for (const [x, y] of [['slice', 'mash'], ['dice', 'marinate'], ['shred', 'flatten']]) {
      // Per-operation seeds stay equal in both directions; only order changes.
      const sx = 73, sy = 931;
      const xy = createOp(y, createOp(x, a, sx).render(384), sy).render(384);
      const yx = createOp(x, createOp(y, a, sy).render(384), sx).render(384);
      orders.push({ pair: `${x}/${y}`, delta: delta(xy, yx) });
      tile(pairs, xy, `${OPS[x].label} → ${OPS[y].label}`, '结果保留上一步的切面、色膜或纤维');
      tile(pairs, yx, `${OPS[y].label} → ${OPS[x].label}`, '相同工具，相反顺序');
    }
    const six = section('03 / 一条连续六步 · 始终取上一步像素');
    let current = a; const chainSteps = ['slice', 'dice', 'marinate', 'shred', 'mash', 'season'];
    const chainHealth = [];
    chainSteps.forEach((key, i) => { current = createOp(key, current, seed + i * 7919).render(384); tile(six, current, `${i + 1}. ${OPS[key].label}`, chainSteps.slice(0, i + 1).map((x) => OPS[x].label).join(' → ')); chainHealth.push(measure(current)); });
    const interactions = section('04 / 质地相遇 · 湿釉上的盐、丝里的泥、再次切开');
    for (const keys of [['marinate', 'season'], ['season', 'marinate'], ['slice', 'slice'], ['dice', 'dice'], ['shred', 'mash'], ['mash', 'shred']]) {
      tile(interactions, chain(a, keys), keys.map((k) => OPS[k].label).join(' → '), '每一步都只取当前画布');
    }
    const mixes = section('05 / 翻拌已处理的食材 · 纹理落下，再由木勺折进来');
    const mixHealth = [];
    for (const [one, two, label] of [
      [['slice', 'marinate'], ['mash', 'season'], '湿薄片 + 带盐软泥'],
      [['shred'], ['flatten', 'dry'], '细丝 + 晒干薄片'],
    ]) {
      const x = chain(a, one), y = chain(b, two, seed + 321); const op = createMix([x, y], seed + 17);
      tile(mixes, x, `目标 · ${one.map((k) => OPS[k].label).join(' → ')}`, label);
      tile(mixes, y, `拖来 · ${two.map((k) => OPS[k].label).join(' → ')}`, '第二张照片 / 已处理');
      tile(mixes, draw(op, 0), '拌在一起 · 0', '拖入碎片悬在上沿，尚未落下');
      tile(mixes, draw(op, .32, true), '拌在一起 · ⅓', '碎片落下');
      tile(mixes, draw(op, .64, true), '拌在一起 · ⅔', '木勺翻折');
      tile(mixes, op.render(384), '拌在一起 · 1', '两边纹理交错，工具不入画');
      const final = op.render(384);
      endpoints.push({ key: `mix:${label}`, start: delta(draw(op, 0), x) > 0 && delta(draw(op, 0), x) < 20, end: equal(pixels(draw(op, 1)), pixels(final)), cached: final === op.render(384) });
      mixHealth.push({ label, ...measure(final) });
    }
    const repeats = section('06 / 每种操作连续六遍 · 不回到原图，不退化成空白');
    const repeated = [], sameSeedRepeated = [];
    for (const [key, meta] of Object.entries(OPS)) {
      const final = chain(a, Array(6).fill(key)); const m = measure(final); repeated.push({ key, ...m });
      let same = a; for (let i = 0; i < 6; i++) same = createOp(key, same, seed).render(384); sameSeedRepeated.push({ key, ...measure(same) });
      tile(repeats, final, `${meta.label} × 6`, `像素覆盖 ${(m.coverage * 100).toFixed(0)}% / 色彩差 ${m.deviation.toFixed(0)}`);
    }
    return { endpoints, determinism, contours, orders, chainHealth, mixHealth, repeated, sameSeedRepeated, timings, frameReads };
  }, photos);
  const layout = await browser.newPage();
  await layout.route('**/__ops_layout__', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/src/style.css"></head><body></body></html>' }));
  await layout.goto(`${origin.replace(/\/$/, '')}/__ops_layout__`);
  await layout.evaluate(async () => {
    const { OPS } = await import('/src/ops.js');
    document.body.innerHTML = `<main class="table"><section class="board"><ul class="photos"><li class="photo photo--working"><canvas class="photo__img" width="256" height="256"></canvas><span class="photo__name">外婆的厨房</span><p class="photo__steps">切片 → 捣碎 → 撒盐</p></li><li class="photo photo--mix-target"><canvas class="photo__img" width="256" height="256"></canvas><span class="photo__name">海边的傍晚</span><p class="photo__steps">擦丝 → 擀平</p></li></ul><div id="preps" class="tools">${Object.entries(OPS).map(([key, value]) => `<button class="seg__btn seg__btn--tool" data-value="${key}"><span class="seg__icon"></span><span class="seg__label">${value.label}</span></button>`).join('')}</div></section></main>`;
  });
  report.layouts = [];
  for (const width of [1440, 1100, 768, 390, 320, 280]) {
    await layout.setViewportSize({ width, height: 1000 });
    report.layouts.push(await layout.evaluate((width) => {
      const buttons = [...document.querySelectorAll('#preps button')];
      const rects = buttons.map((b) => b.getBoundingClientRect());
      const columns = new Set(rects.map((r) => Math.round(r.left))).size;
      const rows = new Set(rects.map((r) => Math.round(r.top))).size;
      return { width, columns, rows, overflow: document.documentElement.scrollWidth > innerWidth,
        icons: buttons.every((b) => getComputedStyle(b.querySelector('.seg__icon')).backgroundImage.startsWith('url(')),
        inside: rects.every((r) => r.left >= 0 && r.right <= innerWidth),
        square: [...document.querySelectorAll('.photo__img')].every((c) => Math.abs(c.clientWidth - c.clientHeight) <= 1) };
    }, width));
  }
  await layout.close();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, await page.screenshot({ type: 'jpeg', quality: 90, fullPage: true }));
  console.log(JSON.stringify({ output, errors, ...report }, null, 2));
  assert.deepEqual(errors, [], 'browser errors');
  for (const r of report.layouts) assert.ok(r.columns === 4 && r.rows === 2 && !r.overflow && r.icons && r.inside && r.square, `toolbar/card layout at ${r.width}: ${JSON.stringify(r)}`);
  for (const r of report.endpoints) assert.ok(r.start && r.end && r.cached && r.toolGone !== false, `${r.key} exact endpoints / cached render`);
  for (const r of report.determinism) assert.ok(r.equal, `${r.key} pixel determinism`);
  for (const r of report.contours) assert.ok(r.valid, `${r.key} unit contours`);
  for (const r of report.orders) assert.ok(r.delta > 3, `${r.pair} must visibly differ by order`);
  for (const r of report.frameReads) assert.equal(r.reads, 0, `${r.key} reads pixels during animation`);
  for (const r of [...report.repeated, ...report.sameSeedRepeated]) assert.ok(r.coverage > .075 && r.mean > 25 && r.mean < 235 && r.deviation > 9, `${r.key} repeated six times lost material or colour: ${JSON.stringify(r)}`);
} finally { await browser.close(); }
