import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, addIngredient, removeIngredient, updateIngredient, canCook, hasRoom, mixInto, stepsText,
  MAX_INGREDIENTS, MAX_BOARD, addDish, removeDish, plateDish, setPlate,
  putInPot, addToPot, potStep, potRows, potLogText, emptyPot, cookMethod, cookHeat, potHasRoom,
} from '../src/state.js';

function withPantry(n) {
  let s = createState();
  for (let i = 0; i < n; i += 1) s = addIngredient(s, { id: `i${i}`, name: `m${i}`, src: 'data:,' });
  return s;
}

test('the board holds up to MAX_BOARD; nothing is in the pot until it is put in', () => {
  const s = withPantry(3);
  assert.deepEqual(s.pot.items, []);
  assert.equal(canCook(s), false);
  assert.equal(hasRoom(s), true);
  assert.equal(hasRoom(withPantry(MAX_BOARD)), false);
});

test('putting an ingredient in the pot takes it off the board for good, in order, up to the limit', () => {
  let s = withPantry(MAX_INGREDIENTS + 1);
  s = putInPot(s, 'i1');
  assert.deepEqual(s.pantry.map((it) => it.id), ['i0', 'i2', 'i3', 'i4', 'i5']);
  assert.deepEqual(s.pot.items.map((it) => it.id), ['i1']);
  assert.equal(s.selected, 'i0');
  assert.equal(canCook(s), true);
  ['i0', 'i2', 'i3', 'i4'].forEach((id) => { s = putInPot(s, id); });
  assert.equal(potHasRoom(s), false);
  assert.equal(putInPot(s, 'i5'), s);
  assert.equal(putInPot(s, 'nope'), s);
  assert.equal(canCook({ ...s, cooking: { ...s.cooking, stage: 'cooking' } }), false);
});

test('pot steps act on what is in the pot then: later ingredients miss earlier steps', () => {
  let s = withPantry(3);
  assert.equal(potStep(s, 'stew', 2, 1), s); // nothing in the pot yet
  s = putInPot(s, 'i0');
  s = potStep(s, 'stew', 1, 11);
  s = putInPot(s, 'i1');
  s = potStep(s, 'reduce', 3, 12);
  assert.equal(potStep(s, 'nope', 2, 1), s);
  const rows = potRows(s);
  assert.deepEqual(rows.map((r) => r.potSteps.map((p) => p.op)), [['stew', 'reduce'], ['reduce']]);
  assert.equal(potLogText(s.pot), '下锅 m0 → 炖·文火 → 下锅 m1 → 收汁·大火');
  assert.equal(cookMethod(s.pot.steps), 'stew');
  assert.equal(cookHeat(s.pot.steps), 3);
  assert.deepEqual(emptyPot(s).pot, { items: [], steps: [] });
});

test('the dish look follows the last shaping pot step; no steps is raw', () => {
  assert.equal(cookMethod([]), 'raw');
  assert.equal(cookMethod([{ op: 'reduce' }]), 'stew');
  assert.equal(cookMethod([{ op: 'stew' }, { op: 'sear' }, { op: 'reduce' }]), 'roast');
  assert.equal(cookMethod([{ op: 'sear' }, { op: 'stirfry' }]), 'stirfry');
  assert.equal(cookMethod([{ op: 'steam' }]), 'steam');
  assert.equal(cookHeat([]), 1);
});

test('a dish can go straight back into the pot', () => {
  let s = putInPot(withPantry(1), 'i0');
  s = potStep(s, 'sear', 2, 3);
  s = addToPot(s, { id: 'd', name: '上一道', src: 'data:,' });
  assert.deepEqual(s.pot.items.map((it) => [it.id, it.inAt]), [['i0', 0], ['d', 1]]);
  assert.equal(s.pantry.length, 0);
});

test('removing an ingredient takes it off the board and moves the selection', () => {
  let s = withPantry(2);
  s = removeIngredient(s, 'i0');
  assert.equal(s.pantry.length, 1);
  assert.equal(s.selected, 'i1');
});

test('board steps are kept in order on the ingredient and flow into pot rows', () => {
  let s = withPantry(1);
  assert.equal(stepsText(s.pantry[0]), '原样');
  s = updateIngredient(s, 'i0', { steps: ['slice', 'mash'], last: { op: 'mash', seed: 7 }, amount: 3 });
  assert.equal(stepsText(s.pantry[0]), '切片 → 捣碎');
  const row = potRows(putInPot(s, 'i0'))[0];
  assert.deepEqual(row.steps, ['slice', 'mash']);
  assert.equal(row.amount, 3);
  assert.deepEqual(row.potSteps, []);
});

test('mixing replaces the target in place, uses up the dropped one and selects the mix', () => {
  let s = withPantry(3);
  s = mixInto(s, 'i2', 'i0', { id: 'mx', name: 'm2拌m0', src: 'data:,', steps: ['mix'], parts: [{ name: 'm2' }, { name: 'm0' }] });
  assert.deepEqual(s.pantry.map((it) => it.id), ['i1', 'mx']);
  assert.equal(s.selected, 'mx');
  assert.equal(stepsText(s.pantry[1]), '（m2 + m0）拌在一起');
  assert.equal(mixInto(s, 'mx', 'mx', {}), s);
  assert.equal(mixInto(s, 'mx', 'nope', {}), s);
});

test('dishes are prepended, the plate follows the newest unless chosen, and survives removal', () => {
  let s = createState();
  s = addDish(s, { id: 'a' });
  s = addDish(s, { id: 'b' });
  assert.deepEqual(s.dishes.map((d) => d.id), ['b', 'a']);
  assert.equal(plateDish(s).id, 'b');
  s = setPlate(s, 'a');
  assert.equal(plateDish(s).id, 'a');
  s = removeDish(s, 'a');
  assert.equal(plateDish(s).id, 'b');
});
