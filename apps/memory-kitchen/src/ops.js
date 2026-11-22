// Baked, ordered picture cooking. Every texture comes from the CURRENT input pixels.
// Keep the planner DOM-free and independent of state/recipe (state imports this catalogue).
export const OPS = {
  slice: { label: '切片', tool: '菜刀', en: 'sliced', blurb: '顺着刀口，记忆滑成薄片。' },
  dice: { label: '切丁', tool: '菜刀', en: 'diced', blurb: '横一刀，竖一刀，切成小方丁。' },
  shred: { label: '擦丝', tool: '擦丝器', en: 'shredded', blurb: '擦下细细的丝，卷成一小堆。' },
  mash: { label: '捣碎', tool: '杵', en: 'mashed', blurb: '捣成带着碎块的软泥。' },
  flatten: { label: '擀平', tool: '擀面杖', en: 'rolled thin', blurb: '来回擀开，摊成薄薄一张。' },
  marinate: { label: '腌制', tool: '碗', en: 'marinated', blurb: '让自己的颜色，慢慢浸透。' },
  season: { label: '撒盐', tool: '盐罐', en: 'seasoned', blurb: '撒一点晶亮，收紧一点滋味。' },
  dry: { label: '晾干', tool: '竹筛', en: 'sun-dried', blurb: '晒暖、收缩，边缘轻轻卷起。' },
};
export const MIX = { label: '拌在一起', en: 'tossed together', blurb: '落在一起，翻拌几下，还认得彼此。' };
export const OP_PLAY_MS = 2200;

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ramp = (u, a, b) => clamp((u - a) / (b - a));
const ease = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
const rngFor = (op, seed) => {
  let h = 2166136261;
  for (const c of `${op}|${seed >>> 0}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
function halfPlane(poly, nx, ny, d) {
  const out = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const a = p[0] * nx + p[1] * ny - d;
    const b = q[0] * nx + q[1] * ny - d;
    if (a <= 1e-9) out.push(p);
    if ((a < 0) !== (b < 0)) out.push([lerp(p[0], q[0], a / (a - b)), lerp(p[1], q[1], a / (a - b))]);
  });
  return out;
}
function band(poly, nx, ny, lo, hi) {
  return halfPlane(halfPlane(poly, nx, ny, hi), -nx, -ny, -lo);
}
const center = (p) => [p.reduce((a, v) => a + v[0], 0) / p.length, p.reduce((a, v) => a + v[1], 0) / p.length];
function irregular(cx, cy, rx, ry, rng, n = 12) {
  return Array.from({ length: n }, (_, i) => {
    const a = i / n * TAU; const r = .83 + rng() * .17;
    return [clamp(cx + Math.cos(a) * rx * r), clamp(cy + Math.sin(a) * ry * r)];
  });
}
function tornSheet(rng, insetX, insetY) {
  const out = [];
  for (let i = 0; i <= 24; i++) out.push([lerp(insetX, 1 - insetX, i / 24), insetY + rng() * .026]);
  for (let i = 0; i <= 12; i++) out.push([1 - insetX - rng() * .019, lerp(insetY, 1 - insetY, i / 12)]);
  for (let i = 0; i <= 24; i++) out.push([lerp(1 - insetX, insetX, i / 24), 1 - insetY - rng() * .026]);
  for (let i = 0; i <= 12; i++) out.push([insetX + rng() * .019, lerp(1 - insetY, insetY, i / 12)]);
  return out;
}

// Only numbers, arrays and plain objects. All coordinates (including tools) are in units.
export function planOp(op, seed) {
  if (!OPS[op] && op !== 'mix') throw new RangeError(`Unknown operation: ${op}`);
  const rng = rngFor(op, seed);
  if (op === 'slice' || op === 'dice') {
    const angle = (rng() - .5) * 1.8;
    const nx = Math.cos(angle); const ny = Math.sin(angle);
    const extent = (Math.abs(nx) + Math.abs(ny)) / 2;
    const n = op === 'slice' ? 9 + Math.floor(rng() * 3) : 9;
    const pieces = [];
    for (let i = 0; i < n; i++) {
      const lo = .5 * (nx + ny) - extent + i * 2 * extent / n;
      const poly = band(square, nx, ny, lo, lo + 2 * extent / n);
      const add = (p, row) => {
        if (p.length < 3) return;
        const c = center(p);
        pieces.push({ poly: p, cx: c[0], cy: c[1],
          dx: op === 'slice' ? nx * ((i / (n - 1) - .5) * .13) - ny * (rng() - .5) * .045 : (rng() - .5) * .032,
          dy: op === 'slice' ? ny * ((i / (n - 1) - .5) * .13) + nx * (rng() - .5) * .045 : (rng() - .5) * .032,
          rot: (rng() - .5) * (op === 'slice' ? .085 : .34),
          at: op === 'slice' ? i / n * .7 : .32 + row / n * .4,
        });
      };
      if (op === 'slice') add(poly, 0);
      else for (let j = 0; j < n; j++) {
        const d = .5 * (-ny + nx) - extent + j * 2 * extent / n;
        add(band(poly, -ny, nx, d, d + 2 * extent / n), j);
      }
    }
    return { kind: op, angle, n, pieces, scale: op === 'slice' ? .88 : .9 };
  }
  if (op === 'shred') {
    const threads = Array.from({ length: 108 }, (_, i) => {
      const a = rng() * TAU; const r = Math.sqrt(rng());
      return { x: .5 + Math.cos(a) * r * .28, y: .52 + Math.sin(a) * r * .31,
        len: .3 + rng() * .33, w: .005 + rng() * .007, rot: (rng() - .5) * 2.5,
        bend: .035 + rng() * .075, phase: rng() * TAU, curl: 1 + rng() * .65,
        sx: (i + .12) / 109, sy: rng() * .15, sw: .007, sh: .73 + rng() * .1,
        at: i / 108 * .72, z: rng() };
    });
    return { kind: op, threads };
  }
  if (op === 'mash') {
    return { kind: op, smear: (rng() - .5) * Math.PI,
      chunks: Array.from({ length: 112 }, () => {
        const s = .045 + rng() * .095;
        return { sx: rng() * (1 - s), sy: rng() * (1 - s), s,
          x: .06 + rng() * .88, y: .07 + rng() * .86,
          rot: rng() * TAU, squash: .5 + rng() * .45, sunk: rng() < .42,
          poly: irregular(0.5, 0.5, .49, .48, rng, 9), at: rng() * .72 };
      }).sort((a, b) => Number(b.sunk) - Number(a.sunk)),
      streaks: Array.from({ length: 22 }, () => ({ x: .07 + rng() * .86, y: .06 + rng() * .88, len: .09 + rng() * .2, w: .002 + rng() * .005 })) };
  }
  if (op === 'flatten') return { kind: op, poly: tornSheet(rng, .025, .175),
    streaks: Array.from({ length: 36 }, () => ({ x: .06 + rng() * .8, y: .19 + rng() * .6, len: .04 + rng() * .17, w: .001 + rng() * .003 })) };
  if (op === 'marinate') return { kind: op, strength: .22 + rng() * .05,
    waves: Array.from({ length: 4 }, () => ({ f: 2 + rng() * 4, a: .006 + rng() * .012, ph: rng() * TAU })),
    drips: Array.from({ length: 9 }, () => ({ x: .05 + rng() * .9, len: .05 + rng() * .17, w: .008 + rng() * .014 })),
    beads: Array.from({ length: 28 }, () => ({ x: .04 + rng() * .92, y: .05 + rng() * .9, r: .004 + rng() * .013 })) };
  if (op === 'season') return { kind: op,
    crystals: Array.from({ length: 155 }, () => ({ x: .025 + rng() * .95, y: .025 + rng() * .95,
      r: .0018 + rng() * .0038, rot: rng() * TAU, at: rng() * .7,
      spice: rng() < .15, sparkle: rng() < .13, phase: rng() * TAU })) };
  if (op === 'dry') return { kind: op, poly: tornSheet(rng, .07, .075),
    cracks: Array.from({ length: 42 }, () => {
      const side = Math.floor(rng() * 4); const t = .1 + rng() * .8; const len = .025 + rng() * .1;
      const x = side < 2 ? (side === 0 ? .08 : .92) : t;
      const y = side < 2 ? t : (side === 2 ? .09 : .91);
      const dx = side < 2 ? (side === 0 ? len : -len) : (rng() - .5) * .04;
      const dy = side < 2 ? (rng() - .5) * .04 : (side === 2 ? len : -len);
      return { x, y, dx, dy, fork: rng() < .55 };
    }), ridges: Array.from({ length: 18 }, () => ({ x: .1 + rng() * .8, y: .12 + rng() * .76, len: .03 + rng() * .12, rot: rng() * TAU })) };
  // The dropped picture falls onto the target; a spoon lifts alternating folds of both.
  const pieces = [];
  for (let i = 0; i < 16; i++) for (let owner = 0; owner < 2; owner++) {
    const col = i % 4; const row = Math.floor(i / 4);
    pieces.push({ owner, sx: col / 4, sy: row / 4, sw: .25, sh: .25,
      x: .13 + col * .24 + (rng() - .5) * .06, y: .14 + row * .235 + (rng() - .5) * .07,
      rot: (rng() - .5) * .95, scale: .87 + rng() * .2, fold: (rng() - .5) * .23,
      at: rng() * .22, z: i + rng() * 2 + owner * .2 });
  }
  pieces.sort((a, b) => a.z - b.z);
  return { kind: op, pieces };
}

function canvas(size) {
  const c = document.createElement('canvas'); c.width = c.height = Math.max(1, Math.round(size)); return c;
}
function path(ctx, pts, size = 1) {
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * size, y * size) : ctx.moveTo(x * size, y * size)); ctx.closePath();
}
function copy(input) {
  const c = canvas(input.width); c.getContext('2d').drawImage(input, 0, 0, c.width, c.height); return c;
}
function analyse(input) {
  const c = canvas(64); const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(input, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  let left = 64, right = 0, top = 64, bottom = 0, sum = 0, weight = 0, coverage = 0;
  const bins = new Map();
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4; const alpha = data[i + 3] / 255; coverage += alpha;
    if (alpha < .16) continue;
    left = Math.min(left, x); right = Math.max(right, x + 1); top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
    const r = data[i], g = data[i + 1], b = data[i + 2];
    sum += (r * .2126 + g * .7152 + b * .0722) * alpha; weight += alpha;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bin = bins.get(key) || [0, 0, 0, 0]; bin[0] += alpha; bin[1] += r * alpha; bin[2] += g * alpha; bin[3] += b * alpha; bins.set(key, bin);
  }
  const allBins = [...bins.values()];
  // A black backdrop is not the marinade: favour populated, chromatic midtones.
  const coloured = allBins.filter((v) => {
    const rgb = v.slice(1).map((c) => c / v[0]);
    return Math.max(...rgb) - Math.min(...rgb) > 22 && Math.max(...rgb) > 48;
  });
  const best = (coloured.length ? coloured : allBins).sort((a, b) => b[0] - a[0])[0] || [1, 155, 125, 85];
  const rgb = best.slice(1).map((v) => Math.round(v / best[0]));
  const bounds = weight ? [left / 64, top / 64, (right - left) / 64, (bottom - top) / 64] : [0, 0, 1, 1];
  return { rgb, luma: weight ? sum / weight : 128, bounds, coverage: coverage / 4096 };
}
function material(input, stats, size) {
  const c = canvas(size); const ctx = c.getContext('2d');
  let [x, y, w, h] = stats.bounds;
  // Reframe the occupied food, not an ever-growing transparent border. No original photo.
  // A repeated operation can redistribute mass without exponentially shrinking it away.
  if (Math.max(w, h) < .89) {
    const k = .94 / Math.max(w, h); const dw = w * k * size; const dh = h * k * size;
    ctx.drawImage(input, x * input.width, y * input.height, w * input.width, h * input.height, (size - dw) / 2, (size - dh) / 2, dw, dh);
  } else ctx.drawImage(input, 0, 0, size, size);
  return c;
}
function shade(ctx, size, amount = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, `rgba(255,244,207,${.17 * amount})`); g.addColorStop(.35, 'rgba(255,245,220,0)'); g.addColorStop(1, `rgba(37,29,22,${.14 * amount})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); ctx.restore();
}
function texturePiece(src, poly, treatment = true) {
  const s = src.width;
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const x = Math.max(0, Math.floor(Math.min(...xs) * s) - 2), y = Math.max(0, Math.floor(Math.min(...ys) * s) - 2);
  const w = Math.min(s - x, Math.ceil(Math.max(...xs) * s) - x + 2), h = Math.min(s - y, Math.ceil(Math.max(...ys) * s) - y + 2);
  const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
  const ctx = c.getContext('2d'); ctx.translate(-x, -y); path(ctx, poly, s); ctx.clip(); ctx.drawImage(src, 0, 0);
  if (treatment) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = 'rgba(255,240,202,.3)'; ctx.lineWidth = s * .003; ctx.stroke();
    ctx.translate(s * .002, s * .003); ctx.strokeStyle = 'rgba(41,29,18,.22)'; ctx.lineWidth = s * .002; ctx.stroke();
  }
  return { c, x, y };
}
function shadow(ctx, s, alpha = .24, lift = 1) {
  ctx.shadowColor = `rgba(34,24,16,${alpha})`; ctx.shadowBlur = s * .008 * lift; ctx.shadowOffsetX = s * .003 * lift; ctx.shadowOffsetY = s * .006 * lift;
}
function curvePoints(t) {
  const points = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16; const x = (u - .5) * t.len;
    const y = Math.sin(u * TAU * t.curl + t.phase) * t.bend * (.45 + Math.sin(u * Math.PI) * .55);
    const c = Math.cos(t.rot), s = Math.sin(t.rot);
    points.push([t.x + x * c - y * s, t.y + x * s + y * c]);
  }
  return points;
}
function threadPoly(t) {
  const pts = curvePoints(t);
  const edge = (side) => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(16, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const w = t.w * (.38 + .62 * Math.sin(i / 16 * Math.PI) ** .3) / 2;
    return [clamp(p[0] - dy / d * w * side), clamp(p[1] + dx / d * w * side)];
  });
  return [...edge(1), ...edge(-1).reverse()];
}
function makeThreads(src, plan) {
  const s = src.width;
  return plan.threads.map((t) => {
    const poly = threadPoly(t), pts = curvePoints(t);
    const minX = Math.floor(Math.min(...poly.map((p) => p[0])) * s) - 2;
    const minY = Math.floor(Math.min(...poly.map((p) => p[1])) * s) - 2;
    const maxX = Math.ceil(Math.max(...poly.map((p) => p[0])) * s) + 2;
    const maxY = Math.ceil(Math.max(...poly.map((p) => p[1])) * s) + 2;
    const c = document.createElement('canvas'); c.width = Math.max(1, maxX - minX); c.height = Math.max(1, maxY - minY);
    const ctx = c.getContext('2d'); ctx.translate(-minX, -minY); path(ctx, poly, s); ctx.clip();
    for (let j = 0; j < 16; j++) {
      const a = pts[j], b = pts[j + 1]; const dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy) * s;
      ctx.save(); ctx.translate(a[0] * s, a[1] * s); ctx.rotate(Math.atan2(dy, dx));
      ctx.drawImage(src, t.sx * s, (t.sy + t.sh * j / 16) * s, t.sw * s, t.sh / 16 * s, -s * .002, -t.w * s * .65, len + s * .004, t.w * s * 1.3); ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = 'rgba(255,238,193,.35)'; ctx.lineWidth = s * .0015; ctx.stroke();
    return { c, x: minX, y: minY };
  });
}
// Collect sparse food before pressing it or feeding it back through the grater.
// Nearest occupied CURRENT pixels fill the sampling texture, while original alpha is
// retained in the visible chunks. This is cached work, never a per-frame pixel read.
function packedTexture(src) {
  const s = src.width, c = canvas(s), ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0);
  const image = ctx.getImageData(0, 0, s, s), data = image.data, n = s * s;
  const nearest = new Int32Array(n).fill(-1), queue = new Int32Array(n);
  let head = 0, tail = 0, best = -1, maxAlpha = 0;
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] > maxAlpha) { best = i; maxAlpha = data[i * 4 + 3]; }
    if (data[i * 4 + 3] >= 160) { nearest[i] = i; queue[tail++] = i; }
  }
  if (!maxAlpha) return c;
  if (!tail) { nearest[best] = best; queue[tail++] = best; }
  const visit = (i, from) => { if (nearest[i] === -1) { nearest[i] = nearest[from]; queue[tail++] = i; } };
  while (head < tail) {
    const i = queue[head++], x = i % s;
    if (x) visit(i - 1, i); if (x < s - 1) visit(i + 1, i);
    if (i >= s) visit(i - s, i); if (i < n - s) visit(i + s, i);
  }
  // Read seeds before writing any pixels so the fill is independent of scan order.
  const before = data.slice();
  for (let i = 0; i < n; i++) {
    const j = nearest[i] * 4, k = i * 4, a = before[k + 3] / 255;
    for (let channel = 0; channel < 3; channel++) data[k + channel] = Math.round(lerp(before[j + channel], before[k + channel], a));
    data[k + 3] = 255;
  }
  ctx.putImageData(image, 0, 0); return c;
}
function makePulp(src, plan) {
  const s = src.width, c = canvas(s), ctx = c.getContext('2d');
  // Broad mashed lobes lose the face/scene's layout while retaining its colours.
  // The mosaic is low-resolution before smoothing, so this reads as pulp, not tiles.
  const small = canvas(24), sm = small.getContext('2d');
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
    const p = plan.chunks[(y * 6 + x) * 3 % plan.chunks.length];
    sm.drawImage(src, p.sx * s, p.sy * s, p.s * s, p.s * s, x * 4, y * 4, 4, 4);
  }
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(small, 0, 0, s, s);
  // Four short directional smears leave fibres inside paste made from threads.
  ctx.globalAlpha = .035;
  for (let i = 1; i <= 4; i++) ctx.drawImage(src, Math.cos(plan.smear) * i * s * .017, Math.sin(plan.smear) * i * s * .017, s, s);
  ctx.globalAlpha = 1;
  shade(ctx, s, .45);
  return c;
}
function makeFlat(src, plan) {
  const s = src.width, c = canvas(s), ctx = c.getContext('2d');
  path(ctx, plan.poly, s); ctx.clip();
  const [x, y, w, h] = analyse(src).bounds;
  const spread = (dx) => ctx.drawImage(src, x * s, y * s, w * s, h * s, s * (.025 + dx), s * .175, s * .95, s * .65);
  spread(0); ctx.globalAlpha = .09;
  for (let i = 1; i <= 5; i++) spread(i * .007);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-atop';
  plan.streaks.forEach((p) => {
    ctx.strokeStyle = 'rgba(255,237,202,.13)'; ctx.lineWidth = p.w * s; ctx.beginPath(); ctx.moveTo(p.x * s, p.y * s); ctx.lineTo((p.x + p.len) * s, (p.y + .004) * s); ctx.stroke();
  });
  ctx.strokeStyle = 'rgba(255,239,211,.5)'; ctx.lineWidth = s * .007; path(ctx, plan.poly, s); ctx.stroke();
  ctx.globalCompositeOperation = 'destination-in';
  const edge = ctx.createLinearGradient(0, s * .175, 0, s * .825);
  edge.addColorStop(0, 'rgba(0,0,0,.5)'); edge.addColorStop(.08, '#000'); edge.addColorStop(.88, '#000'); edge.addColorStop(1, 'rgba(0,0,0,.48)');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, s, s); return c;
}
function makeGlaze(src, stats, plan) {
  const s = src.width, c = canvas(s), ctx = c.getContext('2d');
  // Low-luma inputs get a small lift so six marinades do not converge to black.
  ctx.filter = `brightness(${stats.luma < 75 ? 1.12 : .97}) saturate(1.16) contrast(1.02)`; ctx.drawImage(src, 0, 0); ctx.filter = 'none';
  const rgb = stats.rgb.map((v) => Math.round(clamp(v, 78, 232)));
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = `rgba(${rgb.join(',')},${plan.strength * .42})`; ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'multiply';
  // Multiply a coloured veil, not the entire image by its own dark colour.
  const veil = canvas(s), vctx = veil.getContext('2d'); vctx.drawImage(src, 0, 0);
  vctx.globalCompositeOperation = 'source-in'; vctx.fillStyle = `rgba(${rgb.join(',')},.24)`; vctx.fillRect(0, 0, s, s);
  ctx.drawImage(veil, 0, 0); ctx.globalCompositeOperation = 'source-atop';
  const gloss = ctx.createLinearGradient(0, 0, s, s * .7);
  gloss.addColorStop(0, 'rgba(255,244,222,0)'); gloss.addColorStop(.34, 'rgba(255,244,222,.03)'); gloss.addColorStop(.4, 'rgba(255,248,232,.19)'); gloss.addColorStop(.46, 'rgba(255,244,222,.02)'); gloss.addColorStop(1, 'rgba(255,244,222,0)');
  ctx.fillStyle = gloss; ctx.fillRect(0, 0, s, s);
  for (const [offset, colour] of [[-.006, 'rgba(43,25,12,.46)'], [.003, 'rgba(255,234,181,.48)']]) {
    const rim = canvas(s), rctx = rim.getContext('2d'); rctx.drawImage(src, 0, 0);
    rctx.globalCompositeOperation = 'destination-out'; rctx.drawImage(src, offset * s, offset * s);
    rctx.globalCompositeOperation = 'source-in'; rctx.fillStyle = colour; rctx.fillRect(0, 0, s, s);
    ctx.drawImage(rim, 0, 0);
  }
  plan.beads.forEach((p) => {
    const x = p.x * s, y = p.y * s, r = p.r * s;
    const g = ctx.createRadialGradient(x - r * .3, y - r * .35, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,252,228,.5)'); g.addColorStop(.35, 'rgba(255,246,217,.09)'); g.addColorStop(.8, 'rgba(65,35,13,.02)'); g.addColorStop(1, 'rgba(44,27,13,.21)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.4, .2, 0, TAU); ctx.fill();
  });
  return c;
}
function makeDry(src, stats, plan) {
  const s = src.width, c = canvas(s), ctx = c.getContext('2d');
  path(ctx, plan.poly, s); ctx.clip();
  ctx.filter = `saturate(.79) contrast(1.07) brightness(${stats.luma > 186 ? .99 : 1.05})`;
  ctx.drawImage(src, s * .07, s * .075, s * .86, s * .85); ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(217,165,76,.07)'; ctx.fillRect(0, 0, s, s);
  plan.cracks.forEach((p) => {
    const x = p.x * s, y = p.y * s, dx = p.dx * s, dy = p.dy * s;
    ctx.strokeStyle = 'rgba(255,234,180,.45)'; ctx.lineWidth = s * .0034;
    ctx.beginPath(); ctx.moveTo(x + s * .002, y); ctx.lineTo(x + dx * .4 + s * .002, y + dy * .6); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.strokeStyle = 'rgba(61,41,22,.4)'; ctx.lineWidth = s * .0017; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * .4, y + dy * .6); ctx.lineTo(x + dx, y + dy);
    if (p.fork) { ctx.moveTo(x + dx * .55, y + dy * .55); ctx.lineTo(x + dx * .82 - dy * .28, y + dy * .82 + dx * .28); } ctx.stroke();
  });
  plan.ridges.forEach((p) => {
    ctx.save(); ctx.translate(p.x * s, p.y * s); ctx.rotate(p.rot);
    const g = ctx.createLinearGradient(0, -s * .006, 0, s * .006); g.addColorStop(0, 'rgba(255,234,187,.15)'); g.addColorStop(.5, 'rgba(55,34,17,.09)'); g.addColorStop(1, 'rgba(55,34,17,0)'); ctx.fillStyle = g; ctx.fillRect(0, -s * .006, p.len * s, s * .012); ctx.restore();
  });
  const rim = ctx.createLinearGradient(0, s * .07, 0, s * .93);
  rim.addColorStop(0, 'rgba(51,32,12,.22)'); rim.addColorStop(.04, 'rgba(255,227,170,.35)'); rim.addColorStop(.1, 'rgba(255,231,185,0)'); rim.addColorStop(.9, 'rgba(255,231,185,0)'); rim.addColorStop(.96, 'rgba(255,229,180,.32)'); rim.addColorStop(1, 'rgba(51,32,12,.23)');
  ctx.fillStyle = rim; ctx.fillRect(0, 0, s, s);
  ctx.lineWidth = s * .005; ctx.strokeStyle = 'rgba(225,192,134,.55)'; path(ctx, plan.poly, s); ctx.stroke(); return c;
}
function frontPath(ctx, plan, s, u) {
  const soak = ramp(u, .06, .87);
  const front = (x) => lerp(-.18, 1.18, soak) * s + plan.waves.reduce((a, w) => a + Math.sin(x / s * w.f * TAU + w.ph) * w.a * s, 0);
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let i = 0; i <= 64; i++) { const x = i / 64 * s; ctx.lineTo(x, front(x)); }
  ctx.lineTo(s, 0); ctx.closePath();
  plan.drips.forEach((p) => {
    const x = p.x * s, y = front(x), w = p.w * s, bottom = y + p.len * s * Math.sin(soak * Math.PI);
    ctx.moveTo(x - w / 2, y - s * .01); ctx.lineTo(x - w / 2, bottom); ctx.quadraticCurveTo(x, bottom + w, x + w / 2, bottom); ctx.lineTo(x + w / 2, y - s * .01); ctx.closePath();
  });
}
function crystal(ctx, p, s, u) {
  const v = ease(ramp(u, p.at, p.at + .2)); if (v <= 0) return;
  const x = (p.x + Math.sin((1 - v) * 5 + p.phase) * .018 * (1 - v)) * s;
  const y = (p.y - (1 - v) * (.15 + p.y)) * s;
  const r = p.r * s;
  ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + (1 - v) * 3);
  ctx.fillStyle = p.spice ? '#aa5c32' : '#e4d6b4'; ctx.strokeStyle = p.spice ? '#714124' : 'rgba(91,83,64,.35)'; ctx.lineWidth = s * .001;
  ctx.beginPath(); ctx.moveTo(-r, -.55 * r); ctx.lineTo(r * .45, -r); ctx.lineTo(r, .5 * r); ctx.lineTo(-r * .3, r); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = p.spice ? '#c18a46' : '#fffdf0'; ctx.beginPath(); ctx.moveTo(-r, -.55 * r); ctx.lineTo(r * .45, -r); ctx.lineTo(r * .15, 0); ctx.lineTo(-r * .7, r * .2); ctx.closePath(); ctx.fill();
  if (p.sparkle) {
    const a = u === 1 ? .42 : .25 + .75 * Math.sin(u * 19 + p.phase) ** 8;
    ctx.globalAlpha = a; ctx.strokeStyle = '#fffce4'; ctx.lineWidth = s * .0016; ctx.beginPath(); ctx.moveTo(-r * 2.4, 0); ctx.lineTo(r * 2.4, 0); ctx.moveTo(0, -r * 2.4); ctx.lineTo(0, r * 2.4); ctx.stroke();
  }
  ctx.restore();
}

function cutPaint(ctx, s, u, plan, layers) {
  const k = ease(ramp(u, .04, .9));
  plan.pieces.forEach((p, i) => {
    const v = ease(ramp(u, p.at, p.at + .23)); const tile = layers.pieces[i];
    ctx.save(); ctx.translate(s / 2, s / 2); ctx.scale(lerp(1, plan.scale, k), lerp(1, plan.scale, k)); ctx.translate(-s / 2, -s / 2);
    ctx.translate((p.cx + p.dx * v) * s, (p.cy + p.dy * v) * s); ctx.rotate(p.rot * v);
    if (v > 0) shadow(ctx, s, .22 * v);
    ctx.drawImage(tile.c, tile.x - p.cx * s, tile.y - p.cy * s); ctx.restore();
  });
}
function paint(ctx, s, u, plan, layers, stats) {
  const src = layers.src;
  if (plan.kind === 'slice' || plan.kind === 'dice') return cutPaint(ctx, s, u, plan, layers);
  if (plan.kind === 'shred') {
    ctx.save(); ctx.globalAlpha = 1 - ease(ramp(u, .04, .64));
    ctx.translate(s * .15 * ramp(u, 0, .65), -s * .18 * ramp(u, 0, .65)); ctx.drawImage(src, 0, 0); ctx.restore();
    plan.threads.forEach((p, i) => {
      const v = ease(ramp(u, p.at, p.at + .23)); if (!v) return;
      const tile = layers.threads[i]; ctx.save(); ctx.globalAlpha = Math.min(1, v * 4);
      ctx.translate(-s * .08 * (1 - v), -s * .22 * (1 - v)); shadow(ctx, s, .26, .6 + (1 - v) * 3);
      ctx.drawImage(tile.c, tile.x, tile.y); ctx.restore();
    }); return;
  }
  if (plan.kind === 'mash') {
    const press = ease(ramp(u, .025, .77));
    ctx.drawImage(src, 0, 0); ctx.save(); ctx.globalAlpha = press; ctx.drawImage(layers.pulp, 0, 0); ctx.restore();
    plan.chunks.forEach((p, i) => {
      const v = ease(ramp(u, p.at, p.at + .22)); if (!v) return;
      const ss = p.s * s, tile = layers.chunks[i];
      ctx.save(); ctx.globalAlpha = v * (p.sunk ? .68 : 1); ctx.translate(lerp((p.sx + p.s / 2) * s, p.x * s, v), lerp((p.sy + p.s / 2) * s, p.y * s, v)); ctx.rotate(p.rot * v); ctx.scale(1, lerp(1, p.squash, v));
      if (!p.sunk) shadow(ctx, s, .19, .7);
      ctx.drawImage(tile, -ss / 2, -ss / 2, ss, ss); ctx.restore();
    });
    ctx.save(); ctx.globalAlpha = press; ctx.globalCompositeOperation = 'source-atop'; ctx.lineCap = 'round';
    plan.streaks.forEach((p) => {
      ctx.strokeStyle = 'rgba(255,239,213,.17)'; ctx.lineWidth = p.w * s; ctx.beginPath(); ctx.moveTo(p.x * s, p.y * s); ctx.quadraticCurveTo((p.x + Math.cos(plan.smear) * p.len * .5) * s, (p.y + Math.sin(plan.smear) * p.len * .5 + .02) * s, (p.x + Math.cos(plan.smear) * p.len) * s, (p.y + Math.sin(plan.smear) * p.len) * s); ctx.stroke();
    }); ctx.restore(); return;
  }
  if (plan.kind === 'flatten') {
    const v = ease(ramp(u, .03, .91));
    ctx.save(); ctx.globalAlpha = 1 - v; ctx.drawImage(src, 0, 0); ctx.restore();
    // Pressed material spreads ahead of the rolling cylinder; it is already texture-smeared.
    ctx.save(); ctx.globalAlpha = Math.min(1, v * 2); ctx.translate(s / 2, s / 2); ctx.scale(lerp(.87, 1, v), lerp(1.3, 1, v)); ctx.drawImage(layers.flat, -s / 2, -s / 2); ctx.restore(); return;
  }
  if (plan.kind === 'marinate') {
    ctx.drawImage(src, 0, 0); ctx.save(); frontPath(ctx, plan, s, u); ctx.clip(); ctx.drawImage(layers.glaze, 0, 0); ctx.restore(); return;
  }
  if (plan.kind === 'season') {
    const v = ease(ramp(u, .02, .88)); const work = layers.work, w = work.getContext('2d'); w.clearRect(0, 0, s, s);
    w.save(); w.globalAlpha = 1 - v; w.drawImage(src, 0, 0); w.globalAlpha = v; w.drawImage(layers.seasoned, 0, 0); w.restore();
    // Source-atop deposits salt on strips, threads and glaze, never in their empty gaps.
    w.save(); w.globalCompositeOperation = 'source-atop'; plan.crystals.forEach((p) => crystal(w, p, s, u)); w.restore(); ctx.drawImage(work, 0, 0); return;
  }
  if (plan.kind === 'dry') {
    const v = ease(ramp(u, .02, .94));
    ctx.save(); ctx.globalAlpha = 1 - v; ctx.drawImage(src, s * .07 * v, s * .075 * v, s * (1 - .14 * v), s * (1 - .15 * v)); ctx.restore();
    ctx.save(); ctx.globalAlpha = v; ctx.drawImage(layers.dry, 0, 0); ctx.restore();
    if (u > .05 && u < .97) {
      ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = Math.sin(ramp(u, .05, .97) * Math.PI) * .09;
      ctx.strokeStyle = '#594122'; ctx.lineWidth = s * .004;
      for (let t = -.9; t < 1.7; t += .045) { ctx.beginPath(); ctx.moveTo(t * s, 0); ctx.lineTo((t + .55) * s, s); ctx.moveTo(t * s, 0); ctx.lineTo((t - .55) * s, s); ctx.stroke(); } ctx.restore();
    } return;
  }
  // Mix: falling pieces followed by a fold around the spoon. Target pieces begin in situ.
  const fold = ease(ramp(u, .35, .96));
  plan.pieces.forEach((p, i) => {
    const fall = ease(ramp(u, p.at, p.at + .38));
    const x0 = p.owner ? p.x + .08 : p.sx + .125;
    const y0 = p.owner ? -.06 - p.sy * .4 : p.sy + .125;
    const v = p.owner ? fall : ease(ramp(u, .18, .9));
    const x = lerp(x0, p.x, v) + Math.sin(fold * Math.PI) * p.fold;
    const y = lerp(y0, p.y, v) - Math.sin(fold * Math.PI) * (.035 + Math.abs(p.fold));
    ctx.save(); ctx.translate(x * s, y * s); ctx.rotate(p.rot * v + Math.sin(fold * Math.PI) * p.fold * 3);
    const sc = lerp(1, p.scale, v); ctx.scale(sc, sc * (1 - Math.sin(fold * Math.PI) * .15)); if (v) shadow(ctx, s, .23, 1 + Math.sin(fold * Math.PI) * 2);
    ctx.drawImage(layers.pieces[i], -s * .125, -s * .125, s * .25, s * .25); ctx.restore();
  });
}

function layersFor(inputs, stats, plan, size) {
  const src = material(inputs[0], stats[0], size); const layers = { src };
  if (plan.kind === 'slice' || plan.kind === 'dice') layers.pieces = plan.pieces.map((p) => texturePiece(src, p.poly));
  if (plan.kind === 'shred') layers.threads = makeThreads(stats[0].coverage < .83 ? packedTexture(src) : src, plan);
  if (plan.kind === 'mash') {
    layers.pulp = makePulp(stats[0].coverage < .83 ? packedTexture(src) : src, plan);
    layers.chunks = plan.chunks.map((p) => {
      const c = canvas(Math.ceil(p.s * size)), ctx = c.getContext('2d'); path(ctx, p.poly, c.width); ctx.clip();
      ctx.drawImage(src, p.sx * size, p.sy * size, p.s * size, p.s * size, 0, 0, c.width, c.height); shade(ctx, c.width, .85); return c;
    });
  }
  if (plan.kind === 'flatten') layers.flat = makeFlat(src, plan);
  if (plan.kind === 'marinate') layers.glaze = makeGlaze(src, stats[0], plan);
  if (plan.kind === 'dry') layers.dry = makeDry(src, stats[0], plan);
  if (plan.kind === 'season') {
    layers.work = canvas(size); layers.seasoned = canvas(size); const ctx = layers.seasoned.getContext('2d');
    ctx.filter = `contrast(1.09) saturate(.97) brightness(${stats[0].luma < 75 ? 1.06 : 1})`;
    ctx.drawImage(src, size * .014, size * .004, size * .972, size * .99);
  }
  if (plan.kind === 'mix') {
    const srcs = [src, material(inputs[1], stats[1], size)];
    layers.pieces = plan.pieces.map((p) => {
      const c = canvas(Math.ceil(size / 4)), ctx = c.getContext('2d');
      ctx.drawImage(srcs[p.owner], p.sx * size, p.sy * size, p.sw * size, p.sh * size, 0, 0, c.width, c.height); shade(ctx, c.width, .45); return c;
    });
  }
  return layers;
}

function transformedPoly(p, plan) {
  return p.poly.map(([x, y]) => {
    const dx = x - p.cx, dy = y - p.cy, c = Math.cos(p.rot), s = Math.sin(p.rot);
    return [clamp(.5 + (p.cx + p.dx + dx * c - dy * s - .5) * plan.scale), clamp(.5 + (p.cy + p.dy + dx * s + dy * c - .5) * plan.scale)];
  });
}
function contoursFor(plan, rng) {
  if (plan.kind === 'slice' || plan.kind === 'dice') return plan.pieces.map((p) => transformedPoly(p, plan));
  if (plan.kind === 'shred') return plan.threads.filter((_, i) => i % 3 === 0).map(threadPoly);
  if (plan.kind === 'mash') return Array.from({ length: 23 }, () => irregular(.13 + rng() * .74, .13 + rng() * .74, .045 + rng() * .065, .04 + rng() * .06, rng));
  if (plan.kind === 'mix') return plan.pieces.map((p) => {
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    return square.map(([x, y]) => [clamp(p.x + ((x - .5) * c - (y - .5) * s) * .25 * p.scale), clamp(p.y + ((x - .5) * s + (y - .5) * c) * .25 * p.scale)]);
  });
  const bounds = plan.kind === 'flatten' ? [.025, .175, .975, .825] : plan.kind === 'dry' ? [.07, .075, .93, .925] : [.01, .01, .99, .99];
  const out = [];
  for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) {
    const x0 = lerp(bounds[0], bounds[2], x / 3), x1 = lerp(bounds[0], bounds[2], (x + 1) / 3);
    const y0 = lerp(bounds[1], bounds[3], y / 2), y1 = lerp(bounds[1], bounds[3], (y + 1) / 2);
    out.push([[x0 + .008, y0 + .009], [(x0 + x1) / 2, y0 + rng() * .02], [x1 - .008, y0 + .006], [x1 - rng() * .012, (y0 + y1) / 2], [x1 - .008, y1 - .009], [(x0 + x1) / 2, y1 - rng() * .02], [x0 + .008, y1 - .01]]);
  }
  return out;
}

function operation(op, inputs, seed) {
  if (!Array.isArray(inputs) || inputs.length !== (op === 'mix' ? 2 : 1) || inputs.some((i) => !i || i.width !== i.height || !i.width)) throw new TypeError('Operations need square input canvases');
  const plan = planOp(op, seed), snapshots = inputs.map(copy), stats = snapshots.map(analyse);
  const caches = new Map();
  const get = (size) => {
    const s = Math.max(1, Math.round(size));
    if (!caches.has(s)) caches.set(s, { layers: layersFor(snapshots, stats, plan, s), final: null });
    return caches.get(s);
  };
  const start = (ctx, size) => {
    ctx.drawImage(snapshots[0], 0, 0, size, size);
    if (op !== 'mix') return;
    const s = Math.max(1, Math.round(size)), layers = get(s).layers;
    plan.pieces.forEach((p, i) => {
      if (!p.owner) return;
      ctx.save(); shadow(ctx, size, .2, 2);
      ctx.drawImage(layers.pieces[i], (p.x + .08 - .125) * size, (-.06 - p.sy * .4 - .125) * size, .25 * size, .25 * size); ctx.restore();
    });
  };
  const result = {
    op, seed, plan,
    render(size) {
      const s = Math.max(1, Math.round(size)), cached = get(s);
      if (!cached.final) { cached.final = canvas(s); paint(cached.final.getContext('2d'), s, 1, plan, cached.layers, stats[0]); }
      return cached.final;
    },
    draw(ctx, size, u) {
      u = clamp(u); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.clip();
      if (u <= 0) start(ctx, size);
      else if (u >= 1) ctx.drawImage(result.render(size), 0, 0, size, size);
      else {
        const s = Math.max(1, Math.round(size)); ctx.scale(size / s, size / s);
        const layers = get(s).layers;
        // The first 4% releases the source from its old outline into the new working mass.
        if (u < .04) {
          const alpha = ctx.globalAlpha; ctx.globalAlpha = alpha * (1 - ease(u / .04)); start(ctx, s);
          ctx.globalAlpha = alpha * ease(u / .04); paint(ctx, s, u, plan, layers, stats[0]);
        } else paint(ctx, s, u, plan, layers, stats[0]);
      }
      ctx.restore();
    },
    tool(ctx, size, u) { if (u <= 0 || u >= 1) return; drawTool(ctx, plan, size, u, stats[0].rgb); },
    contours(rng) { return contoursFor(plan, rng); },
  };
  return result;
}
export function createOp(op, input, seed) {
  if (!OPS[op]) throw new RangeError(`Unknown operation: ${op}`);
  return operation(op, [input], seed);
}
export function createMix(inputs, seed) { return operation('mix', inputs, seed); }

// Top-down utensils. Kept out of the baked result, including the sieve and spoon.
function wood(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#785438'); g.addColorStop(.16, '#b68b55'); g.addColorStop(.38, '#ddbb7b'); g.addColorStop(.72, '#b68c57'); g.addColorStop(1, '#705036'); return g;
}
function knife(ctx, plan, u) {
  const dice = plan.kind === 'dice', cross = dice && u >= .43;
  const t = cross ? ramp(u, .43, .88) : ramp(u, .03, dice ? .43 : .85);
  if (t >= 1) return;
  const raw = t * (plan.n - 1), i = Math.floor(raw), beat = raw - i;
  const lift = beat < .16 ? 1 - beat / .16 : beat < .64 ? 0 : (beat - .64) / .36;
  ctx.translate(.5, .5); ctx.rotate(plan.angle + (cross ? Math.PI / 2 : 0));
  ctx.translate((i + 1) / plan.n - .5 + lift * .015, -.08 + ramp(beat, .16, .64) * .13 - lift * .035);
  shadow(ctx, 1, .35, 1 + lift * 4);
  const steel = ctx.createLinearGradient(-.025, 0, .025, 0);
  [[0, '#f9f7d9'], [.12, '#d2d9d0'], [.36, '#6a8286'], [.48, '#eaf0e4'], [.55, '#fffde9'], [.67, '#6f8383'], [1, '#33464a']].forEach(([t, c]) => steel.addColorStop(t, c));
  ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(-.025, -.34); ctx.quadraticCurveTo(-.025, -.49, .015, -.5); ctx.lineTo(.025, -.46); ctx.lineTo(.025, .37); ctx.lineTo(-.025, .37); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.fillStyle = wood(ctx, -.04, 0, .04, 0); ctx.beginPath(); ctx.roundRect(-.04, .35, .08, .31, .025); ctx.fill();
  for (const y of [.41, .58]) { ctx.fillStyle = '#d6cba8'; ctx.beginPath(); ctx.arc(0, y, .006, 0, TAU); ctx.fill(); }
}
function drawTool(ctx, plan, size, u, rgb) {
  ctx.save(); ctx.scale(size, size); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fade = Math.min(ramp(u, 0, .06), 1 - ramp(u, .91, 1)); ctx.globalAlpha *= fade;
  if (plan.kind === 'slice' || plan.kind === 'dice') knife(ctx, plan, u);
  else if (plan.kind === 'mash') {
    const lift = Math.abs(Math.sin(u * Math.PI * 6)), r = .115 * (1 + lift * .12);
    ctx.translate(.5 + Math.sin(u * 10) * .19, .5 + Math.cos(u * 8) * .18);
    shadow(ctx, 1, .3, 1 + lift * 5); ctx.strokeStyle = wood(ctx, 0, 0, .13, -.18); ctx.lineWidth = .09; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(.15 + lift * .05, -.2 - lift * .1); ctx.stroke();
    ctx.shadowColor = 'transparent'; const g = ctx.createRadialGradient(-r * .3, -r * .4, .01, 0, 0, r); g.addColorStop(0, '#b18b5d'); g.addColorStop(.7, '#805b3d'); g.addColorStop(1, '#4b3626'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,234,194,.27)'; ctx.lineWidth = .003; ctx.beginPath(); ctx.arc(-.004, -.007, r * .78, 3.4, 5.5); ctx.stroke();
    if (lift < .14) { ctx.globalAlpha *= 1 - lift / .14; ctx.strokeStyle = '#e7c99a'; ctx.lineWidth = .004; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 1.15, 0, 0, TAU); ctx.stroke(); }
  } else if (plan.kind === 'shred') {
    ctx.translate(.49 + Math.sin(u * 27) * .06, .25 + Math.cos(u * 27) * .055); ctx.rotate(-.15);
    shadow(ctx, 1, .3, 2); const g = ctx.createLinearGradient(-.15, 0, .15, .04); g.addColorStop(0, '#687e7c'); g.addColorStop(.12, '#edf0dc'); g.addColorStop(.36, '#c4ccc1'); g.addColorStop(.7, '#f4f3df'); g.addColorStop(1, '#71847e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-.17, -.24, .34, .44, .025); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#59674e'; ctx.lineWidth = .025; ctx.beginPath(); ctx.roundRect(-.1, -.35, .2, .11, .04); ctx.stroke();
    for (let y = -.18; y < .15; y += .055) for (let x = -.12; x < .14; x += .06) {
      ctx.fillStyle = '#59675f'; ctx.beginPath(); ctx.ellipse(x, y, .015, .01, -.3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fffce6'; ctx.lineWidth = .004; ctx.beginPath(); ctx.arc(x, y - .002, .016, 3.4, 6); ctx.stroke();
    }
    ctx.strokeStyle = '#8b9b8d'; ctx.lineWidth = .003; ctx.strokeRect(-.155, -.225, .31, .4);
  } else if (plan.kind === 'flatten') {
    const travel = u < .53 ? ramp(u, .03, .53) : 1 - ramp(u, .53, .94);
    ctx.translate(.5, .15 + travel * .68); ctx.rotate(.035 * Math.sin(u * 13)); shadow(ctx, 1, .3, 1.2);
    ctx.fillStyle = wood(ctx, 0, -.05, 0, .05); ctx.beginPath(); ctx.roundRect(-.52, -.025, 1.04, .05, .024); ctx.fill();
    ctx.fillStyle = wood(ctx, 0, -.065, 0, .065); ctx.beginPath(); ctx.roundRect(-.38, -.07, .76, .14, .045); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); ctx.beginPath(); ctx.roundRect(-.38, -.07, .76, .14, .045); ctx.clip();
    for (let i = 0; i < 6; i++) { const y = -.057 + ((i * .023 + travel * .05) % .115); ctx.strokeStyle = 'rgba(110,76,37,.19)'; ctx.lineWidth = .0014; ctx.beginPath(); ctx.moveTo(-.34, y); ctx.bezierCurveTo(-.1, y - .007, .13, y + .01, .34, y - .003); ctx.stroke(); } ctx.restore();
  } else if (plan.kind === 'marinate') {
    ctx.translate(.43, -.035); ctx.rotate(.22); shadow(ctx, 1, .33, 2);
    const g = ctx.createLinearGradient(-.15, -.06, .13, .07); g.addColorStop(0, '#fffbe5'); g.addColorStop(.55, '#cdd0bd'); g.addColorStop(1, '#778879'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, .17, .105, 0, 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = `rgb(${rgb.join(',')})`; ctx.beginPath(); ctx.ellipse(.006, .012, .13, .07, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb.join(',')},.8)`; ctx.lineWidth = .026; ctx.beginPath(); ctx.moveTo(.025, .072); ctx.bezierCurveTo(.04, .15, .03, .24, .06, .28 + ramp(u, .1, .8) * .2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,242,206,.34)'; ctx.lineWidth = .005; ctx.stroke();
  } else if (plan.kind === 'season') {
    ctx.translate(.3 + u * .43 + Math.sin(u * 48) * .018, -.015 + Math.cos(u * 48) * .014); ctx.rotate(-.5 + Math.sin(u * 48) * .08); shadow(ctx, 1, .25, 3);
    const g = ctx.createLinearGradient(-.065, 0, .065, 0); g.addColorStop(0, '#aaa78c'); g.addColorStop(.3, '#f9f3da'); g.addColorStop(.7, '#e3d8b6'); g.addColorStop(1, '#aaa68a'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-.067, -.17, .134, .19, .025); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#a79e7c'; ctx.lineWidth = .002; ctx.stroke(); ctx.fillStyle = '#8b9786'; ctx.beginPath(); ctx.ellipse(0, .02, .07, .035, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#d8ddc5'; ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = i / 6 * TAU; ctx.fillStyle = '#3d4b40'; ctx.beginPath(); ctx.arc(Math.cos(a) * .037, .02 + Math.sin(a) * .016, .0045, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#a59b7d'; ctx.font = '.024px serif'; ctx.textAlign = 'center'; ctx.fillText('盐', 0, -.06);
  } else if (plan.kind === 'dry') {
    ctx.translate(.5, .5); ctx.save(); ctx.globalAlpha *= .34; ctx.strokeStyle = '#b39258'; ctx.lineWidth = .006;
    // The sieve surrounds the food; only a light lattice shadow crosses its face in draw().
    ctx.beginPath(); ctx.arc(0, 0, .485, 0, TAU); ctx.clip();
    for (let i = -.7; i <= .7; i += .045) { ctx.beginPath(); ctx.moveTo(i, -.55); ctx.lineTo(i + .58, .55); ctx.moveTo(i, -.55); ctx.lineTo(i - .58, .55); ctx.stroke(); } ctx.restore();
    shadow(ctx, 1, .17, 1); ctx.strokeStyle = '#a67d42'; ctx.lineWidth = .02; ctx.beginPath(); ctx.arc(0, 0, .485, 0, TAU); ctx.stroke(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#e5c789'; ctx.lineWidth = .006; ctx.beginPath(); ctx.arc(-.002, -.003, .482, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#80633c'; ctx.lineWidth = .002;
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * .477, Math.sin(a) * .477); ctx.lineTo(Math.cos(a + .009) * .495, Math.sin(a + .009) * .495); ctx.stroke(); }
    ctx.globalAlpha *= .32 + Math.sin(u * Math.PI) * .2; ctx.strokeStyle = '#fff2bd'; ctx.lineWidth = .009;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-.52 + i * .085, -.52); ctx.lineTo(-.39 + i * .085, -.35); ctx.stroke(); }
  } else if (plan.kind === 'mix') {
    const a = ramp(u, .24, .94) * TAU * 1.12; ctx.translate(.5 + Math.sin(a) * .25, .5 + Math.cos(a) * .2); ctx.rotate(-.6 + Math.sin(a) * .45);
    shadow(ctx, 1, .3, 2); ctx.fillStyle = wood(ctx, -.07, 0, .07, 0); ctx.beginPath(); ctx.ellipse(0, 0, .085, .13, -.08, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8c653f'; ctx.lineWidth = .046; ctx.beginPath(); ctx.moveTo(.01, -.095); ctx.lineTo(.05, -.48); ctx.stroke(); ctx.shadowColor = 'transparent';
    const g = ctx.createRadialGradient(-.01, -.015, .01, 0, 0, .12); g.addColorStop(0, '#7c5836'); g.addColorStop(.7, '#ad824e'); g.addColorStop(1, '#dcc08a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -.003, .067, .106, -.08, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,232,179,.4)'; ctx.lineWidth = .003; ctx.beginPath(); ctx.ellipse(0, 0, .076, .12, -.08, 2.9, 5.2); ctx.stroke();
  }
  ctx.restore();
}

// The pieces a picture is in after `op` (unit coords of its square picture), for putting it in the pot.
// Pure: depends only on (op, seed) and rng. Flattened and dried pictures stay one torn sheet.
export function opContours(op, seed, rng) {
  const plan = planOp(op, seed);
  if (plan.kind === 'flatten' || plan.kind === 'dry') return [plan.poly];
  return contoursFor(plan, rng);
}
