// The page's pan. Coordinates are in a 640px square; no dependency on the old stage.
// Everything persistent is a pure replay of item id + ordered step seeds.
export const POT_OPS = {
  sear: { label: '煎', en: 'pan-seared', blurb: '薄油滋响，贴锅的一面慢慢焦香。' },
  stirfry: { label: '炒', en: 'stir-fried', blurb: '大火翻起，散开再落回一锅。' },
  stew: { label: '炖', en: 'stewed', blurb: '添汤慢炖，让颜色与滋味融进汤里。' },
  steam: { label: '蒸', en: 'steamed', blurb: '盖上锅盖，让水汽把边角蒸软。' },
  reduce: { label: '收汁', en: 'glazed in a reduced sauce', blurb: '沸去水分，把浓亮的汁裹在每一块上。' },
};
export const POT_STEP_MS = 2600;
export const DROP_MS = 1100;
export const SERVE_MS = 2400;

const S = 640, C = 320, R = 262, FOOD = 232, TEX = 448, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, u) => a + (b - a) * u;
const smooth = (u) => (u = clamp(u), u * u * (3 - 2 * u));
const ramp = (u, a, b) => smooth((u - a) / (b - a));
const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = Math.imul(a ^ a >>> 15, a | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function canvas(w = S, h = w) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function layer(paint, w = S, h = w) { const c = canvas(w, h); paint(c.getContext('2d')); return c; }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(.01, r), 0, TAU); }
function grad(c, x, y, xx, yy, stops) { const g = c.createLinearGradient(x, y, xx, yy); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; }
function radial(c, x, y, r, stops, ox = x, oy = y) { const g = c.createRadialGradient(ox, oy, 0, x, y, r); stops.forEach(([p, col]) => g.addColorStop(p, col)); return g; }
function cover(c, img, x, y, size) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  if (!w || !h) return;
  const crop = Math.min(w, h); c.drawImage(img, (w - crop) / 2, (h - crop) / 2, crop, crop, x, y, size, size);
}
function pathFor(points, round = 0) {
  const p = new Path2D();
  if (round) {
    const r = clamp(round, 0, .45), last = points.at(-1), first = points[0]; p.moveTo(mix(last[0], first[0], 1 - r), mix(last[1], first[1], 1 - r));
    points.forEach((a, i) => { const b = points[(i + 1) % points.length]; p.quadraticCurveTo(a[0], a[1], mix(a[0], b[0], r), mix(a[1], b[1], r)); p.lineTo(mix(a[0], b[0], 1 - r), mix(a[1], b[1], 1 - r)); });
  } else points.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y));
  p.closePath(); return p;
}
function material() {
  const random = rng(87192);
  const body = layer((c) => {
    circle(c, C + 2, C + 8, R + 21); c.fillStyle = '#111a1c'; c.fill();
    const metal = c.createConicGradient(-Math.PI, C, C);
    [[0, '#6b7977'], [.12, '#b7c3b5'], [.20, '#e3e4ce'], [.27, '#4b5d5c'], [.39, '#18272b'], [.53, '#8fa4a3'], [.62, '#364449'], [.78, '#171f22'], [.88, '#535d55'], [1, '#6b7977']].forEach(([u, v]) => metal.addColorStop(u, v));
    circle(c, C, C, R + 20); c.fillStyle = metal; c.fill();
    circle(c, C, C, R + 14); c.fillStyle = '#0d191c'; c.fill();
    circle(c, C, C, R + 12); c.strokeStyle = '#c6d1ba75'; c.lineWidth = 1.3; c.stroke();
    circle(c, C, C, R + 10); c.fillStyle = grad(c, 0, 50, 0, 590, [[0, '#080e12'], [.25, '#19282a'], [.62, '#34403b'], [.90, '#727869'], [1, '#a5ab8c']]); c.fill();
    for (let i = 0; i < 330; i++) {
      const r = R - 23 + random() * 33, a = random() * TAU;
      c.beginPath(); c.arc(C, C, r, a, a + .025 + random() * .24); c.strokeStyle = `rgba(202,219,197,${random() * .12})`; c.lineWidth = .4; c.stroke();
    }
    circle(c, C, C, R - 20); c.fillStyle = radial(c, C, C, R, [[0, '#30332c'], [.5, '#242d28'], [.85, '#172224'], [1, '#0c1619']], 235, 210); c.fill();
    c.save(); circle(c, C, C, R - 20); c.clip();
    for (let i = 0; i < 14000; i++) {
      c.fillStyle = random() < .5 ? '#d5cead0b' : '#000d';
      c.globalAlpha = .07 + random() * .15; c.fillRect(65 + random() * 510, 65 + random() * 510, .4 + random(), .5 + random());
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 150; i++) {
      const r = 50 + random() * 180, a = random() * TAU;
      c.beginPath(); c.arc(C, C, r, a, a + .1 + random() * .4); c.strokeStyle = '#d4d7bd0c'; c.lineWidth = .5; c.stroke();
    }
    c.restore();
    for (const side of [-1, 1]) {
      circle(c, C + side * (R - 7), C - 7, 4.2); c.fillStyle = '#152023'; c.fill();
      c.beginPath(); c.arc(C + side * (R - 7), C - 8, 2.8, 3.2, 5.6); c.strokeStyle = '#c8cdb58a'; c.lineWidth = 1; c.stroke();
    }
  });
  const lid = layer((c) => {
    circle(c, C, C, R - 4); c.fillStyle = radial(c, C, C, R, [[0, '#b8d5c82b'], [.67, '#cfddd239'], [.96, '#c9e2d360'], [1, '#273e4188']], 220, 195); c.fill();
    c.strokeStyle = '#d0daccb5'; c.lineWidth = 7; c.stroke(); c.strokeStyle = '#1c3437'; c.lineWidth = 2; c.stroke();
    c.save(); circle(c, C, C, R - 10); c.clip(); c.translate(240, 240); c.rotate(-.55);
    c.fillStyle = grad(c, -100, 0, 90, 0, [[0, '#e4f3d900'], [.35, '#faffea10'], [.42, '#faffea55'], [.58, '#faffea14'], [1, '#e4f3d900']]); c.fillRect(-110, -300, 220, 600); c.restore();
    for (let i = 0; i < 350; i++) {
      const a = random() * TAU, r = Math.sqrt(random()) * (R - 17), x = C + Math.cos(a) * r, y = C + Math.sin(a) * r, b = .5 + random() ** 3 * 4.7;
      circle(c, x, y, b); c.fillStyle = '#1c3e3b33'; c.fill(); c.beginPath(); c.arc(x - .3, y - .5, b * .72, 3.5, 5.4); c.strokeStyle = '#f5ffe8a0'; c.lineWidth = .7; c.stroke();
    }
    c.shadowColor = '#07131190'; c.shadowBlur = 14; c.shadowOffsetY = 9;
    circle(c, C, C, 34); c.fillStyle = '#788278'; c.fill(); c.shadowColor = 'transparent';
    circle(c, C, C - 3, 28); c.fillStyle = radial(c, C, C, 35, [[0, '#718073'], [.45, '#35433c'], [1, '#101e20']], C - 10, C - 16); c.fill();
    c.beginPath(); c.arc(C - 2, C - 5, 24, 3.5, 5.4); c.strokeStyle = '#d2dec16b'; c.lineWidth = 1.5; c.stroke();
  });
  const vapors = Array.from({ length: 3 }, () => layer((c) => {
    for (let j = 0; j < 22; j++) {
      const x = 60 + (random() - .5) * 60, y = 35 + random() * 115, r = 15 + random() * 32;
      c.fillStyle = radial(c, x, y, r, [[0, '#e5eee62b'], [.5, '#e5eee60c'], [1, '#e5eee600']]); c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 128, 192));
  // Tiny alpha-only shadows: no shadowBlur for hundreds of moving pieces.
  const shadow = layer((c) => { c.fillStyle = radial(c, 32, 16, 32, [[0, '#0009'], [.5, '#0005'], [1, '#0000']]); c.scale(1, .5); circle(c, 32, 32, 32); c.fill(); }, 64, 32);
  return { body, lid, vapors, shadow };
}
let sharedMaterial;

// Replay colour/texture in order. Softening after searing blurs its caramelisation;
// searing after softening lays a fresh, sharp crust on the softened photo.
function cookTexture(input, step) {
  const h = clamp(step.heat || 2, 1, 3), op = step.op;
  return layer((c) => {
    c.filter = op === 'stew' ? `blur(${1.3 + h * .8}px) saturate(.78)` : op === 'steam' ? `blur(${.6 + h * .35}px) saturate(.83) brightness(1.10)` : op === 'reduce' ? 'saturate(1.13) contrast(1.08)' : `saturate(${1.03 + h * .04}) contrast(1.04)`;
    c.drawImage(input, 0, 0, TEX, TEX); c.filter = 'none'; c.globalCompositeOperation = 'source-atop';
    c.fillStyle = op === 'sear' ? `rgba(116,49,10,${.03 + h * .085})` : op === 'stirfry' ? '#b17b271f' : op === 'stew' ? `rgba(181,149,91,${.12 + h * .035})` : op === 'steam' ? '#e8eadc20' : '#71380d44';
    c.fillRect(0, 0, TEX, TEX);
  }, TEX);
}
function baseLook() { return { brown: 0, soft: 0, gloss: .05, glaze: 0, wet: 0 }; }
function nextLook(old, step) {
  const s = { ...old }, h = clamp(step.heat || 2, 1, 3);
  if (step.op === 'sear') { s.brown = clamp(s.brown + .14 + h * .18); s.gloss = Math.max(s.gloss, .28); s.wet *= .4; }
  if (step.op === 'stirfry') { s.brown = clamp(s.brown + h * .045); s.gloss = clamp(s.gloss + .24); s.wet *= .6; }
  if (step.op === 'stew') { s.soft = clamp(s.soft + .2 + h * .12); s.brown *= .55; s.glaze *= .4; s.gloss = .42; s.wet = .72; }
  if (step.op === 'steam') { s.soft = clamp(s.soft + .12 + h * .075); s.gloss = .36; s.wet = .35; }
  if (step.op === 'reduce') { s.glaze = clamp(s.glaze + .3 + h * .11); s.gloss = .86; s.wet *= .2; s.brown = clamp(s.brown + h * .05); }
  return s;
}
function initialLiquid() { return { level: .02, glaze: 0, oil: .25, moisture: 0, tint: [133, 91, 40] }; }
function nextLiquid(old, step, items) {
  const s = { ...old, tint: [...old.tint] }, h = clamp(step.heat || 2, 1, 3);
  if (step.op === 'stew') {
    s.level = clamp(s.level + .62 + h * .045, 0, .94); s.glaze *= .25; s.moisture = 1;
    const colors = items.flatMap((item) => item.colors || []).filter((col) => /^#[0-9a-f]{6}$/i.test(col));
    if (colors.length) { const rgb = [0, 0, 0]; colors.forEach((col) => rgb.forEach((_, j) => { rgb[j] += parseInt(col.slice(j * 2 + 1, j * 2 + 3), 16) / colors.length; })); s.tint = s.tint.map((v, j) => mix(v, rgb[j], .3)); }
  }
  if (step.op === 'reduce') { s.level *= .18; s.glaze = clamp(s.glaze + .58); s.moisture *= .3; }
  if (step.op === 'steam') { s.level = Math.max(s.level, .09); s.moisture = .8; }
  if (step.op === 'sear' || step.op === 'stirfry') { s.oil = .65; s.level *= .88; }
  return s;
}
function interpolateLiquid(a, b, u) { return { ...b, level: mix(a.level, b.level, u), glaze: mix(a.glaze, b.glaze, u), oil: mix(a.oil, b.oil, u), moisture: mix(a.moisture, b.moisture, u), tint: a.tint.map((v, j) => mix(v, b.tint[j], u)) }; }
function makePieces(item, index) {
  const kind = item.shape?.kind || 'whole', random = rng(hash(`${item.id}:pieces`));
  const polys = (item.shape?.polys?.length ? item.shape.polys : [square]).filter((p) => p.length >= 3 && p.every((v) => Number.isFinite(v[0]) && Number.isFinite(v[1])));
  const span = (kind === 'whole' ? 176 : ['flatten', 'dry'].includes(kind) ? 210 : kind === 'shred' ? 248 : 224) * (.9 + clamp(item.amount || 1, 1, 3) * .08);
  // A stable spiral gives each incoming handful its own space, independent of later arrivals.
  const home = index * 2.399 - 2.1, dist = index === 0 ? 25 : 73 + index * 9;
  return polys.map((poly, i) => {
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const pts = poly.map(([x, y]) => [(x - cx) * span, (y - cy) * span]);
    const spread = ['whole', 'flatten', 'dry'].includes(kind) ? 0 : kind === 'mix' ? 28 : 9;
    const pose = { x: C + Math.cos(home) * dist + (cx - .5) * span + (random() - .5) * spread, y: C + Math.sin(home) * dist + (cy - .5) * span + (random() - .5) * spread, rot: (random() - .5) * (kind === 'mix' ? .6 : .16) };
    const radius = Math.max(...pts.map(([x, y]) => Math.hypot(x, y)));
    contain(pose, radius);
    return { kind, poly, cx, cy, pts, span, radius, pose, seed: random(), i, thickness: kind === 'shred' ? 1.6 : ['flatten', 'dry'].includes(kind) ? 2.2 : kind === 'slice' ? 3.4 : kind === 'whole' ? 4 : 5.5 };
  });
}
function contain(pose, radius) { const dx = pose.x - C, dy = pose.y - C, d = Math.hypot(dx, dy), limit = Math.max(25, FOOD - radius * .65); if (d > limit) { pose.x = C + dx / d * limit; pose.y = C + dy / d * limit; } return pose; }
function stepPose(p, pose, step) {
  const random = rng(hash(`${step.seed}:${p.i}:${p.seed}`));
  const out = { ...pose };
  if (step.op === 'stirfry') {
    const a = random() * TAU, r = Math.sqrt(random()) * (FOOD - p.radius * .6) * .82;
    out.x = C + Math.cos(a) * r; out.y = C + Math.sin(a) * r; out.rot += (random() - .5) * 3.7;
  } else if (step.op === 'stew') {
    const a = .13 + random() * .23, dx = pose.x - C, dy = pose.y - C;
    out.x = C + dx * Math.cos(a) - dy * Math.sin(a); out.y = C + dx * Math.sin(a) + dy * Math.cos(a); out.rot += a * .6;
  } else if (step.op === 'reduce') { out.x = mix(pose.x, C, .065); out.y = mix(pose.y, C, .065); }
  return contain(out, p.radius);
}
function bake(p, texture, look) {
  const soft = look.soft, shrink = 1 - soft * .13;
  const pts = p.pts.map(([x, y]) => [x * shrink, y * shrink]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), pad = 9;
  const b = { x: Math.floor(Math.min(...xs) - pad), y: Math.floor(Math.min(...ys) - pad), w: Math.ceil(Math.max(...xs) - Math.min(...xs) + pad * 2), h: Math.ceil(Math.max(...ys) - Math.min(...ys) + pad * 2 + p.thickness) };
  const path = pathFor(pts, p.kind === 'mash' ? .45 : soft * .22);
  const image = layer((c) => {
    c.translate(-b.x, -b.y);
    c.save(); c.translate(1, p.thickness * (1 - soft * .35)); c.fillStyle = look.glaze > .2 ? '#573419' : look.brown > .25 ? '#5a3218' : '#9e8557'; c.fill(path); c.restore();
    c.save(); c.clip(path); c.scale(shrink, shrink); c.drawImage(texture, -p.cx * p.span, -p.cy * p.span, p.span, p.span); c.scale(1 / shrink, 1 / shrink);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = grad(c, b.x, b.y, b.x + b.w, b.y + b.h, [[0, '#fff1c325'], [.4, '#fff2da00'], [1, '#06191b55']]); c.fillRect(b.x, b.y, b.w, b.h);
    if (look.wet) {
      c.fillStyle = grad(c, 0, b.y, 0, b.y + b.h, [[0, '#b2a16d00'], [.45, '#a48c4c0a'], [1, `rgba(65,62,30,${look.wet * .38})`]]); c.fillRect(b.x, b.y, b.w, b.h);
    }
    if (look.brown) {
      c.strokeStyle = `rgba(78,32,5,${look.brown * .86})`; c.lineWidth = 1.5 + look.brown * 5; c.stroke(path);
      const random = rng(hash(`${p.seed}:crust`));
      for (let i = 0; i < Math.ceil(look.brown * 28); i++) { c.fillStyle = i % 3 ? '#60300d5c' : '#e9b04d55'; circle(c, b.x + random() * b.w, b.y + b.h * (.5 + random() * .5), .5 + random() * 2.5); c.fill(); }
    }
    if (look.glaze) { c.strokeStyle = `rgba(71,28,7,${look.glaze * .7})`; c.lineWidth = 3; c.stroke(path); }
    if (look.gloss) {
      c.fillStyle = grad(c, b.x, b.y, b.x + b.w * .8, b.y + b.h, [[0, '#ffefba00'], [.24, `rgba(255,240,197,${look.gloss * .5})`], [.29, '#fff4ce06'], [.7, '#fff4ce00']]); c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = `rgba(255,235,184,${look.gloss * .54})`; c.lineWidth = .9; c.translate(-.5, -.7); c.stroke(path);
    }
    c.restore();
  }, b.w, b.h);
  return { image, ...b };
}

export function startPot(element, { reducedMotion = () => false } = {}) {
  const ctx = element.getContext('2d'), fx = sharedMaterial ||= material();
  const records = new Map(), hints = new Map();
  let view = { items: [], steps: [], heat: 2, stage: 'idle', dish: null }, first = true, active = null, serving = null, served = null, dishKey = null;
  let raf = 0, liquid = initialLiquid(), logicalScale = 1;
  const reduced = () => !!reducedMotion();
  function resize() {
    const size = element.getBoundingClientRect().width || element.clientWidth || 440;
    const n = Math.min(1280, Math.round(size * Math.min(2, window.devicePixelRatio || 1)));
    if (element.width !== n || element.height !== n) { element.width = element.height = n; logicalScale = n / S; }
    else logicalScale = n / S;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { resize(); wake(); }) : null;
  observer?.observe(element); resize();
  function rebuild(record, steps, beforeCount = -1) {
    if (!record.base) return;
    let texture = record.base, look = baseLook();
    if (beforeCount === steps.length - 1 && record.stepCount === beforeCount && record.texture) {
      const step = steps[beforeCount];
      if (beforeCount >= (record.item.inAt || 0) && POT_OPS[step.op]) {
        record.pieces.forEach((p) => { p.before = { pose: { ...p.pose }, sprite: p.sprite }; p.pose = stepPose(p, p.pose, step); });
        record.texture = cookTexture(record.texture, step); record.look = nextLook(record.look, step);
        record.pieces.forEach((p) => { p.sprite = bake(p, record.texture, record.look); });
      }
      record.stepCount = steps.length; return;
    }
    record.pieces.forEach((p) => { p.pose = { ...p.initial }; p.before = null; });
    for (let i = Math.max(0, record.item.inAt || 0); i < steps.length; i++) {
      if (!POT_OPS[steps[i].op]) continue;
      if (i === beforeCount) record.pieces.forEach((p) => { p.before = { pose: { ...p.pose }, sprite: bake(p, texture, look) }; });
      texture = cookTexture(texture, steps[i]); look = nextLook(look, steps[i]);
      record.pieces.forEach((p) => { p.pose = stepPose(p, p.pose, steps[i]); });
    }
    record.pieces.forEach((p) => { p.sprite = bake(p, texture, look); }); record.look = look; record.texture = texture; record.stepCount = steps.length;
  }
  function add(item, index, animate) {
    const pieces = makePieces(item, index); pieces.forEach((p) => { p.initial = { ...p.pose }; });
    const record = { item, pieces, base: null, drop: null, animate, hint: hints.get(item.id), index };
    hints.delete(item.id); records.set(item.id, record);
    const image = new Image();
    image.onload = () => {
      if (records.get(item.id) !== record) return;
      record.base = layer((c) => cover(c, image, 0, 0, TEX), TEX);
      rebuild(record, view.steps, active?.index ?? -1);
      if (record.animate && !reduced()) record.drop = { at: performance.now(), hint: record.hint };
      wake();
    };
    image.onerror = () => {
      if (records.get(item.id) !== record) return;
      record.base = layer((c) => { c.fillStyle = item.colors?.[0] || '#b29c6e'; c.fillRect(0, 0, TEX, TEX); }, TEX);
      rebuild(record, view.steps, active?.index ?? -1); wake();
    };
    image.src = item.src;
  }
  function update(next) {
    const steps = (next.steps || []).map((s) => ({ ...s })), items = next.items || [], now = performance.now();
    const sameSteps = steps.length === view.steps.length && steps.every((s, i) => s.op === view.steps[i].op && s.heat === view.steps[i].heat && s.seed === view.steps[i].seed);
    const newStep = !first && steps.length > view.steps.length && view.steps.every((s, i) => s.op === steps[i].op && s.heat === steps[i].heat && s.seed === steps[i].seed);
    const dirty = first || !sameSteps || next.heat !== view.heat || next.stage !== view.stage || next.dish !== view.dish || items.length !== records.size || items.some((item) => { const r = records.get(item.id); return !r || r.item.src !== item.src || r.item.shape?.kind !== item.shape?.kind || r.item.amount !== item.amount || r.item.inAt !== item.inAt; });
    if (!dirty) return;
    if (!sameSteps) {
      liquid = initialLiquid();
      steps.forEach((s, i) => { if (POT_OPS[s.op]) liquid = nextLiquid(liquid, s, items.filter((item) => (item.inAt || 0) <= i)); });
      const before = steps.slice(0, -1).reduce((l, s, i) => POT_OPS[s.op] ? nextLiquid(l, s, items.filter((item) => (item.inAt || 0) <= i)) : l, initialLiquid());
      active = newStep && !reduced() ? { at: now, index: steps.length - 1, step: steps.at(-1), before, after: liquid } : null;
    }
    const ids = new Set(items.map((i) => i.id));
    records.forEach((_, id) => { if (!ids.has(id)) records.delete(id); });
    if (items.length && (first || items.some((i) => !records.has(i.id)))) { if (serving) finishServe(); served = null; dishKey = null; }
    view = { ...next, items, steps };
    items.forEach((item, i) => {
      const r = records.get(item.id);
      if (!r || r.item.src !== item.src || r.item.shape?.kind !== item.shape?.kind || r.item.amount !== item.amount || r.item.inAt !== item.inAt) add(item, i, !first && !r);
      else { r.item = item; if (!sameSteps) rebuild(r, steps, active?.index ?? -1); }
    });
    if (!items.length && next.stage === 'done' && next.dish && next.dish !== dishKey) {
      dishKey = next.dish;
      if (typeof next.dish === 'string') { const key = dishKey, image = new Image(); image.onload = () => { if (dishKey === key && !view.items.length) { served = image; wake(); } }; image.src = key; }
      else served = next.dish;
    }
    if (!items.length && next.stage !== 'done' && !serving) { served = null; dishKey = null; }
    first = false; resize(); draw(now); wake();
  }
  function finishServe() {
    if (!serving) return;
    const s = serving; served = s.dish; serving = null; s.resolve();
  }
  function serve(dish) {
    if (serving) finishServe();
    active = null; records.forEach((r) => { r.drop = null; r.pieces.forEach((p) => { p.before = null; }); });
    if (reduced()) { served = dish; draw(performance.now()); return Promise.resolve(); }
    return new Promise((resolve) => { serving = { dish, at: performance.now(), resolve }; wake(); });
  }
  function dishRect() {
    const b = element.getBoundingClientRect(), size = b.width * FOOD * 2 / S;
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, size };
  }
  function frame(now) {
    raf = 0;
    if (reduced()) { active = null; records.forEach((r) => { r.drop = null; }); if (serving) finishServe(); }
    if (active && now - active.at >= POT_STEP_MS) { active = null; records.forEach((r) => r.pieces.forEach((p) => { p.before = null; })); }
    records.forEach((r) => { if (r.drop && now - r.drop.at >= DROP_MS) r.drop = null; });
    if (serving && now - serving.at >= SERVE_MS) finishServe();
    draw(now);
    if (active || serving || [...records.values()].some((r) => r.drop)) wake();
  }
  function draw(now) {
    const u = active ? clamp((now - active.at) / POT_STEP_MS) : 1, op = active?.step.op;
    const heat = active?.step.heat || view.heat || 2, time = active ? (now - active.at) / 1000 : 0;
    const l = active ? interpolateLiquid(active.before, active.after, smooth(u)) : liquid;
    const su = serving ? clamp((now - serving.at) / SERVE_MS) : 0;
    const bounds = element.getBoundingClientRect();
    ctx.setTransform(logicalScale, 0, 0, logicalScale, 0, 0); ctx.clearRect(0, 0, S, S);
    drawFire(ctx, view.steps.length ? active ? heat : .35 : 0, time);
    ctx.drawImage(fx.body, 0, 0);
    ctx.save(); circle(ctx, C, C, R - 21); ctx.clip();
    drawLiquid(ctx, l, time, !!active);
    if (served && !serving) { ctx.save(); circle(ctx, C, C, FOOD); ctx.clip(); cover(ctx, served, C - FOOD, C - FOOD, FOOD * 2); ctx.restore(); }
    else {
      if (serving) { const alpha = ramp(su, .24, .84); ctx.save(); ctx.globalAlpha = alpha; const r = FOOD * mix(.34, 1, ramp(su, .18, .95)); circle(ctx, C, C, r); ctx.clip(); cover(ctx, serving.dish, C - FOOD, C - FOOD, FOOD * 2); ctx.restore(); }
      const pieces = [];
      records.forEach((r) => { if (r.base) r.pieces.forEach((p) => pieces.push({ p, r, pose: poseAt(p, r, active, u, now, serving, su, bounds) })); });
      // y-depth interleaves ingredients after tossing, while addition order remains stable underneath.
      pieces.sort((a, b) => a.pose.z - b.pose.z || a.pose.y - b.pose.y || a.r.index - b.r.index);
      pieces.forEach(({ p, pose }) => paintPiece(ctx, p, pose, active ? smooth(u) : 1, fx.shadow));
    }
    if (active) drawAction(ctx, fx, op, u, heat, time);
    // The curved wall darkens the waterline and makes the photo pieces sit inside the pan.
    ctx.fillStyle = radial(ctx, C, C, R - 19, [[0, '#07121400'], [.78, '#07121400'], [.93, '#07121420'], [1, '#03090b9c']]); ctx.fillRect(55, 55, 530, 530);
    ctx.restore();
    if (active && op === 'steam') {
      const a = ramp(u, 0, .2) * (1 - ramp(u, .77, 1));
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * 40, -(1 - a) * 165); ctx.drawImage(fx.lid, 0, 0); ctx.restore();
    }
    if (active && (op === 'stew' || op === 'stirfry')) drawTool(ctx, op, u);
    // Drops are allowed to cross the far rim. Draw only their airborne part above the vessel.
    records.forEach((r) => { if (r.base && r.drop) r.pieces.forEach((p) => { const pose = poseAt(p, r, active, u, now, serving, su, bounds); if (pose.airborne) paintPiece(ctx, p, pose, 1, fx.shadow, true); }); });
  }
  return { update, dropFrom(id, rect) { hints.set(id, { x: rect.x ?? rect.left, y: rect.y ?? rect.top, width: rect.width, height: rect.height }); }, serve, dishRect };
}

function poseAt(p, record, active, u, now, serving, su, bounds) {
  const from = p.before?.pose || p.pose, k = active && p.before ? smooth(u) : 1;
  const pose = { x: mix(from.x, p.pose.x, k), y: mix(from.y, p.pose.y, k), rot: mix(from.rot, p.pose.rot, k), z: 0, scale: 1, flip: 1, alpha: 1, airborne: false };
  if (active && p.before) {
    const v = Math.sin(u * Math.PI), seed = p.seed;
    if (active.step.op === 'stirfry') {
      const toss = Math.sin(clamp((u - .08) / .82) * Math.PI * 3);
      pose.z = Math.max(0, toss) * (48 + active.step.heat * 14) * (.65 + seed * .35);
      pose.x += Math.sin(u * TAU * 1.5 + seed * 3) * v * 20; pose.rot += Math.sin(u * TAU * 1.5) * v * 1.2;
      pose.flip = Math.max(.22, Math.abs(Math.cos(u * TAU * 1.5 + seed * v)));
    } else if (active.step.op === 'stew') { pose.x += Math.sin(u * TAU + seed * 6) * v * 6; pose.y += Math.cos(u * TAU + seed * 6) * v * 5; }
    else if (active.step.op === 'sear') { pose.y += Math.sin(u * 90 + seed * 30) * v * .6; pose.flip = 1 - v * .05; }
    else if (active.step.op === 'reduce') { pose.y += Math.sin(u * 30 + seed * 15) * v * 1.5; }
  }
  if (record.drop) {
    const elapsed = (now - record.drop.at) / DROP_MS, d = clamp((elapsed - p.seed * .12) / .83), k = smooth(d);
    const b = bounds, hint = record.drop.hint;
    const sx = hint ? ((hint.x + hint.width * p.cx - b.left) / b.width) * S : 115 + (p.cx - .5) * 150;
    const sy = hint ? ((hint.y + hint.height * p.cy - b.top) / b.height) * S : 10 + (p.cy - .5) * 150;
    pose.x = mix(sx, pose.x, k); pose.y = mix(sy, pose.y, d * d); pose.z = Math.sin(d * Math.PI) * 24;
    pose.rot *= k; pose.scale = mix(hint ? Math.min(1.8, hint.width / b.width * S / p.span) : .78, 1, k); pose.airborne = d < .86;
    if (d > .86) pose.y -= Math.sin((d - .86) / .14 * Math.PI) * 3;
  }
  if (serving) { const g = ramp(su, 0, .72); pose.x = mix(pose.x, C + (p.cx - .5) * 110, g); pose.y = mix(pose.y, C + (p.cy - .5) * 110, g); pose.rot *= 1 - g; pose.scale *= 1 - g * .54; pose.alpha = 1 - ramp(su, .38, .88); }
  return pose;
}
function paintPiece(c, p, pose, u, shadow, above = false) {
  if (!p.sprite || pose.alpha < .002 || (!above && pose.airborne)) return;
  c.save(); c.globalAlpha = pose.alpha;
  if (!above) { const w = Math.max(8, p.sprite.w * .96), h = Math.max(6, p.sprite.h * .36); c.globalAlpha *= .8 - pose.z / 180; c.drawImage(shadow, pose.x - w / 2 + 3 + pose.z * .05, pose.y - h / 2 + 4, w, h); c.globalAlpha = pose.alpha; }
  c.translate(pose.x, pose.y - pose.z); c.rotate(pose.rot); c.scale(pose.scale, pose.scale * pose.flip);
  const old = p.before?.sprite;
  if (old && u < 1) { c.globalAlpha = pose.alpha; c.drawImage(old.image, old.x, old.y); c.globalAlpha = pose.alpha * u; }
  c.drawImage(p.sprite.image, p.sprite.x, p.sprite.y); c.restore();
}
function drawFire(c, heat, time) {
  if (!heat) return;
  c.save();
  const r = R + 22, strength = heat < 1 ? .35 : 1;
  c.globalAlpha = strength;
  for (let i = 0; i < 74; i++) {
    const a = i / 74 * TAU, v = Math.sin(i * 13.7 + time * 12) * .5 + .5, len = 5 + heat * 4 + v * 7;
    c.save(); c.translate(C + Math.cos(a) * r, C + Math.sin(a) * r); c.rotate(a);
    c.fillStyle = grad(c, 0, 0, len + 7, 0, [[0, '#5dbcfad9'], [.35, '#3a87f5a0'], [.7, '#f8bc6c40'], [1, '#f8bc6c00']]);
    c.beginPath(); c.moveTo(-3, -2.4); c.quadraticCurveTo(len * .7, -3, len + 6, Math.sin(i + time * 4) * 2); c.quadraticCurveTo(len * .4, 2, -3, 2.5); c.fill(); c.restore();
  }
  c.restore();
}
function drawLiquid(c, l, time, moving) {
  const wet = l.level > .18, r = mix(174, 240, l.level), glaze = l.glaze;
  const [rr, gg, bb] = l.tint.map(Math.round);
  c.save(); circle(c, C, C, r);
  c.fillStyle = wet ? radial(c, C, C, r * 1.15, [[0, `rgba(${rr + 20},${gg + 11},${bb + 4},.90)`], [.55, `rgba(${rr},${gg},${bb},.93)`], [1, '#181c13fa']], 235, 210) : glaze > .1 ? radial(c, C, C, r, [[0, '#6f3c1fbd'], [.6, '#452d16bf'], [1, '#211f1470']], 240, 230) : radial(c, C, C, r, [[0, '#b2a96016'], [.7, '#8d9d6120'], [1, '#9aa17902']]); c.fill();
  c.strokeStyle = wet ? '#d1b46b44' : '#e7d78f21'; c.lineWidth = wet ? 2 : 1; c.stroke();
  // Irregular oil rivulets and a broken window reflection, rather than a flat colour disk.
  for (let i = 0; i < 20; i++) {
    const a = i * 2.399 + (moving ? time * .025 : 0), d = Math.sqrt((i + .5) / 21) * r * .82;
    const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
    c.beginPath(); c.ellipse(x, y, 8 + i % 6 * 5, 2 + i % 5 * 2, a, .1, 4.3); c.strokeStyle = i % 3 ? `rgba(235,202,127,${wet ? .13 : .09 + l.oil * .07})` : '#bdd7cf22'; c.lineWidth = .8; c.stroke();
  }
  c.save(); c.translate(232, 208); c.rotate(-.5);
  for (let j = 0; j < 12; j++) { const y = j * 4, bend = Math.sin(time * .8 + j * .6) * 2; c.beginPath(); c.moveTo(-36 + j, y); c.bezierCurveTo(-20, y - 2, 19, y + bend, 40 - j, y + 1); c.strokeStyle = `rgba(255,245,202,${Math.sin(j / 12 * Math.PI) * (wet ? .16 : .08)})`; c.lineWidth = 1; c.stroke(); }
  c.restore(); c.restore();
}
function drawAction(c, fx, op, u, heat, time) {
  const envelope = Math.sin(Math.PI * u) ** .45, random = rng(hash(`${op}:effects`));
  if (['stew', 'reduce', 'sear', 'stirfry'].includes(op)) {
    const n = (op === 'reduce' ? 26 : op === 'stew' ? 14 : 18) + heat * 7;
    for (let i = 0; i < n; i++) {
      const a = random() * TAU, d = Math.sqrt(random()) * 220, phase = (time * (op === 'reduce' ? 1.1 + heat * .3 : .7 + heat * .2) + random()) % 1;
      const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d, boiling = op === 'stew' || op === 'reduce';
      const r = (boiling ? 2 + Math.sin(phase * Math.PI) * (op === 'reduce' ? 5 + heat * 1.5 : 3 + heat) : .7 + Math.sin(phase * Math.PI) * 1.8) * envelope;
      c.save(); c.globalAlpha = envelope * (1 - phase * .4); circle(c, x, y, r); c.fillStyle = boiling ? '#d1ac6240' : '#f5d88650'; c.fill();
      c.strokeStyle = boiling ? '#251c0da6' : '#e4cd8c72'; c.lineWidth = .8; c.stroke();
      c.beginPath(); c.ellipse(x - r * .12, y - r * .18, r * .65, r * .5, -.2, 3.5, 5.2); c.strokeStyle = '#fff0bcb0'; c.stroke(); c.restore();
    }
  }
  if (op === 'sear' || op === 'stirfry') {
    for (let i = 0; i < 20 + heat * 6; i++) {
      const a = random() * TAU, d = 60 + random() * 160, t = (time * 1.8 + random()) % 1;
      const x = C + Math.cos(a) * (d + t * 22), y = C + Math.sin(a) * d - Math.sin(t * Math.PI) * (15 + heat * 9);
      c.globalAlpha = (1 - t) * envelope; circle(c, x, y, .7 + random() * 1.5); c.fillStyle = '#f5cb78'; c.fill();
    }
    c.globalAlpha = 1;
  }
  if (op === 'stew' && u < .3) {
    const f = Math.sin(clamp(u / .3) * Math.PI); c.save(); c.globalAlpha = f * .85; c.strokeStyle = '#d6b36d'; c.lineWidth = 13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(113, 38); c.bezierCurveTo(135, 102, 160, 137, 193, 211); c.stroke(); c.strokeStyle = '#fff1bc90'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#e0c48470'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(193, 211, 12 + u * 70, 6 + u * 30, -.3, 0, TAU); c.stroke(); c.restore();
  }
  if (op === 'steam' || op === 'stew' || op === 'reduce' || op === 'stirfry') {
    const count = op === 'steam' ? 7 + heat * 3 : op === 'stirfry' ? 2 + heat : 3 + heat * 2;
    for (let i = 0; i < count; i++) {
      const a = random() * TAU, d = random() * 174, life = (time * .36 + random()) % 1;
      const x = C + Math.cos(a) * d + Math.sin(time * 2 + i) * 8, y = C + Math.sin(a) * d * .7 - life * 115;
      c.save(); c.globalAlpha = Math.sin(life * Math.PI) * envelope * (op === 'steam' ? .84 : .4); const size = 65 + life * 85;
      c.drawImage(fx.vapors[i % 3], x - size / 2, y - size, size, size * 1.5); c.restore();
    }
  }
  if (op === 'steam') { c.save(); c.globalAlpha = envelope * .15; circle(c, C, C, FOOD); c.fillStyle = '#d7e7d3'; c.fill(); c.restore(); }
  // The reduced syrup draws short, thick glints between coated pieces.
  if (op === 'reduce') {
    c.save(); c.globalAlpha = ramp(u, .2, .7) * envelope;
    for (let i = 0; i < 12; i++) { const a = random() * TAU, d = random() * 185; c.strokeStyle = '#edc07c65'; c.lineWidth = 2; c.beginPath(); c.ellipse(C + Math.cos(a) * d, C + Math.sin(a) * d, 12, 4, a, 0, 2.1); c.stroke(); } c.restore();
  }
}
function drawTool(c, op, u) {
  const vis = ramp(u, .08, .2) * (1 - ramp(u, .83, .98)); if (vis < .01) return;
  const sweep = smooth(clamp((u - .15) / .65));
  const x = op === 'stirfry' ? 470 - sweep * 275 : 390 + Math.sin(u * TAU) * 85, y = op === 'stirfry' ? 390 - Math.sin(sweep * Math.PI) * 100 : 375 + Math.cos(u * TAU) * 55;
  c.save(); c.globalAlpha = vis; c.translate(x + (1 - vis) * 110, y + (1 - vis) * 100); c.rotate(.7 + Math.sin(u * TAU) * .15);
  c.shadowColor = '#0008'; c.shadowBlur = 9; c.shadowOffsetX = 5; c.shadowOffsetY = 8;
  c.fillStyle = grad(c, -9, 0, 10, 0, [[0, '#514b3a'], [.3, '#c0b797'], [.52, '#777564'], [1, '#292d29']]); c.beginPath(); c.roundRect(-8, 15, 16, 240, 7); c.fill();
  c.fillStyle = grad(c, -9, 0, 10, 0, [[0, '#51331e'], [.4, '#a47b48'], [1, '#4f3826']]); c.beginPath(); c.roundRect(-10, 145, 20, 110, 7); c.fill(); c.shadowColor = 'transparent';
  const metal = grad(c, -45, -25, 40, 30, [[0, '#eef0dc'], [.3, '#a7b7ae'], [.6, '#607671'], [1, '#b3beb0']]); c.fillStyle = metal;
  if (op === 'stirfry') {
    c.beginPath(); c.roundRect(-42, -30, 84, 62, [5, 5, 17, 17]); c.fill(); c.strokeStyle = '#eff8df88'; c.lineWidth = 2; c.beginPath(); c.moveTo(-36, -26); c.lineTo(35, -26); c.stroke();
    for (let i = -1; i <= 1; i++) { c.fillStyle = '#304846bb'; c.beginPath(); c.roundRect(i * 17 - 2, -16, 4, 27, 2); c.fill(); }
  } else {
    c.beginPath(); c.ellipse(0, 0, 39, 32, 0, 0, TAU); c.fill();
    c.fillStyle = radial(c, 0, 0, 34, [[0, '#a57539'], [.65, '#624922'], [.92, '#1c2923'], [1, '#d1d8bf']], -12, -10); c.beginPath(); c.ellipse(0, 0, 33, 26, 0, 0, TAU); c.fill();
    c.strokeStyle = '#ffedb8a0'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(-5, -5, 23, 15, -.2, 3.3, 5.3); c.stroke();
  }
  c.restore();
}
