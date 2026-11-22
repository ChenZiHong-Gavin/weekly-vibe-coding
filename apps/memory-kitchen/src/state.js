// Pure state model for Memory Kitchen. No DOM, no side effects.
// Photos are ingredients. Two kinds of work, in the order a real kitchen does them:
//  - on the board (案板): cutting, mashing, marinating… each operation is baked into the picture
//    (see kitchen.js), so board work is ordered and cannot be undone;
//  - in the pot (锅): an ingredient goes in in the shape the board left it, and pot steps (煎/炒/炖/
//    蒸/收汁) act on whatever is in the pot at that moment. Something added later missed the earlier
//    steps, so the order of adding and cooking matters too. Nothing comes back out of the pot.
// 出锅 turns the pot into one new memory (a dish).

export const METHODS = {
  stew: { label: '炖', en: 'slow stew', blurb: '小火慢融，几段记忆化成一锅' },
  stirfry: { label: '炒', en: 'stir-fry', blurb: '大火快翻，碎片交错着跳' },
  steam: { label: '蒸', en: 'steam', blurb: '雾气蒙蒙，轮廓都温柔了' },
  roast: { label: '烤', en: 'roast', blurb: '烘得焦香，颜色更深更暖' },
  raw: { label: '生拌', en: 'raw salad', blurb: '不加热，只是把它们摆在一起' },
};

// Labels for the operations (the algorithms live in ops.js; keys must match its OPS).
export const STEP_LABELS = {
  slice: '切片', dice: '切丁', shred: '擦丝', mash: '捣碎', flatten: '擀平', marinate: '腌制', season: '撒盐', dry: '晾干', mix: '拌在一起',
};

// Pot steps (the animation lives in potScene.js; keys must match its POT_OPS).
export const POT_LABELS = { sear: '煎', stirfry: '炒', stew: '炖', steam: '蒸', reduce: '收汁' };

export const AMOUNTS = { 1: '少许', 2: '适量', 3: '大量' };
export const HEATS = { 1: '文火', 2: '中火', 3: '大火' };

export const MIN_INGREDIENTS = 1;
export const MAX_INGREDIENTS = 5; // in the pot
export const MAX_BOARD = 8;

export function createState() {
  return {
    pantry: [], // the ingredients on the board, in order
    selected: null, // board ingredient id being worked on
    pot: { items: [], steps: [] }, // items: ingredients in the order they went in (+ inAt); steps: { op, heat, seed }
    recipe: { heat: 2, title: '' }, // heat for the next pot step, and the dish name
    dishes: [],
    plate: null, // dish id shown on the plate; null means the newest
    cooking: { stage: 'idle', progress: 0, message: '' }, // idle | cooking | done | error
  };
}

let counter = 0;
export function newId(prefix = 'id') {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function addIngredient(state, ingredient) {
  const item = {
    id: ingredient.id || newId('ing'),
    name: ingredient.name || '未命名记忆',
    flavor: ingredient.flavor || '',
    src: ingredient.src,
    width: ingredient.width || 0,
    height: ingredient.height || 0,
    colors: ingredient.colors || [],
    amount: ingredient.amount || 2,
    steps: ingredient.steps || [], // operation keys in the order they were done ('mix' for a mix)
    last: ingredient.last || null, // { op, seed } of the last operation, to replay it
    prev: ingredient.prev || null, // the picture before the last operation
    prevB: ingredient.prevB || null, // for a mix: the other picture that went in
    parts: ingredient.parts || [], // for a mix: what the two ingredients were
    shape: ingredient.shape || null, // { op, seed } of the operation that gave it its pieces; null = whole
    origin: ingredient.origin || 'upload',
    addedAt: ingredient.addedAt || Date.now(),
  };
  return { ...state, pantry: [...state.pantry, item], selected: state.selected || item.id };
}

export function updateIngredient(state, id, patch) {
  return {
    ...state,
    pantry: state.pantry.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  };
}

export function removeIngredient(state, id) {
  return {
    ...state,
    pantry: state.pantry.filter((it) => it.id !== id),
    selected: state.selected === id ? (state.pantry.find((it) => it.id !== id)?.id || null) : state.selected,
  };
}

export function selectIngredient(state, id) {
  return { ...state, selected: state.pantry.some((it) => it.id === id) ? id : state.selected };
}

export function hasRoom(state) {
  return state.pantry.length < MAX_BOARD;
}

export function potHasRoom(state) {
  return state.pot.items.length < MAX_INGREDIENTS;
}

// Board → pot, for good. It remembers how many pot steps were done before it went in.
export function putInPot(state, id) {
  const it = state.pantry.find((x) => x.id === id);
  if (!it || !potHasRoom(state) || state.cooking.stage === 'cooking') return state;
  const rest = removeIngredient(state, id);
  return { ...rest, pot: { ...state.pot, items: [...state.pot.items, { ...it, inAt: state.pot.steps.length }] } };
}

// Straight into the pot (a served dish going back in to keep cooking).
export function addToPot(state, ingredient) {
  if (!potHasRoom(state)) return state;
  const item = addIngredient({ ...state, pantry: [] }, ingredient).pantry[0];
  return { ...state, pot: { ...state.pot, items: [...state.pot.items, { ...item, inAt: state.pot.steps.length }] } };
}

// One pot step on everything in the pot now.
export function potStep(state, op, heat, seed) {
  if (!POT_LABELS[op] || !state.pot.items.length || state.cooking.stage === 'cooking') return state;
  return { ...state, pot: { ...state.pot, steps: [...state.pot.steps, { op, heat, seed }] } };
}

export function emptyPot(state) {
  return { ...state, pot: { items: [], steps: [] } };
}

// Which compositor look the dish gets: the last step that shapes it (收汁 only glazes what is there).
const LOOK = { sear: 'roast', stirfry: 'stirfry', stew: 'stew', steam: 'steam' };
export function cookMethod(steps) {
  const shaping = steps.filter((s) => LOOK[s.op]);
  if (shaping.length) return LOOK[shaping.at(-1).op];
  return steps.length ? 'stew' : 'raw';
}
export function cookHeat(steps) {
  return steps.length ? Math.max(...steps.map((s) => s.heat || 2)) : 1;
}

// 「炖·中火」
export function potStepText(step) {
  return `${POT_LABELS[step.op] || step.op}·${HEATS[step.heat] || '中火'}`;
}

// The pot as it happened: 「下锅 A → 炖·中火 → 下锅 B → 收汁·大火」.
export function potLogText(pot) {
  const out = [];
  for (let k = 0; k <= pot.steps.length; k += 1) {
    const added = pot.items.filter((it) => (it.inAt || 0) === k).map((it) => it.name);
    if (added.length) out.push(`下锅 ${added.join('、')}`);
    if (k < pot.steps.length) out.push(potStepText(pot.steps[k]));
  }
  return out.join(' → ');
}

// Mix `droppedId` into `targetId`: the new ingredient takes the target's place, the dropped one is used up.
export function mixInto(state, targetId, droppedId, ingredient) {
  if (targetId === droppedId) return state;
  const at = state.pantry.findIndex((it) => it.id === targetId);
  if (at < 0 || !state.pantry.some((it) => it.id === droppedId)) return state;
  const next = addIngredient({ ...state, pantry: [] }, ingredient).pantry[0];
  const pantry = state.pantry.filter((it) => it.id !== droppedId).map((it) => (it.id === targetId ? next : it));
  return { ...state, pantry, selected: next.id };
}

export function setRecipe(state, patch) {
  return { ...state, recipe: { ...state.recipe, ...patch } };
}

export function setCooking(state, patch) {
  return { ...state, cooking: { ...state.cooking, ...patch } };
}

export function addDish(state, dish) {
  return { ...state, dishes: [dish, ...state.dishes], plate: dish.id };
}

export function removeDish(state, id) {
  const dishes = state.dishes.filter((d) => d.id !== id);
  return { ...state, dishes, plate: state.plate === id ? (dishes[0]?.id || null) : state.plate };
}

export function setPlate(state, id) {
  return { ...state, plate: state.dishes.some((d) => d.id === id) ? id : state.plate };
}

export function plateDish(state) {
  return state.dishes.find((d) => d.id === state.plate) || state.dishes[0] || null;
}

// 出锅 needs something in the pot.
export function canCook(state) {
  const n = state.pot.items.length;
  return n >= MIN_INGREDIENTS && n <= MAX_INGREDIENTS && state.cooking.stage !== 'cooking';
}

// The pot as recipe rows { ingredientId, steps, potSteps, amount, ingredient }; potSteps are the pot
// steps this ingredient was in for.
export function potRows(state) {
  return state.pot.items.map((ingredient) => ({
    ingredientId: ingredient.id, steps: ingredient.steps, amount: ingredient.amount, ingredient,
    potSteps: state.pot.steps.slice(ingredient.inAt || 0),
  }));
}

// 「切片 → 捣碎」, or 「（A + B）拌在一起 → 撒盐」 for a mix; 「原样」 when nothing was done.
export function stepsText(it) {
  const steps = it.steps || [];
  if (!steps.length) return '原样';
  return steps.map((k) => (k === 'mix' && it.parts?.length ? `（${it.parts.map((p) => p.name).join(' + ')}）拌在一起` : STEP_LABELS[k] || k)).join(' → ');
}
