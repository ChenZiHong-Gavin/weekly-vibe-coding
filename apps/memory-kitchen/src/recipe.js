// Pure recipe helpers: prompt text for image APIs, dish naming, seeds.
import { METHODS, AMOUNTS, HEATS, POT_LABELS, stepsText, potLogText } from './state.js';

const METHOD_PROMPT = {
  stew: 'slow stew: melt the subjects and places into one continuous scene, soft edges, warm diffused light, everything belongs to the same afternoon',
  stirfry: 'stir-fry: energetic, fragments of each memory tossed together, bold colors, lively diagonal motion, still one coherent photograph',
  steam: 'steam: hazy and tender, pale light through mist, low contrast, soft focus, the outlines of each memory gently blur into each other',
  roast: 'roast: deep warm tones, rich shadows, golden-hour contrast, slightly aged and toasted like an old print',
  raw: 'raw salad: no heavy blending, the memories sit side by side in one frame as if they were always neighbors, clean natural light',
};

const HEAT_PROMPT = {
  1: 'low heat: subtle transformation, the original photos stay recognizable',
  2: 'medium heat: a balanced fusion, familiar yet clearly new',
  3: 'high heat: bold transformation, invent a scene that never existed but feels remembered',
};

// What each operation means for the image model, in the order it was done.
const STEP_PROMPT = {
  slice: 'sliced (keep its recognizable details, in strips)',
  dice: 'diced (small recognizable cubes of it)',
  shred: 'shredded (thin threads of its colors and lines)',
  mash: 'mashed (only its colors and mood, not its exact objects)',
  flatten: 'rolled flat (stretched and thinned out)',
  marinate: 'marinated (its feeling soaks into the whole picture)',
  season: 'salted (crisper, a little sparkle)',
  dry: 'sun-dried (faded, warm, curled at the edges)',
};

// 'raw', or 'sliced, then mashed', or '(A + B tossed together), then salted'.
export function stepsPrompt(it) {
  const steps = it.steps || [];
  if (!steps.length) return 'as it is';
  return steps.map((k) => (k === 'mix'
    ? `tossed together from ${(it.parts || []).map((p) => `"${p.name}" (${stepsPrompt(p)})`).join(' and ') || 'two memories'}`
    : STEP_PROMPT[k] || k)).join(', then ');
}

// Pot steps for the image model.
const POT_PROMPT = {
  sear: 'pan-seared (browned, crisp edges)',
  stirfry: 'stir-fried (tossed, glossy, lively)',
  stew: 'stewed (softened, colors bleeding into each other)',
  steam: 'steamed (pale, moist, soft edges)',
  reduce: 'glazed in a reduced sauce (deep, glossy)',
};
const potPrompt = (steps) => steps.map((s) => `${POT_PROMPT[s.op] || POT_LABELS[s.op] || s.op} on ${({ 1: 'low', 2: 'medium', 3: 'high' })[s.heat] || 'medium'} heat`).join(', then ');

const AMOUNT_PROMPT = { 1: 'a pinch of', 2: 'a good amount of', 3: 'a generous amount of' };

export function buildPrompt(rows, recipe) {
  const lines = rows.map((row) => {
    const { ingredient, amount } = row;
    const colors = ingredient.colors?.length ? ` (dominant colors ${ingredient.colors.slice(0, 3).join(', ')})` : '';
    const flavor = ingredient.flavor ? `, it tastes like "${ingredient.flavor}"` : '';
    const inPot = row.potSteps ? `; in the pot: ${row.potSteps.length ? potPrompt(row.potSteps) : 'added at the very end, barely cooked'}` : '';
    return `- ${AMOUNT_PROMPT[amount] || AMOUNT_PROMPT[2]} "${ingredient.name}"${colors}, on the board ${stepsPrompt(ingredient)}${inPot}${flavor}`;
  });
  const steps = recipe.steps || [];
  return [
    'Cook these memories into one brand-new memory: a single coherent photograph of a moment that never happened but could have.',
    'Ingredients (the attached photos, in the order they went into the pot):',
    ...lines,
    steps.length ? `In the pot, in order: ${potPrompt(steps)}. Earlier ingredients went through more of it than later ones.` : 'Not cooked: served raw, side by side.',
    `Overall look, ${METHODS[recipe.method]?.en || 'slow stew'}: ${METHOD_PROMPT[recipe.method] || METHOD_PROMPT.stew}.`,
    `Heat: ${HEAT_PROMPT[recipe.heat] || HEAT_PROMPT[2]}.`,
    recipe.title ? `The dish is called "${recipe.title}".` : '',
    'Photographic, natural, no text, no captions, no collage borders, no split screen.',
  ]
    .filter(Boolean)
    .join('\n');
}

// Short Chinese summary shown on the dish card: what happened in the pot, then how each was prepared.
export function describeRecipe(rows, recipe) {
  const pot = potLogText({ items: rows.map((r) => r.ingredient), steps: recipe.steps || [] });
  const parts = rows.map(({ ingredient, amount }) => `${ingredient.name}（${stepsText(ingredient)}·${AMOUNTS[amount] || '适量'}）`);
  return `${(recipe.steps || []).length ? pot : `生拌 · ${pot}`} ｜ 案板：${parts.join('、')}`;
}

const DISH_HEADS = {
  stew: ['慢炖', '一锅', '暖炖'],
  stirfry: ['快炒', '爆炒', '翻炒'],
  steam: ['清蒸', '雾蒸', '轻蒸'],
  roast: ['炙烤', '慢烤', '焦糖'],
  raw: ['凉拌', '生拌', '并置'],
};

export function suggestTitle(rows, recipe, rng = Math.random) {
  const heads = DISH_HEADS[recipe.method] || DISH_HEADS.stew;
  const head = heads[Math.floor(rng() * heads.length)];
  const names = rows.map((r) => r.ingredient.flavor || r.ingredient.name).filter(Boolean);
  if (names.length === 0) return `${head}记忆`;
  if (names.length === 1) return `${head}${names[0]}`;
  const a = names[0];
  const b = names[names.length - 1];
  return `${head}${a}与${b}`;
}

// Deterministic 32-bit hash for seeds.
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function recipeSeed(rows, recipe, salt = 0) {
  const key = rows.map((r) => `${r.ingredientId}:${r.ingredient?.last?.seed || 0}:${(r.steps || []).length}:${r.amount}:${r.ingredient?.inAt || 0}`).join('|')
    + `|${(recipe.steps || []).map((s) => `${s.op}${s.heat}${s.seed}`).join(',')}|${recipe.method}|${recipe.heat}|${salt}`;
  return hashString(key);
}

// Mulberry32 PRNG.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
