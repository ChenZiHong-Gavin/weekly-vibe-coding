import test from 'node:test';
import assert from 'node:assert/strict';
import { OPS, MIX, OP_PLAY_MS, planOp } from '../src/ops.js';

const keys = ['slice', 'dice', 'shred', 'mash', 'flatten', 'marinate', 'season', 'dry'];
test('the toolbar catalogue and playback duration follow the baking contract', () => {
  assert.deepEqual(Object.keys(OPS), keys);
  assert.equal(MIX.label, '拌在一起');
  assert.equal(OP_PLAY_MS, 2200);
  for (const key of keys) for (const field of ['label', 'tool', 'en', 'blurb']) assert.ok(OPS[key][field]);
});
for (const key of [...keys, 'mix']) {
  test(`${key} plans without a DOM, deterministically and with seed variation`, () => {
    const a = planOp(key, 179414);
    assert.equal(a.kind, key);
    assert.deepEqual(a, planOp(key, 179414));
    assert.notDeepEqual(a, planOp(key, 179415));
    assert.equal(JSON.stringify(a).includes('null'), false, 'all planned numbers must be finite');
    const inspect = (v) => {
      if (typeof v === 'number') assert.ok(Number.isFinite(v));
      else if (v && typeof v === 'object') Object.values(v).forEach(inspect);
    };
    inspect(a);
  });
}
test('different operations have different physical plans, not just different labels', () => {
  const plans = keys.map((op) => { const { kind, ...shape } = planOp(op, 42); return JSON.stringify(shape); });
  assert.equal(new Set(plans).size, keys.length);
  const slice = planOp('slice', 42), dice = planOp('dice', 42);
  assert.ok(dice.pieces.length > slice.pieces.length * 3);
  for (const plan of [slice, dice]) for (const p of plan.pieces) for (const v of p.poly.flat()) assert.ok(v >= -1e-8 && v <= 1 + 1e-8);
  assert.ok(planOp('mash', 42).chunks.some((c) => c.sunk));
  assert.ok(planOp('mash', 42).chunks.some((c) => !c.sunk));
});
test('unknown operations fail explicitly', () => assert.throws(() => planOp('original', 1), RangeError));
