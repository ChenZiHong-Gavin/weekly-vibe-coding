// Standalone visual/contract check, independent of the concurrently changing page flow.
// npm run dev -- --port 5181; node tests/pot-sheet.mjs [origin] [output]
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [origin = 'http://127.0.0.1:5181', output = 'docs/screenshots/pot.jpg'] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/__pot_sheet__', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>' }));
  await page.goto(`${origin.replace(/\/$/, '')}/__pot_sheet__`);
  const report = await page.evaluate(async () => {
    const { startPot, POT_OPS, POT_STEP_MS, DROP_MS, SERVE_MS } = await import('/src/potScene.js');
    const { createOp, createMix, opContours } = await import('/src/ops.js');
    const { makeSamples } = await import('/src/samples.js');
    const random = (seed) => { let a = seed; return () => { a = Math.imul(1664525, a) + 1013904223 | 0; return (a >>> 0) / 4294967296; }; };
    // samples.js includes random sea glints / raindrops; freeze those input pixels too.
    const oldRandom = Math.random; Math.random = random(1729); const samples = makeSamples(); Math.random = oldRandom;
    const source = async (url) => { const i = new Image(); i.src = url; await i.decode(); return i; };
    const photoImages = await Promise.all(samples.map((s) => source(s.src)));
    const photos = photoImages.map((image) => { const c = document.createElement('canvas'); c.width = c.height = 768; const crop = Math.min(image.width, image.height); c.getContext('2d').drawImage(image, (image.width - crop) / 2, (image.height - crop) / 2, crop, crop, 0, 0, 768, 768); return c; });
    const square = [[0, 0], [1, 0], [1, 1], [0, 1]], make = (size = 640) => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
    const colors = [['#eea067', '#4f4d83'], ['#a98759', '#ebd595'], ['#6b99bd', '#263f66'], ['#b9dda8', '#bd4632']];
    const ingredient = (kind, sample = 0, id = kind, inAt = 0) => {
      const seed = 179414 + sample * 71;
      let picture;
      if (kind === 'whole') picture = photos[sample];
      else if (kind === 'mix') picture = createMix([createOp('slice', photos[sample], seed).render(768), createOp('dice', photos[(sample + 1) % 4], seed + 1).render(768)], seed).render(768);
      else picture = createOp(kind, photos[sample], seed).render(768);
      return { id, name: samples[sample].name, src: kind === 'whole' ? samples[sample].src : picture.toDataURL('image/png'), amount: 2, inAt, colors: colors[sample], shape: { kind, polys: kind === 'whole' ? [square] : opContours(kind, seed, random(seed)) } };
    };
    const inputs = Object.fromEntries(['whole', 'slice', 'dice', 'shred', 'mash', 'flatten', 'dry', 'mix'].map((kind) => [kind, ingredient(kind)]));
    const trio = [ingredient('slice', 0, 'A'), ingredient('dice', 1, 'B'), ingredient('shred', 2, 'C')];
    const steps = Object.keys(POT_OPS).map((op, i) => ({ op, heat: op === 'stirfry' ? 3 : 2, seed: 3419 + i * 271 }));
    document.head.insertAdjacentHTML('beforeend', `<style>
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#e9dcc4;color:#4a4234;font:13px Georgia,'Songti SC',serif}h1{font-size:28px;font-weight:400;margin:0 0 8px}p{color:#887559;margin:0 0 20px}h2{font-size:18px;font-weight:400;margin:24px 0 12px;border-bottom:1px dashed #ad9b7e;padding-bottom:8px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.cell{background:#f5eddc;padding:8px;box-shadow:2px 3px 6px #6e4c2424}.cell canvas{display:block;width:100%;height:auto;background:#dfcfb2}.cap{font-size:14px;padding:8px 4px 2px;line-height:1.5}.cap small{display:block;color:#8d7b5e;font-size:11px}.work{position:fixed;left:-2000px;top:0;width:480px;height:480px}.work canvas{position:absolute;inset:0;width:480px;height:480px}
    </style>`);
    document.body.innerHTML = '<h1>记忆厨房 · 一口留住先后顺序的锅</h1><p>照片仍是照片，案板的形状直接入锅。每一排从动作起点，经动作中，到永久留在锅里的结果。全部输入、落点与动画时刻固定。</p>';
    const mount = document.createElement('div'); mount.className = 'work'; document.body.append(mount);
    const section = (title) => { const h = document.createElement('h2'); h.textContent = title; document.body.append(h); const grid = document.createElement('div'); grid.className = 'grid'; document.body.append(grid); return grid; };
    const tile = (grid, c, title, note = '') => {
      const cell = document.createElement('div'); cell.className = 'cell'; const copy = make(640); copy.getContext('2d').drawImage(c, 0, 0, 640, 640);
      const cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = title; const small = document.createElement('small'); small.textContent = note; cap.append(small); cell.append(copy, cap); grid.append(cell); return copy;
    };
    // Analytic poses use performance.now(), so an explicit frame clock can jump exactly
    // to endpoints without a wall-clock race or an accumulating physics timestep.
    const realNow = performance.now.bind(performance);
    let now = 0, id = 0; const callbacks = new Map();
    Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
    window.requestAnimationFrame = (cb) => { callbacks.set(++id, cb); return id; };
    window.cancelAnimationFrame = (n) => callbacks.delete(n);
    const advance = (ms) => { now += ms; const q = [...callbacks.values()]; callbacks.clear(); q.forEach((cb) => cb(now)); };
    const NativeImage = window.Image, pending = [];
    window.Image = class extends NativeImage { constructor(...args) { super(...args); pending.push(this); } };
    const settle = async () => { await Promise.all(pending.splice(0).map((i) => i.decode().catch(() => {}))); await new Promise((r) => setTimeout(r, 0)); advance(0); };
    const scene = async (items = [], history = [], options = {}) => {
      const c = make(); mount.append(c); const reduced = { value: !!options.reduced };
      const pot = startPot(c, { reducedMotion: () => reduced.value });
      const view = { items, steps: history, heat: 2, stage: 'idle', dish: null };
      pot.update(view); await settle(); return { c, pot, view, reduced };
    };
    const px = (c) => { const normalized = make(640); normalized.getContext('2d').drawImage(c, 0, 0, 640, 640); const out = make(320); out.getContext('2d').drawImage(normalized, 0, 0, 320, 320); return out.getContext('2d').getImageData(0, 0, 320, 320).data; };
    const delta = (a, b) => { const x = px(a), y = px(b); let d = 0; for (let i = 0; i < x.length; i++) d += Math.abs(x[i] - y[i]); return d / x.length; };
    const result = { constants: { POT_STEP_MS, DROP_MS, SERVE_MS }, shapes: [], operations: [], orders: [] };
    const shapes = section('01 / 清锅、原片与七种案板形状 · 刚落定，尚未加热');
    const empty = await scene(); tile(shapes, empty.c, '空锅 · 从未加热', '锻钢卷边 / 弧形锅壁 / 一层很薄的油');
    for (const [kind, item] of Object.entries(inputs)) {
      const s = await scene(); s.pot.update({ ...s.view, items: [item] }); await settle(); advance(DROP_MS);
      tile(shapes, s.c, kind, `${item.shape.polys.length} 个真实轮廓 / PNG 透明缝隙保留`); result.shapes.push({ kind, pieces: item.shape.polys.length });
    }
    const drops = section('02 / 一把切片从案板落下 · 0 / ½ / 1');
    const drop = await scene(); drop.pot.dropFrom('slice', { x: -1900, y: -70, width: 240, height: 240 }); drop.pot.update({ ...drop.view, items: [inputs.slice] }); await settle();
    tile(drops, drop.c, '下锅 · 0', '沿案板方向，整把薄片先保留相对布局'); advance(DROP_MS / 2); tile(drops, drop.c, '下锅 · ½', '越过锅沿、加速下落'); advance(DROP_MS / 2); tile(drops, drop.c, '下锅 · 1', '着锅后停稳，不自动重新切碎');
    const actions = section('03 / 同一锅依次煎 → 炒 → 炖 → 蒸 → 收汁 · 每步 0 / ½ / 1');
    const s = await scene(trio); let history = [];
    for (const step of steps) {
      history = [...history, step]; s.pot.update({ ...s.view, items: trio, steps: history, stage: 'cooking' });
      tile(actions, s.c, `${POT_OPS[step.op].label} · 0`, '保留上一步的油、汤与食材状态'); advance(POT_STEP_MS / 2);
      tile(actions, s.c, `${POT_OPS[step.op].label} · ½`, POT_OPS[step.op].blurb); advance(POT_STEP_MS / 2);
      const final = tile(actions, s.c, `${POT_OPS[step.op].label} · 1`, '动作结束，结果永久留下');
      const restored = await scene(trio, history); result.operations.push({ op: step.op, restoreDelta: delta(final, restored.c) });
    }
    const orderGrid = section('04 / 下锅先后 · 同种食材、同样的步骤与种子，B 的入锅时刻不同');
    const orderSteps = [{ op: 'stew', heat: 3, seed: 71 }, { op: 'reduce', heat: 2, seed: 92 }];
    for (const [aKind, bKind, aSample, bSample] of [['slice', 'dice', 0, 2], ['mash', 'whole', 1, 3]]) {
      const a = ingredient(aKind, aSample, 'A'), b = ingredient(bKind, bSample, 'B');
      const late = await scene([a, { ...b, inAt: 1 }], orderSteps), early = await scene([a, b], orderSteps);
      const l = tile(orderGrid, late.c, `B 晚下锅 · ${bKind}`, 'A 下锅 → 炖 → B 下锅 → 收汁；B 较鲜、边角清楚');
      const e = tile(orderGrid, early.c, `B 一起炖 · ${bKind}`, 'A、B 下锅 → 炖 → 收汁；B 褪色、变软、边角圆钝');
      const detail = make(); const dc = detail.getContext('2d'); dc.fillStyle = '#dfcfb2'; dc.fillRect(0, 0, 640, 640); dc.drawImage(l, 290, 140, 170, 340, 0, 0, 320, 640); dc.drawImage(e, 290, 140, 170, 340, 320, 0, 320, 640);
      tile(orderGrid, detail, '并排放大 · 左晚下 / 右先炖', '共享的浓汁不会抹掉每份食材各自经历的步骤'); result.orders.push({ pair: `${aKind}/${bKind}`, delta: delta(l, e) });
    }
    const heats = section('05 / 同一锅煎一次 · 文火 / 中火 / 大火');
    for (const heat of [1, 2, 3]) { const h = await scene(trio, [{ op: 'sear', heat, seed: 601 }]); tile(heats, h.c, ['文火', '中火', '大火'][heat - 1], `焦边随本步火候增加 / heat=${heat}`); }
    const serveGrid = section('06 / 出锅 · 聚拢 → 融进成品画面 → 留在锅中');
    const dish = make(768), d = dish.getContext('2d');
    d.fillStyle = d.createLinearGradient(0, 0, 768, 768); const g = d.fillStyle; g.addColorStop(0, '#bd8a46'); g.addColorStop(1, '#433927'); d.fillRect(0, 0, 768, 768);
    const mixed = createMix([createOp('slice', photos[0], 91).render(768), createOp('mash', photos[1], 72).render(768)], 33).render(768); d.drawImage(mixed, 20, 20, 728, 728);
    let resolved = false; const promise = s.pot.serve(dish).then(() => { resolved = true; }); advance(0);
    tile(serveGrid, s.c, '出锅 · 0', '食材与锅里留下的浓汁'); advance(SERVE_MS / 2); tile(serveGrid, s.c, '出锅 · ½', '碎片向中心聚拢，融进成品'); advance(SERVE_MS / 2); await promise;
    const served = tile(serveGrid, s.c, '出锅 · 1', '成品铺满锅内食物区，等待飞向盘子');
    result.serveResolved = resolved; result.dishRect = s.pot.dishRect();
    s.pot.update({ ...s.view, items: [], steps: history, stage: 'done', dish: dish.toDataURL() }); await settle(); result.servedRetention = delta(served, s.c);
    const restore = await scene(trio, history), twice = await scene(trio, history); result.deterministicDelta = delta(restore.c, twice.c);
    // Warm animation must do no readbacks, and must stop scheduling frames at rest.
    let reads = 0; const originalRead = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) { reads++; return originalRead.apply(this, args); };
    restore.pot.update({ ...restore.view, items: trio, steps: [...history, { op: 'stirfry', heat: 3, seed: 834 }], stage: 'cooking' });
    for (let i = 0; i < 156; i++) advance(POT_STEP_MS / 156); advance(1);
    CanvasRenderingContext2D.prototype.getImageData = originalRead; result.frameReads = reads; advance(0); result.idleCallbacks = callbacks.size;
    const rm = await scene(trio, [], { reduced: true }); rm.pot.update({ ...rm.view, items: trio, steps: history }); advance(0);
    result.reducedDelta = delta(rm.c, twice.c); await rm.pot.serve(dish); result.reducedServe = true;
    rm.pot.update({ ...rm.view, items: [inputs.whole], steps: [] }); await settle(); advance(0); result.reducedIdleCallbacks = callbacks.size;
    const fresh = await scene([inputs.whole]); result.nextIngredientDelta = delta(fresh.c, rm.c);
    // Changes in recipe order are also physical, even for an item present throughout.
    const one = await scene(trio, [steps[0], steps[2]]), two = await scene(trio, [steps[2], steps[0]]); result.stepOrderDelta = delta(one.c, two.c);
    result.backing = { width: s.c.width, height: s.c.height };
    const fiveItems = Array.from({ length: 5 }, (_, i) => ingredient('dice', i % 4, `load-${i}`));
    const load = await scene(fiveItems); const timings = []; load.pot.update({ ...load.view, items: fiveItems, steps: [{ op: 'stirfry', heat: 3, seed: 991 }] });
    for (let i = 0; i < 156; i++) { const t = realNow(); advance(POT_STEP_MS / 156); timings.push(realNow() - t); } advance(1);
    timings.sort((a, b) => a - b); result.performance = { pieces: fiveItems.reduce((n, item) => n + item.shape.polys.length, 0), medianMs: timings[78], p95Ms: timings[148], renderer: 'headless Chromium; CPU draw submission, not hardware frame rate' };
    return result;
  });
  await mkdir(dirname(output), { recursive: true });
  // CSS pixels keep the sheet reviewable even though every scene was rendered at DPR 2.
  await writeFile(output, await page.screenshot({ type: 'jpeg', quality: 90, fullPage: true, scale: 'css' }));
  // Larger crops make material / silhouette review possible without shrinking the whole sheet.
  const cells = page.locator('.cell');
  for (const [index, name] of [[3, 'pot-dice'], [16, 'pot-stirfry'], [19, 'pot-stew'], [22, 'pot-steam'], [25, 'pot-reduce'], [37, 'pot-serve']]) {
    if (index < await cells.count()) await cells.nth(index).screenshot({ path: `${dirname(output)}/${name}.png`, scale: 'css' });
  }
  const layout = await browser.newPage();
  await layout.route('**/__pot_layout__', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="stylesheet" href="/src/style.css"></head><body></body></html>' }));
  await layout.goto(`${origin.replace(/\/$/, '')}/__pot_layout__`);
  await layout.evaluate(async () => {
    const { POT_OPS } = await import('/src/potScene.js');
    document.body.innerHTML = `<main class="table"><section class="stove"><div class="burner"><div class="burner__grate"></div><div class="wok is-over" id="pot"><canvas class="wok__canvas"></canvas></div></div><div class="methods" id="methods">${Object.entries(POT_OPS).map(([op, meta]) => `<button class="method" data-value="${op}"><span class="method__icon"></span><span class="method__label">${meta.label}</span><span class="method__blurb">${meta.blurb}</span></button>`).join('')}</div></section></main>`;
  });
  report.layouts = [];
  for (const width of [1440, 1100, 768, 390, 320, 280]) {
    await layout.setViewportSize({ width, height: 900 });
    report.layouts.push(await layout.evaluate((width) => { const buttons = [...document.querySelectorAll('.method')], rects = buttons.map((b) => b.getBoundingClientRect()); return { width, columns: new Set(rects.map((r) => Math.round(r.left))).size, rows: new Set(rects.map((r) => Math.round(r.top))).size, icons: buttons.every((b) => getComputedStyle(b.querySelector('.method__icon')).maskImage.startsWith('url(')), overflow: document.documentElement.scrollWidth > innerWidth }; }, width));
  }
  console.log(JSON.stringify({ output, errors, ...report }, null, 2));
  assert.deepEqual(errors, []);
  assert.deepEqual(report.constants, { POT_STEP_MS: 2600, DROP_MS: 1100, SERVE_MS: 2400 });
  for (const op of report.operations) assert.equal(op.restoreDelta, 0, `${op.op}: completed animation must equal restored state`);
  for (const order of report.orders) assert.ok(order.delta > .3, `${order.pair}: late arrival must differ`);
  assert.equal(report.deterministicDelta, 0); assert.equal(report.reducedDelta, 0); assert.equal(report.nextIngredientDelta, 0);
  assert.equal(report.servedRetention, 0); assert.ok(report.serveResolved && report.reducedServe);
  assert.equal(report.frameReads, 0); assert.equal(report.idleCallbacks, 0); assert.equal(report.reducedIdleCallbacks, 0);
  assert.ok(report.stepOrderDelta > .2); assert.ok(report.dishRect.size > 0); assert.ok(report.backing.width <= 1280);
  for (const l of report.layouts) assert.ok(l.columns === 5 && l.rows === 1 && l.icons && !l.overflow, `five actions at ${l.width}: ${JSON.stringify(l)}`);
} finally { await browser.close(); }
