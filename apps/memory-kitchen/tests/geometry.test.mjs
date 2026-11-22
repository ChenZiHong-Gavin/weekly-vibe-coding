import test from 'node:test';
import assert from 'node:assert/strict';
import { weightedSeeds, voronoiOwners, shardQuads, scatterCards, centroid, prepContours } from '../src/geometry.js';
import { makeRng } from '../src/recipe.js';

test('weighted seeds give more cells to larger amounts and stay inside the canvas', () => {
  const seeds = weightedSeeds([1, 3], makeRng(7));
  const byOwner = [0, 0];
  seeds.forEach((s) => { byOwner[s.owner] += 1; assert.ok(s.x >= 0.05 && s.x <= 0.95 && s.y >= 0.05 && s.y <= 0.95); });
  assert.ok(byOwner[1] > byOwner[0]);
});

test('voronoi assigns every cell and every seed owner appears', () => {
  const seeds = weightedSeeds([2, 2, 2], makeRng(3));
  const owners = voronoiOwners(32, 32, seeds);
  assert.equal(owners.length, 32 * 32);
  assert.deepEqual([...new Set(owners)].sort(), [0, 1, 2]);
});

test('shards tile the unit square and keep outer corners pinned', () => {
  const quads = shardQuads(3, 2, 0.4, makeRng(1));
  assert.equal(quads.length, 6);
  assert.deepEqual(quads[0][0], [0, 0]);
  assert.deepEqual(quads[5][2], [1, 1]);
  const [cx, cy] = centroid(quads[0]);
  assert.ok(cx > 0 && cx < 0.5 && cy > 0 && cy < 0.6);
});

test('scattered cards are deterministic and inside the frame', () => {
  const a = scatterCards(5, makeRng(9));
  const b = scatterCards(5, makeRng(9));
  assert.deepEqual(a, b);
  a.forEach((c) => assert.ok(c.x > 0 && c.x < 1 && c.y > 0 && c.y < 1 && c.w > 0 && c.w < 1));
});


test('stage prep silhouettes are deterministic, bounded and retain their physical proportions', () => {
  for (const plan of [{kind: 'slice', strips: 9}, {kind: 'mash'}, {kind: 'marinate'}]) {
    for (let seed = 0; seed < 20; seed++) {
      const shapes = prepContours(plan, makeRng(seed));
      assert.deepEqual(shapes, prepContours(plan, makeRng(seed)));
      for (const shape of shapes) {
        assert.ok(shape.length >= 4);
        shape.forEach(([x, y]) => assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1));
        const xs = shape.map((v) => v[0]); const ys = shape.map((v) => v[1]);
        const width = Math.max(...xs) - Math.min(...xs); const height = Math.max(...ys) - Math.min(...ys);
        assert.ok(width > 0 && height > 0);
        if (plan.kind === 'slice') assert.ok(height / width > 8);
        if (plan.kind === 'mash') assert.ok(height / width < 2);
      }
    }
  }
});
