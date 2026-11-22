// Dominant colors from an image element via a coarse histogram. Browser only.
export function dominantColors(img, count = 4) {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // gaps between cut pieces are not a colour of the picture
    const r = data[i] >> 5;
    const g = data[i + 1] >> 5;
    const b = data[i + 2] >> 5;
    const key = (r << 6) | (g << 3) | b;
    const bin = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += data[i];
    bin.g += data[i + 1];
    bin.b += data[i + 2];
    bins.set(key, bin);
  }
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bin) => toHex(bin.r / bin.n, bin.g / bin.n, bin.b / bin.n));
}

export function toHex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return { r: 128, g: 128, b: 128 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
