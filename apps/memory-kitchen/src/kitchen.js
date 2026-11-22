// Kitchen work on ingredients, in the browser. An operation (src/ops.js) reads the ingredient's
// current picture and its result is baked into the ingredient: the result becomes the picture.
// That makes operations ordered and irreversible — slicing then mashing is not mashing then slicing.
// Two ingredients can be mixed into one. The picture before the last operation is kept so the
// operation can be replayed (on the card right after it is applied, and on the cooking stage).
import { createOp, createMix, opContours, OP_PLAY_MS } from './ops.js';
import { loadImage } from './localCook.js';
import { dominantColors } from './color.js';
import { hashString, makeRng } from './recipe.js';

export const BAKE_SIZE = 768;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// A square canvas of the picture, cropped like object-fit: cover.
export function squareOf(img, size = BAKE_SIZE) {
  const c = makeCanvas(size, size);
  const iw = img.naturalWidth || img.width; const ih = img.naturalHeight || img.height;
  const k = Math.max(size / iw, size / ih);
  c.getContext('2d').drawImage(img, (size - iw * k) / 2, (size - ih * k) / 2, iw * k, ih * k);
  return c;
}

// Keep the alpha: the gaps between slices, cubes and threads are real gaps (the paper shows through).
// WebP where the browser can encode it, PNG otherwise (Safari).
const toUrl = (canvas) => {
  const webp = canvas.toDataURL('image/webp', 0.9);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
};
const freshSeed = (key) => hashString(`${key}|${Date.now()}|${Math.random()}`);

// Apply one operation to an ingredient. Returns the patch to store and the live operation to play.
export async function applyOperation(ingredient, op) {
  const input = squareOf(await loadImage(ingredient.src));
  const seed = freshSeed(`${ingredient.id}|${(ingredient.steps || []).length}|${op}`);
  const live = createOp(op, input, seed);
  const result = live.render(BAKE_SIZE);
  return {
    live,
    patch: {
      src: toUrl(result), prev: toUrl(input), prevB: null,
      last: { op, seed }, steps: [...(ingredient.steps || []), op],
      // Cutting, mashing, rolling and drying change what pieces it is in; marinating and salting do not.
      shape: SHAPING.has(op) ? { op, seed } : shapeKey(ingredient),
      colors: dominantColors(result), width: BAKE_SIZE, height: BAKE_SIZE,
    },
  };
}

// Mix `dropped` into `target`: one new ingredient made of both. Returns its data and the live mix.
export async function mixIngredients(target, dropped) {
  const [a, b] = await Promise.all([target, dropped].map(async (it) => squareOf(await loadImage(it.src))));
  const seed = freshSeed(`${target.id}+${dropped.id}`);
  const live = createMix([a, b], seed);
  const result = live.render(BAKE_SIZE);
  return {
    live,
    data: {
      name: `${target.name}拌${dropped.name}`.slice(0, 24),
      flavor: [target.flavor, dropped.flavor].filter(Boolean).join('、').slice(0, 12),
      src: toUrl(result), prev: toUrl(a), prevB: toUrl(b),
      last: { op: 'mix', seed }, steps: ['mix'], shape: { op: 'mix', seed },
      parts: [describeIngredient(target), describeIngredient(dropped)],
      amount: Math.min(3, Math.max(target.amount || 2, dropped.amount || 2)),
      colors: dominantColors(result), width: BAKE_SIZE, height: BAKE_SIZE, origin: 'mix',
    },
  };
}

const SHAPING = new Set(['slice', 'dice', 'shred', 'mash', 'flatten', 'dry']);
// The shape-giving operation; older stored ingredients only have their last operation.
function shapeKey(it) {
  if (it.shape) return it.shape;
  if (it.last && (SHAPING.has(it.last.op) || it.last.op === 'mix')) return it.last;
  return null;
}

// The pieces an ingredient goes into the pot as, in unit coords of its square picture:
// strips, cubes, threads, clumps, one torn sheet, a heap of fragments — or the whole picture.
export function shapeOf(it) {
  const key = shapeKey(it);
  if (!key) return { kind: 'whole', polys: [[[0, 0], [1, 0], [1, 1], [0, 1]]] };
  const polys = opContours(key.op, key.seed, makeRng(hashString(`${it.id}|${key.seed}|pot`))).filter((p) => p?.length >= 3);
  return { kind: key.op, polys };
}

// A short record of what went into a mix, so the recipe can still say it.
export function describeIngredient(it) {
  return { name: it.name, steps: it.steps || [], parts: it.parts || [] };
}

// Rebuild the last operation of an ingredient from the stored picture before it (for replays).
export async function replayOf(ingredient) {
  const last = ingredient?.last;
  if (!last || !ingredient.prev) return null;
  try {
    const a = squareOf(await loadImage(ingredient.prev));
    if (last.op === 'mix') {
      if (!ingredient.prevB) return null;
      const b = squareOf(await loadImage(ingredient.prevB));
      return createMix([a, b], last.seed);
    }
    return createOp(last.op, a, last.seed);
  } catch {
    return null;
  }
}

// Operations playing right now, shared by the board cards and the pot so both show the same work.
const live = new Map(); // ingredient id → { op, start }
const listeners = new Set();
export function playOperation(id, op, { reduced = false } = {}) {
  live.set(id, { op, start: reduced ? -Infinity : performance.now() });
  listeners.forEach((fn) => fn(id));
}
export function liveOperation(id, now = performance.now()) {
  const e = live.get(id);
  if (!e) return null;
  const u = Math.max(0, Math.min(1, (now - e.start) / OP_PLAY_MS));
  if (u >= 1) { live.delete(id); return null; }
  return { op: e.op, u };
}
export function onPlay(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export { OP_PLAY_MS };
