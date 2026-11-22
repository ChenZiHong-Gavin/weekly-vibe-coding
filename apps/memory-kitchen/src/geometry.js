// Pure geometry helpers for the local stove. No DOM, so they are unit-testable.

// Spread seeds across the canvas, each ingredient getting a number of seeds proportional
// to its amount. Returns [{ owner, x, y }] with coordinates in 0..1.
export function weightedSeeds(weights, rng, perUnit = 2) {
  const seeds = [];
  weights.forEach((w, owner) => {
    const n = Math.max(1, Math.round(w * perUnit));
    for (let i = 0; i < n; i += 1) seeds.push({ owner, x: 0.08 + rng() * 0.84, y: 0.08 + rng() * 0.84 });
  });
  // Nudge seeds apart so two ingredients never share the exact same spot.
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < seeds.length; i += 1) {
      for (let j = i + 1; j < seeds.length; j += 1) {
        const dx = seeds[j].x - seeds[i].x; const dy = seeds[j].y - seeds[i].y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < 0.18) {
          const push = (0.18 - d) / 2;
          seeds[i].x -= (dx / d) * push; seeds[i].y -= (dy / d) * push;
          seeds[j].x += (dx / d) * push; seeds[j].y += (dy / d) * push;
        }
      }
    }
  }
  return seeds.map((s) => ({ ...s, x: Math.min(0.95, Math.max(0.05, s.x)), y: Math.min(0.95, Math.max(0.05, s.y)) }));
}

// Nearest-seed owner for every cell of a w×h grid. Returns Uint8Array of owner indices.
export function voronoiOwners(w, h, seeds) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const py = (y + 0.5) / h;
    for (let x = 0; x < w; x += 1) {
      const px = (x + 0.5) / w;
      let best = 0; let bestD = Infinity;
      for (let i = 0; i < seeds.length; i += 1) {
        const dx = seeds[i].x - px; const dy = seeds[i].y - py;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = seeds[i].owner; }
      }
      out[y * w + x] = best;
    }
  }
  return out;
}

// Cut a unit square into cols×rows quads with jittered inner corners.
// Returns an array of quads, each four [x, y] points in 0..1.
export function shardQuads(cols, rows, jitter, rng) {
  const pts = [];
  for (let r = 0; r <= rows; r += 1) {
    const row = [];
    for (let c = 0; c <= cols; c += 1) {
      const inner = c > 0 && c < cols && r > 0 && r < rows;
      const jx = inner ? (rng() - 0.5) * jitter / cols : 0;
      const jy = inner ? (rng() - 0.5) * jitter / rows : 0;
      row.push([c / cols + jx, r / rows + jy]);
    }
    pts.push(row);
  }
  const quads = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      quads.push([pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]]);
    }
  }
  return quads;
}

export function centroid(poly) {
  const n = poly.length;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}

// Scatter positions for n cards in a unit square with a little randomness but no pile-up.
export function scatterCards(n, rng, spread = 0.55) {
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const cards = [];
  for (let i = 0; i < n; i += 1) {
    const c = i % cols; const r = Math.floor(i / cols);
    const cx = (c + 0.5) / cols; const cy = (r + 0.5) / rows;
    cards.push({
      x: cx + (rng() - 0.5) * spread / cols * 0.5,
      y: cy + (rng() - 0.5) * spread / rows * 0.5,
      rot: (rng() - 0.5) * 0.25,
      w: Math.min(0.92 / cols, 0.92 / rows) + 0.04,
    });
  }
  return cards;
}

// Stage-only silhouettes. The compositor keeps its own tiling; these contours express
// the physical prep without changing the recipe or the source image algorithm.
export function prepContours(plan, rng) {
  if (plan.kind === 'slice') {
    return Array.from({ length: plan.strips }, (_, i) => {
      const x0 = i / plan.strips; const x1 = (i + .88) / plan.strips;
      return [[x0, .03], [x1, .015 + rng() * .025], [x1 - .008, .97], [x0 + .006, .98]];
    });
  }
  if (plan.kind === 'mash') {
    return Array.from({ length: 18 }, () => {
      const x = .12 + rng() * .76; const y = .12 + rng() * .76; const r = .055 + rng() * .07;
      return Array.from({ length: 12 }, (_, j) => {
        const a = j / 12 * Math.PI * 2; const rr = r * (.7 + rng() * .35);
        return [Math.max(.001, Math.min(.999, x + Math.cos(a) * rr)), Math.max(.001, Math.min(.999, y + Math.sin(a) * rr * .8))];
      });
    });
  }
  return shardQuads(3, 2, .65, rng).map((quad) => {
    const c = centroid(quad);
    return quad.flatMap((p, i) => {
      const q = quad[(i + 1) % quad.length];
      return [
        [c[0] + (p[0] - c[0]) * .86, c[1] + (p[1] - c[1]) * .87],
        [Math.max(.001, Math.min(.999, (p[0] + q[0]) / 2 + (rng() - .5) * .025)), Math.max(.001, Math.min(.999, (p[1] + q[1]) / 2 + (rng() - .5) * .025))],
      ];
    });
  });
}
