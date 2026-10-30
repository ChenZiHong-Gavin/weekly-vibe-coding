// DDIM sampler with classifier-free guidance for the text2cat ONNX model.
// Mirrors catdiff/train_text.py: ddim_text (eta=0), x0 clamped to [-1,1] and eps re-derived from the clamped x0.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(n, rand) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    const u = Math.max(rand(), 1e-12), v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    out[i] = r * Math.cos(2 * Math.PI * v);
    if (i + 1 < n) out[i + 1] = r * Math.sin(2 * Math.PI * v);
  }
  return out;
}

// Same tokenisation as catdiff/text.py tokenize(): lower case, commas split off, unknown words dropped.
export function tokenize(text, meta) {
  const index = meta.vocabIndex || (meta.vocabIndex = new Map(meta.vocab.map((w, i) => [w, i])));
  const words = text.toLowerCase().replace(/[.!?;:]/g, " ").replace(/,/g, " , ").split(/\s+/).filter(Boolean);
  const known = [], unknown = [];
  for (const w of words) (index.has(w) ? known : unknown).push(w);
  const ids = known.slice(0, meta.max_len).map((w) => index.get(w));
  while (ids.length < meta.max_len) ids.push(meta.pad);
  return { ids, known, unknown };
}

function timesteps(T, steps) {
  // torch.linspace(T-1, 0, steps).long()
  const ts = [];
  for (let i = 0; i < steps; i++) ts.push(Math.trunc((T - 1) * (1 - (steps === 1 ? 0 : i / (steps - 1)))));
  return ts;
}

/**
 * session: ort.InferenceSession, meta: meta.json, ids: number[] (one prompt), opts: {n, steps, w, seed, onStep}
 * onStep(i, steps, x0) is called after every step with the current x0 prediction (Float32Array n*3*32*32).
 * Returns the final images as Float32Array n*3*32*32 in [-1, 1].
 */
export async function sample(ort, session, meta, ids, opts) {
  const { n, steps, w, seed, onStep } = opts;
  const S = meta.size, P = 3 * S * S, ac = meta.alphas_cumprod;
  const guided = w !== 1;
  const B = guided ? 2 * n : n;
  const rand = mulberry32(seed);
  let x = gaussian(n * P, rand);
  const idsArr = new BigInt64Array(B * meta.max_len);
  for (let b = 0; b < B; b++) {
    const src = b < n ? ids : meta.null_ids;
    for (let k = 0; k < meta.max_len; k++) idsArr[b * meta.max_len + k] = BigInt(src[k]);
  }
  const idsT = new ort.Tensor("int64", idsArr, [B, meta.max_len]);
  const ts = timesteps(ac.length, steps);
  const x0 = new Float32Array(n * P);
  for (let i = 0; i < steps; i++) {
    const t = ts[i], a = ac[t], aPrev = i + 1 < steps ? ac[ts[i + 1]] : 1.0;
    const xin = new Float32Array(B * P);
    xin.set(x, 0);
    if (guided) xin.set(x, n * P);
    const tArr = new BigInt64Array(B).fill(BigInt(t));
    const out = await session.run({ x: new ort.Tensor("float32", xin, [B, 3, S, S]), t: new ort.Tensor("int64", tArr, [B]), ids: idsT });
    const e = out.eps.data;
    const sa = Math.sqrt(a), s1a = Math.sqrt(1 - a), sp = Math.sqrt(aPrev), s1p = Math.sqrt(1 - aPrev);
    const next = new Float32Array(n * P);
    for (let j = 0; j < n * P; j++) {
      const eps = guided ? e[n * P + j] + w * (e[j] - e[n * P + j]) : e[j];
      let p0 = (x[j] - s1a * eps) / sa;
      p0 = p0 < -1 ? -1 : p0 > 1 ? 1 : p0;
      const eps2 = (x[j] - sa * p0) / s1a;
      next[j] = sp * p0 + s1p * eps2;
      x0[j] = p0;
    }
    x = next;
    if (onStep) await onStep(i, steps, x0);
  }
  return x0;
}

// Draw image k of a batch (Float32Array n*3*S*S in [-1,1]) into an ImageData-like RGBA buffer, cropped to the 24x24 sprite.
export function toRGBA(batch, k, S, crop) {
  const P = 3 * S * S, off = (S - crop) >> 1, rgba = new Uint8ClampedArray(crop * crop * 4);
  for (let y = 0; y < crop; y++) for (let xx = 0; xx < crop; xx++) {
    const src = (y + off) * S + (xx + off), dst = (y * crop + xx) * 4;
    for (let c = 0; c < 3; c++) rgba[dst + c] = Math.round((batch[k * P + c * S * S + src] + 1) * 127.5);
    rgba[dst + 3] = 255;
  }
  return rgba;
}
