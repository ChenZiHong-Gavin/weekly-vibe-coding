// Local "stove": composites ingredient photos on a canvas without any network.
// A cook is planned once (deterministic from the seed, unit coordinates) and can then be
// rendered at any size and any progress u in 0..1, so the stage can show the real algorithm
// advancing frame by frame and the final dish is simply u = 1 at full resolution.
import { makeRng } from './recipe.js';
import { weightedSeeds, voronoiOwners, shardQuads, centroid, scatterCards } from './geometry.js';

export const OUT = 1024;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ramp = (x, a, b) => clamp01((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片无法读取'));
    img.src = src;
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('cooking cancelled', 'AbortError');
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function drawCover(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale; const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// Cheap blur without ctx.filter (Safari): downscale then upscale with smoothing.
export function blurCanvas(canvas, radiusPx) {
  if (radiusPx < 1) return;
  const factor = Math.max(2, Math.round(radiusPx / 2));
  const small = makeCanvas(Math.max(2, Math.floor(canvas.width / factor)), Math.max(2, Math.floor(canvas.height / factor)));
  const sctx = small.getContext('2d');
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'copy';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function blurredCopy(canvas, radiusPx) {
  const c = makeCanvas(canvas.width, canvas.height);
  c.getContext('2d').drawImage(canvas, 0, 0);
  blurCanvas(c, radiusPx);
  return c;
}

function fillOp(ctx, op, style, alpha = 1, size = ctx.canvas.width) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}

function selfBlend(ctx, op, alpha) {
  if (alpha <= 0) return;
  const size = ctx.canvas.width;
  const copy = makeCanvas(size, size);
  copy.getContext('2d').drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(copy, 0, 0);
  ctx.restore();
}

// ---------- Plan: everything random, in unit coordinates, decided once per cook ----------
export function planCook(rows, recipe, seed) {
  const rng = makeRng(seed);
  // Longer in the pot, further it spreads into the dish.
  const weights = rows.map((r) => r.amount * (1 + 0.35 * (r.potSteps?.length || 0)));
  const plan = { method: recipe.method, heat: recipe.heat, weights };
  const total = weights.reduce((a, b) => a + b, 0);
  if (recipe.method === 'stew' || recipe.method === 'roast') {
    plan.seeds = weightedSeeds(weights, rng, 2);
    plan.grillAngle = -0.6 + rng() * 0.3;
  }
  if (recipe.method === 'stirfry') {
    const shards = [];
    rows.forEach((row, idx) => {
      const grid = row.amount >= 3 ? 4 : 3;
      shardQuads(grid, grid, 0.6, rng).forEach((quad) => shards.push({ idx, quad }));
    });
    for (let i = shards.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [shards[i], shards[j]] = [shards[j], shards[i]]; }
    const dir = rng() * Math.PI;
    plan.dir = [Math.cos(dir), Math.sin(dir) * 0.5];
    plan.shards = shards.map((s) => {
      const share = weights[s.idx] / total;
      return {
        ...s,
        scale: (1.05 + share * 0.5) * (0.85 + rng() * 0.3),
        x: 0.15 + rng() * 0.7, y: 0.15 + rng() * 0.7,
        rot: (rng() - 0.5) * (0.35 + recipe.heat * 0.25),
        order: rng(),
      };
    });
    plan.sparkles = Array.from({ length: 40 + recipe.heat * 30 }, () => ({ x: rng(), y: rng(), r: 1 + rng() * 3, a: 0.3 + rng() * 0.5 }));
  }
  if (recipe.method === 'steam') {
    plan.layers = rows.map((_, i) => ({ scale: 1 + i * 0.03 + rng() * 0.03, dx: (rng() - 0.5) * 0.08, dy: (rng() - 0.5) * 0.08 }));
    plan.drops = Array.from({ length: 22 + recipe.heat * 12 }, () => ({ x: rng(), y: rng(), r: (3 + rng() * 9) / OUT, order: rng() }));
  }
  if (recipe.method === 'raw') {
    plan.cards = scatterCards(rows.length, rng, 0.5 + recipe.heat * 0.3);
  }
  plan.grainSeed = Math.floor(rng() * 1e9);
  return plan;
}

// ---------- Tiles: one square canvas per ingredient at a given size ----------
// The ingredient's picture already carries every operation done to it (see kitchen.js).
// Gaps between cut pieces are transparent in the picture; in the pot they fill with dark juice.
export function prepareTile(img, size) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2b2119'; ctx.fillRect(0, 0, size, size);
  drawCover(ctx, img, 0, 0, size, size);
  return c;
}

// What the pot did to one ingredient, in order, on its tile. Something that went in earlier went
// through more steps, so it comes out softer / browner / glossier than something added late.
export function potTreat(tile, potSteps = []) {
  if (!potSteps.length) return tile;
  const size = tile.width;
  const c = makeCanvas(size, size); const ctx = c.getContext('2d');
  ctx.drawImage(tile, 0, 0);
  const k = size / OUT;
  potSteps.forEach(({ op, heat = 2 }) => {
    const h = heat / 2;
    if (op === 'sear') {
      // browned edges, a crisper picture
      selfBlend(ctx, 'overlay', 0.18 * h);
      const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size * 0.72);
      g.addColorStop(0, 'rgba(120,60,20,0)'); g.addColorStop(1, `rgba(92,44,14,${0.55 * h})`);
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); ctx.restore();
    } else if (op === 'stirfry') {
      fillOp(ctx, 'saturation', 'rgba(255,120,40,1)', 0.12 * h);
      selfBlend(ctx, 'overlay', 0.12 * h);
      fillOp(ctx, 'soft-light', 'rgba(214,150,80,1)', 0.25 * h);
    } else if (op === 'stew') {
      const soft = blurredCopy(c, (3 + heat * 3) * k);
      ctx.save(); ctx.globalAlpha = 0.75; ctx.drawImage(soft, 0, 0); ctx.restore();
      fillOp(ctx, 'soft-light', 'rgba(196,140,70,1)', 0.5 * h);
      fillOp(ctx, 'multiply', 'rgba(222,176,120,1)', 0.3 * h);
      fillOp(ctx, 'saturation', 'rgba(128,128,128,1)', 0.15);
    } else if (op === 'steam') {
      const soft = blurredCopy(c, (2 + heat * 2) * k);
      ctx.save(); ctx.globalAlpha = 0.55; ctx.drawImage(soft, 0, 0); ctx.restore();
      fillOp(ctx, 'screen', 'rgba(236,232,224,1)', 0.16 * h);
    } else if (op === 'reduce') {
      fillOp(ctx, 'multiply', 'rgba(170,96,40,1)', 0.45 * h);
      selfBlend(ctx, 'overlay', 0.2 * h);
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0.3, 'rgba(255,240,200,0)'); g.addColorStop(0.42, `rgba(255,240,200,${0.18 * h})`); g.addColorStop(0.5, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    }
  });
  return c;
}

// ---------- Renderer: a plan + tiles at one size, drawable at any progress u ----------
export function createRenderer({ plan, tiles, size }) {
  const k = size / OUT;
  const n = tiles.length;
  const cache = {};

  function regionMasks(featherPx) {
    const key = `m${Math.round(featherPx)}`;
    if (cache[key]) return cache[key];
    const G = 96;
    const owners = voronoiOwners(G, G, plan.seeds);
    cache[key] = tiles.map((_, idx) => {
      const small = makeCanvas(G, G);
      const sctx = small.getContext('2d');
      const data = sctx.createImageData(G, G);
      for (let i = 0; i < owners.length; i += 1) {
        data.data[i * 4] = 255; data.data[i * 4 + 1] = 255; data.data[i * 4 + 2] = 255; data.data[i * 4 + 3] = owners[i] === idx ? 255 : 0;
      }
      sctx.putImageData(data, 0, 0);
      const mask = makeCanvas(size, size);
      const mctx = mask.getContext('2d');
      mctx.imageSmoothingEnabled = featherPx > 0;
      mctx.drawImage(small, 0, 0, size, size);
      if (featherPx > 12) blurCanvas(mask, featherPx);
      return mask;
    });
    return cache[key];
  }

  function masked(tile, mask) {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    ctx.drawImage(tile, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    return c;
  }

  function blurred(idx, radius) {
    const key = `b${idx}-${Math.round(radius)}`;
    if (!cache[key]) cache[key] = blurredCopy(tiles[idx], radius);
    return cache[key];
  }

  const painters = {
    // 炖: the feather widens and colours bleed as u grows.
    stew(ctx, u) {
      const featherFinal = (70 + plan.heat * 60) * k;
      const feather = lerp(4, featherFinal, easeOut(u));
      const level = feather < featherFinal * 0.35 ? 0.3 : feather < featherFinal * 0.7 ? 0.65 : 1; // three cached levels
      const masks = regionMasks(featherFinal * level);
      ctx.drawImage(tiles[0], 0, 0);
      for (let i = 0; i < n; i += 1) ctx.drawImage(masked(tiles[i], masks[i]), 0, 0);
      const bleed = ramp(u, 0.35, 1);
      if (bleed > 0) {
        const wide = regionMasks(featherFinal * 1.5);
        for (let i = 0; i < n; i += 1) {
          ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.5 * bleed;
          ctx.drawImage(masked(tiles[i], wide[i]), 0, 0); ctx.restore();
        }
      }
      fillOp(ctx, 'soft-light', 'rgba(214,150,80,1)', (0.3 + plan.heat * 0.08) * u);
      fillOp(ctx, 'multiply', 'rgba(255,236,210,1)', 0.35 * u);
    },

    // 炒: shards fly in one by one from their own photo, streaks and colour build up.
    stirfry(ctx, u) {
      tiles.forEach((t, i) => { ctx.globalAlpha = i === 0 ? 1 : 0.5; ctx.drawImage(blurred(i, 120 * k), 0, 0); });
      ctx.globalAlpha = 1;
      fillOp(ctx, 'multiply', 'rgba(120,85,60,1)', 0.45);
      const streak = (6 + plan.heat * 9) * k;
      const N = plan.shards.length;
      plan.shards.forEach((s, order) => {
        const arrive = ramp(u, order / N * 0.8, order / N * 0.8 + 0.2);
        if (arrive <= 0) return;
        const e = easeOut(arrive);
        const [cx, cy] = centroid(s.quad);
        // Starts where it was cut from (its own photo spread across the frame), lands on its spot.
        const ox = (s.idx + 0.5) / n; const oy = cy;
        const x = lerp(ox, s.x, e) * size; const y = lerp(oy, s.y, e) * size;
        const rot = lerp(0, s.rot, e); const scale = lerp(0.6, s.scale, e);
        const copies = arrive < 1 ? 3 : 3;
        for (let c = copies - 1; c >= 0; c -= 1) {
          ctx.save();
          ctx.translate(x + plan.dir[0] * streak * c, y + plan.dir[1] * streak * c);
          ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-cx * size, -cy * size);
          ctx.beginPath();
          s.quad.forEach(([px, py], i) => (i ? ctx.lineTo(px * size, py * size) : ctx.moveTo(px * size, py * size)));
          ctx.closePath();
          if (c === 0) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30 * k; ctx.shadowOffsetY = 12 * k; ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowColor = 'transparent'; }
          ctx.clip();
          ctx.globalAlpha = c === 0 ? 1 : 0.22 * ramp(u, 0.5, 1);
          ctx.drawImage(tiles[s.idx], 0, 0);
          ctx.restore();
        }
      });
      const grade = ramp(u, 0.4, 1);
      fillOp(ctx, 'saturation', 'rgba(255,120,40,1)', (0.12 + plan.heat * 0.05) * grade);
      selfBlend(ctx, 'overlay', (0.22 + plan.heat * 0.08) * grade);
      fillOp(ctx, 'soft-light', 'rgba(255,170,90,1)', 0.25 * grade);
      const sparkN = Math.floor(plan.sparkles.length * ramp(u, 0.5, 1));
      for (let i = 0; i < sparkN; i += 1) {
        const sp = plan.sparkles[i];
        ctx.fillStyle = `rgba(255,240,210,${sp.a})`;
        ctx.beginPath(); ctx.arc(sp.x * size, sp.y * size, sp.r * k, 0, Math.PI * 2); ctx.fill();
      }
    },

    // 蒸: layers fade onto each other, then mist thickens and droplets condense.
    steam(ctx, u) {
      let acc = 0;
      for (let i = 0; i < n; i += 1) {
        acc += plan.weights[i];
        const finalAlpha = i === 0 ? 1 : plan.weights[i] / acc;
        const alpha = i === 0 ? 1 : finalAlpha * ramp(u, i / n * 0.5, i / n * 0.5 + 0.25);
        if (alpha <= 0) continue;
        const L = plan.layers[i];
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(size / 2 + L.dx * size, size / 2 + L.dy * size);
        ctx.scale(L.scale, L.scale);
        ctx.drawImage(blurred(i, (2 + plan.heat * 2) * k), -size / 2, -size / 2);
        ctx.restore();
      }
      const ghost = ramp(u, 0.3, 0.7);
      if (ghost > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.25 * ghost;
        ctx.drawImage(tiles[n - 1], size * 0.02, -size * 0.015); ctx.restore();
      }
      const mistU = ramp(u, 0.3, 1);
      fillOp(ctx, 'source-over', 'rgba(242,238,230,1)', (0.12 + plan.heat * 0.08) * mistU);
      const mist = ctx.createLinearGradient(0, 0, 0, size);
      mist.addColorStop(0, `rgba(245,242,236,${(0.35 + plan.heat * 0.15) * mistU})`);
      mist.addColorStop(0.5, `rgba(245,242,236,${0.05 * mistU})`);
      mist.addColorStop(1, `rgba(235,232,226,${(0.2 + plan.heat * 0.08) * mistU})`);
      fillOp(ctx, 'source-over', mist);
      plan.drops.forEach((d) => {
        if (d.order > ramp(u, 0.55, 1)) return;
        const x = d.x * size; const y = d.y * size; const r = d.r * size;
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(tiles[0], x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.restore();
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
      });
    },

    // 烤: patches are there from the start; charring, grill marks and the warm grade deepen with u.
    roast(ctx, u) {
      const masks = regionMasks(6 * k);
      ctx.drawImage(tiles[0], 0, 0);
      for (let i = 0; i < n; i += 1) ctx.drawImage(masked(tiles[i], masks[i]), 0, 0);
      const charU = ramp(u, 0.05, 0.8);
      if (charU > 0) {
        const key = 'char';
        if (!cache[key]) {
          const edge = makeCanvas(size, size);
          const ectx = edge.getContext('2d');
          for (let i = 0; i < n; i += 1) {
            const band = makeCanvas(size, size);
            const bctx = band.getContext('2d');
            bctx.drawImage(blurredCopy(masks[i], (40 + plan.heat * 25) * k), 0, 0);
            bctx.globalCompositeOperation = 'destination-out';
            bctx.drawImage(blurredCopy(masks[i], 6 * k), 0, 0);
            bctx.globalCompositeOperation = 'source-in';
            bctx.fillStyle = '#2a1408';
            bctx.fillRect(0, 0, size, size);
            ectx.drawImage(band, 0, 0);
          }
          cache[key] = edge;
        }
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = (0.5 + plan.heat * 0.15) * charU;
        ctx.drawImage(cache[key], 0, 0); ctx.restore();
      }
      const marks = ramp(u, 0.3, 0.9);
      if (marks > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = (0.18 + plan.heat * 0.12) * marks;
        ctx.translate(size / 2, size / 2);
        ctx.rotate(plan.grillAngle);
        ctx.fillStyle = '#3a1a0a';
        for (let x = -size; x < size; x += 150 * k) ctx.fillRect(x, -size, (26 + plan.heat * 6) * k, size * 2);
        ctx.restore();
      }
      const grade = ramp(u, 0.2, 1);
      fillOp(ctx, 'multiply', 'rgba(214,137,63,1)', (0.3 + plan.heat * 0.1) * grade);
      fillOp(ctx, 'overlay', 'rgba(110,50,15,1)', (0.25 + plan.heat * 0.1) * grade);
      selfBlend(ctx, 'overlay', 0.35 * grade);
      const glow = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.1, size * 0.5, size * 0.5, size * 0.75);
      glow.addColorStop(0, `rgba(255,190,110,${0.35 * grade})`);
      glow.addColorStop(1, `rgba(40,15,5,${0.65 * grade})`);
      fillOp(ctx, 'soft-light', glow);
    },

    // 生拌: cards slide onto the linen one after another.
    raw(ctx, u) {
      ctx.fillStyle = '#efe8da';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(120,100,70,0.06)';
      for (let y = 0; y < size; y += 6 * k) ctx.fillRect(0, y, size, 2 * k);
      for (let x = 0; x < size; x += 6 * k) ctx.fillRect(x, 0, 2 * k, size);
      plan.cards.forEach((c, i) => {
        const arrive = ramp(u, i / n * 0.7, i / n * 0.7 + 0.3);
        if (arrive <= 0) return;
        const e = easeOut(arrive);
        const card = size * c.w * (0.9 + plan.weights[i] * 0.06);
        ctx.save();
        ctx.translate(c.x * size, lerp(-0.6, c.y, e) * size);
        ctx.rotate(c.rot * plan.heat * 0.6 * e);
        ctx.shadowColor = 'rgba(40,25,10,0.35)'; ctx.shadowBlur = 36 * k; ctx.shadowOffsetY = 14 * k;
        ctx.fillStyle = '#fbf8f1';
        ctx.fillRect(-card / 2 - 18 * k, -card / 2 - 18 * k, card + 36 * k, card + 36 * k + 40 * k);
        ctx.shadowColor = 'transparent';
        ctx.drawImage(tiles[i], -card / 2, -card / 2, card, card);
        ctx.restore();
      });
    },
  };

  function finish(ctx, u) {
    const strength = { stew: 0.25, stirfry: 0.3, steam: 0.08, roast: 0.4, raw: 0.06 }[plan.method] ?? 0.2;
    const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.4, size / 2, size / 2, size * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(20,10,0,${strength * u})`);
    fillOp(ctx, 'source-over', v);
  }

  function grain(ctx) {
    const amp = { roast: 22, stirfry: 12, stew: 10, steam: 6, raw: 4 }[plan.method] ?? 8;
    const rng = makeRng(plan.grainSeed);
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 8) {
      const nz = (rng() - 0.5) * amp;
      d[i] += nz; d[i + 1] += nz; d[i + 2] += nz;
    }
    ctx.putImageData(img, 0, 0);
  }

  return {
    size,
    draw(ctx, u, { withGrain = false } = {}) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, size, size);
      (painters[plan.method] || painters.stew)(ctx, clamp01(u));
      finish(ctx, clamp01(u));
      ctx.restore();
      if (withGrain) grain(ctx);
    },
  };
}

// Load photos, plan the cook and build tiles for the final size and a preview size.
export async function prepareCook({ rows, recipe, seed, previewSize = 640, signal }) {
  const images = await Promise.all(rows.map((r) => loadImage(r.ingredient.src)));
  throwIfAborted(signal);
  const plan = planCook(rows, recipe, seed);
  const full = images.map((img, i) => potTreat(prepareTile(img, OUT), rows[i].potSteps));
  const small = images.map((img, i) => potTreat(prepareTile(img, previewSize), rows[i].potSteps));
  return {
    plan, images,
    tiles: full, previewTiles: small,
    renderer: createRenderer({ plan, tiles: full, size: OUT }),
    preview: createRenderer({ plan, tiles: small, size: previewSize }),
  };
}

export async function renderDish(cookPrep, signal) {
  const canvas = makeCanvas(OUT, OUT);
  cookPrep.renderer.draw(canvas.getContext('2d'), 1, { withGrain: true });
  throwIfAborted(signal);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  throwIfAborted(signal);
  return { blob, canvas, width: OUT, height: OUT };
}

// Convenience used by tests and by callers that just want the picture.
export async function cookLocally({ rows, recipe, seed, onProgress, signal }) {
  const prep = await prepareCook({ rows, recipe, seed, signal });
  onProgress?.(0.5);
  const dish = await renderDish(prep, signal);
  onProgress?.(1);
  return { ...dish, tiles: prep.tiles, prep };
}
