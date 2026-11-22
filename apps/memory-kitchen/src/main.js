import * as S from './state.js';
import { buildPrompt, describeRecipe, suggestTitle, recipeSeed, hashString } from './recipe.js';
import { dominantColors } from './color.js';
import { cook, PROVIDERS, loadSettings, saveSettings } from './imageApi.js';
import { loadImage, prepareCook, renderDish } from './localCook.js';
import { storage } from './storage.js';
import { makeSamples } from './samples.js';
import { startPot, POT_OPS, POT_STEP_MS } from './potScene.js';
import { startBoardPrep } from './boardPrep.js';
import { OPS, MIX, OP_PLAY_MS } from './ops.js';
import { applyOperation, mixIngredients, shapeOf, playOperation } from './kitchen.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = {
  photos: $('#photos'), boardCount: $('#board-count'), boardEmpty: $('#board-empty'), dropzone: $('#dropzone'), fileInput: $('#file-input'),
  selected: $('#selected'), editName: $('#edit-name'), editFlavor: $('#edit-flavor'), preps: $('#preps'), amounts: $('#amounts'),
  btnMix: $('#btn-mix'), btnToPot: $('#btn-to-pot'), stepsNow: $('#steps-now'), boardHint: $('#board-hint'),
  stove: $('#stove'), pot: $('#pot'), wokCanvas: $('#wok-canvas'), potStatus: $('#pot-status'), potSteps: $('#pot-steps'),
  methods: $('#methods'), heats: $('#heats'), btnCook: $('#btn-cook'), btnCancel: $('#btn-cancel'), stoveProvider: $('#stove-provider'),
  plateLead: $('#plate-lead'), plateTitle: $('#plate-title'), plate: $('#plate'), plateImg: $('#plate-img'), plateRecipe: $('#plate-recipe'),
  plateNotes: $('#plate-notes'), platePrompt: $('#plate-prompt'), plateActions: $('#plate-actions'),
  btnSamples: $('#btn-samples'), btnSettings: $('#btn-settings'),
  dialog: $('#settings-dialog'), form: $('#settings-form'), provider: $('#provider'), providerNote: $('#provider-note'), btnSettingsCancel: $('#btn-settings-cancel'),
  tplPhoto: $('#tpl-photo'),
};

let state = S.createState();
let settings = loadSettings();
let abort = null;
let working = null; // ingredient id an operation or a mix is being done to
let mixPick = null; // ingredient id waiting for a second one to be mixed with (click fallback for drag)
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let stepping = false; // a pot step is playing
const pot = startPot(el.wokCanvas, { reducedMotion });
const boardPrep = startBoardPrep(el.photos);
const POT_STEPS_KEY = 'memory-kitchen.pot-steps';
const busyCooking = () => state.cooking.stage === 'cooking';

function set(next) {
  state = next;
  render();
}

// ---------- Rendering ----------
function render() {
  renderBoard();
  renderSelected();
  renderStove();
  renderPlate();
}

function renderBoard() {
  el.boardCount.textContent = `案板上 ${state.pantry.length} / ${S.MAX_BOARD} 样`;
  syncList(el.photos, state.pantry, (it) => it.id, (it) => {
    const node = el.tplPhoto.content.firstElementChild.cloneNode(true);
    node.dataset.id = it.id;
    $('.photo__img', node).src = it.src;
    node.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-ingredient', it.id); e.dataTransfer.effectAllowed = 'move'; });
    // Drop one ingredient on another to mix them into one.
    node.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('text/x-ingredient') || working) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move'; node.classList.add('photo--mix-target');
    });
    node.addEventListener('dragleave', (e) => { if (!node.contains(e.relatedTarget)) node.classList.remove('photo--mix-target'); });
    node.addEventListener('drop', (e) => {
      node.classList.remove('photo--mix-target');
      const dropped = e.dataTransfer.getData('text/x-ingredient');
      if (!dropped) return;
      e.preventDefault(); e.stopPropagation();
      if (dropped !== node.dataset.id) mix(node.dataset.id, dropped);
    });
    node.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      const id = node.dataset.id;
      if (act === 'remove') { if (working === id) return; storage.del('pantry', id); mixPick = null; set(S.removeIngredient(state, id)); }
      else if (mixPick && mixPick !== id) { const other = mixPick; mixPick = null; mix(id, other); }
      else { mixPick = null; set(S.selectIngredient(state, id)); }
    });
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); node.click(); } });
    return node;
  }, (node, it) => {
    const img = $('.photo__img', node);
    if (img.getAttribute('src') !== it.src) img.src = it.src;
    img.alt = it.name;
    $('.photo__name', node).textContent = it.name;
    $('.photo__steps', node).textContent = S.stepsText(it);
    $('.photo__meta', node).textContent = `${S.AMOUNTS[it.amount] || '适量'}${it.flavor ? ` · 味道：${it.flavor}` : ''}`;
    node.classList.toggle('photo--selected', state.selected === it.id);
    node.classList.toggle('photo--mix-pick', mixPick === it.id);
    node.setAttribute('aria-current', state.selected === it.id ? 'true' : 'false');
  });
  el.boardHint.textContent = mixPick
    ? `点另一样食材，把「${state.pantry.find((x) => x.id === mixPick)?.name || ''}」拌进去`
    : '';
  boardPrep.sync();
}

function renderSelected() {
  const it = state.pantry.find((x) => x.id === state.selected);
  // The tools stay on the board even with nothing picked (disabled), so the layout does not jump.
  el.selected.classList.toggle('selected--none', !it);
  if (!el.preps.childElementCount) {
    // Tools are actions, not settings: each click does that operation to the picture as it is now.
    el.preps.replaceChildren(...segButtons(OPS, (k) => applyTool(k), (k) => `${OPS[k].tool}：${OPS[k].blurb}`, 'tool'));
    [...el.preps.children].forEach((b) => b.removeAttribute('role'));
    el.amounts.replaceChildren(...segButtons(S.AMOUNTS, (k) => commitIngredient(state.selected, { amount: Number(k) }), null, 'spoon'));
  }
  if (!it) {
    el.editName.value = ''; el.editFlavor.value = '';
    el.editName.disabled = el.editFlavor.disabled = true;
    [...el.preps.children, ...el.amounts.children, el.btnMix, el.btnToPot].forEach((b) => { b.disabled = true; });
    el.btnToPot.textContent = '下锅 →';
    el.stepsNow.textContent = '';
    markSeg(el.amounts, '');
    return;
  }
  el.editName.disabled = el.editFlavor.disabled = false;
  [...el.amounts.children].forEach((b) => { b.disabled = false; });
  if (document.activeElement !== el.editName) el.editName.value = it.name;
  if (document.activeElement !== el.editFlavor) el.editFlavor.value = it.flavor;
  const busy = !!working || state.cooking.stage === 'cooking';
  [...el.preps.children].forEach((b) => { b.disabled = busy; });
  el.btnMix.disabled = busy || state.pantry.length < 2;
  el.btnToPot.disabled = busy || !!working || !S.potHasRoom(state);
  el.btnToPot.textContent = S.potHasRoom(state) ? '下锅 →' : `锅里满了（${S.MAX_INGREDIENTS} 样）`;
  el.btnMix.textContent = mixPick ? '不拌了' : `${MIX.label}…`;
  el.btnMix.title = MIX.blurb;
  el.stepsNow.textContent = `做过：${S.stepsText(it)}`;
  markSeg(el.amounts, String(it.amount));
}

const shapes = new Map(); // ingredient id + shape key → pieces (pure, but not free)
function shapeFor(it) {
  const key = `${it.id}|${it.shape?.op || it.last?.op || ''}|${it.shape?.seed || it.last?.seed || ''}`;
  if (!shapes.has(key)) shapes.set(key, shapeOf(it));
  return shapes.get(key);
}

function renderStove() {
  if (!el.methods.childElementCount) {
    // Pot steps are actions on whatever is in the pot right now, not a setting.
    el.methods.replaceChildren(...Object.entries(POT_OPS).map(([k, m]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'method'; b.dataset.value = k; b.title = m.blurb;
      b.innerHTML = `<span class="method__icon" aria-hidden="true"></span><span class="method__label">${m.label}</span><span class="method__blurb">${m.blurb}</span>`;
      b.addEventListener('click', () => doPotStep(k));
      return b;
    }));
    el.heats.replaceChildren(...segButtons(S.HEATS, (k) => set(S.setRecipe(state, { heat: Number(k) })), null, 'flame'));
  }
  const n = state.pot.items.length;
  [...el.methods.children].forEach((b) => { b.disabled = !n || stepping || busyCooking(); });
  markSeg(el.heats, String(state.recipe.heat));
  el.btnCook.disabled = !S.canCook(state) || stepping || cookBusy;
  const raw = Boolean(n && !state.pot.steps.length);
  el.btnCook.textContent = raw ? '出锅（生拌）' : '出锅';
  el.btnCook.classList.toggle('is-raw', raw);
  el.btnCancel.hidden = state.cooking.stage !== 'cooking';
  el.pot.dataset.stage = state.cooking.stage;
  el.pot.dataset.count = String(n);
  el.potSteps.textContent = n ? S.potLogText(state.pot) : '';
  el.potStatus.textContent = (state.cooking.stage !== 'done' && state.cooking.message) || (stepping ? `${POT_OPS[state.pot.steps.at(-1)?.op]?.label || ''}着呢…` : '');
  // Only worth a word when a remote image API is doing the cooking.
  el.stoveProvider.textContent = settings.provider === 'local' ? '' : PROVIDERS[settings.provider]?.label || '';
  pot.update({
    items: state.pot.items.map((it) => ({ id: it.id, src: it.src, name: it.name, colors: it.colors, amount: it.amount, inAt: it.inAt || 0, shape: shapeFor(it) })),
    steps: state.pot.steps, heat: state.recipe.heat, stage: state.cooking.stage, dish: null,
  });
}

function renderPlate() {
  const dish = S.plateDish(state);
  el.plate.classList.toggle('plate--empty', !dish);
  el.plateImg.hidden = !dish;
  el.plateActions.hidden = !dish;
  el.plateNotes.hidden = !dish;
  el.plateLead.textContent = '';
  el.plateTitle.textContent = dish ? dish.title : '';
  el.plateRecipe.textContent = dish ? dish.recipe : '';
  el.platePrompt.textContent = dish ? dish.prompt : '';
  if (dish) { el.plateImg.src = dish.src; el.plateImg.alt = dish.title; }
}

// Keyed list reconciliation: keeps existing nodes (and their focus) when ids are unchanged.
function syncList(container, items, keyOf, create, update) {
  const existing = new Map([...container.children].map((n) => [n.dataset.id, n]));
  const next = items.map((it) => {
    const key = keyOf(it);
    let node = existing.get(key);
    if (!node) node = create(it);
    update?.(node, it);
    existing.delete(key);
    return node;
  });
  existing.forEach((n) => n.remove());
  next.forEach((n, i) => { if (container.children[i] !== n) container.insertBefore(n, container.children[i] || null); });
}

function segButtons(map, onPick, titleOf, kind) {
  return Object.entries(map).map(([k, v]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `seg__btn seg__btn--${kind}`; b.dataset.value = k; b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="seg__icon" aria-hidden="true"></span><span class="seg__label">${typeof v === 'string' ? v : v.label}</span>`;
    if (titleOf) b.title = titleOf(k);
    b.addEventListener('click', () => onPick(k));
    return b;
  });
}

function markSeg(group, value) {
  [...group.children].forEach((b) => {
    const on = b.dataset.value === value;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

// ---------- Ingredients ----------
async function ingestFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  for (const file of list) {
    try {
      const src = await fileToDataUrl(file, 1280);
      const img = await loadImage(src);
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || '未命名记忆';
      if (!S.hasRoom(state)) { setStatus(`案板放满了（${S.MAX_BOARD} 样），先下锅、拌一拌或丢掉一样`); return; }
      await addIngredientFrom({ name, src, width: img.naturalWidth, height: img.naturalHeight, colors: dominantColors(img), origin: 'upload' });
    } catch (err) {
      setStatus(`有一张照片读不出来：${err.message}`);
    }
  }
}

async function addIngredientFrom(data) {
  const next = S.addIngredient(state, data);
  const item = next.pantry[next.pantry.length - 1];
  storage.put('pantry', item);
  set(next);
  return item;
}

function commitIngredient(id, patch) {
  if (!id) return;
  set(S.updateIngredient(state, id, patch));
  const it = state.pantry.find((x) => x.id === id);
  if (it) storage.put('pantry', it);
}

function fileToDataUrl(file, maxSide) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('不是可识别的图片')); };
    img.src = url;
  });
}

// Four sample photos per press, skipping the ones already on the board.
async function addSamples() {
  const onBoard = new Set(state.pantry.filter((x) => x.origin === 'sample').map((x) => x.name));
  const next = makeSamples().filter((s) => !onBoard.has(s.name)).slice(0, 4);
  for (const s of next) {
    if (!S.hasRoom(state)) break;
    try {
      const img = await loadImage(s.src);
      // Keep the board self-contained like an upload: bake the photo into a data URL.
      const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      await addIngredientFrom({ ...s, src: c.toDataURL('image/jpeg', 0.86), width: c.width, height: c.height, colors: dominantColors(img) });
    } catch (e) { setStatus(`示例照片「${s.name}」没拿到`); }
  }
}

// Do one operation to the selected ingredient: it reads the picture as it is now and the result is
// baked in, so the order of operations matters and nothing can be undone.
async function applyTool(op) {
  const it = state.pantry.find((x) => x.id === state.selected);
  if (!it || working || busyCooking()) return;
  working = it.id; mixPick = null; render();
  try {
    const { patch, live } = await applyOperation(it, op);
    commitIngredient(it.id, patch);
    playOperation(it.id, live, { reduced: reducedMotion() });
    await wait(reducedMotion() ? 0 : OP_PLAY_MS);
  } catch (err) {
    setStatus(`没处理成：${err.message}`);
  } finally {
    working = null; render();
  }
}

// Mix `droppedId` into `targetId`: one new ingredient takes the target's place.
async function mix(targetId, droppedId) {
  const target = state.pantry.find((x) => x.id === targetId);
  const dropped = state.pantry.find((x) => x.id === droppedId);
  if (!target || !dropped || working || state.cooking.stage === 'cooking') return;
  working = targetId; mixPick = null; render();
  try {
    const { data, live } = await mixIngredients(target, dropped);
    const next = S.mixInto(state, targetId, droppedId, data);
    const made = next.pantry.find((x) => x.id === next.selected);
    storage.del('pantry', targetId); storage.del('pantry', droppedId); storage.put('pantry', made);
    working = made.id;
    set(next);
    playOperation(made.id, live, { reduced: reducedMotion() });
    await wait(reducedMotion() ? 0 : OP_PLAY_MS);
  } catch (err) {
    setStatus(`没拌成：${err.message}`);
  } finally {
    working = null; render();
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- The pot ----------
// Board → pot, for good: the card's pieces fall into the pan in the shape the board left them.
function toPot(id) {
  const it = state.pantry.find((x) => x.id === id);
  if (!it || working === id || busyCooking() || cookBusy) return;
  if (!S.potHasRoom(state)) { setStatus(`锅里最多 ${S.MAX_INGREDIENTS} 样，先出锅`); return; }
  const card = el.photos.querySelector(`.photo[data-id="${CSS.escape(id)}"] .photo__img`);
  if (card) pot.dropFrom(id, card.getBoundingClientRect());
  mixPick = null;
  const next = S.putInPot(S.setCooking(state, { stage: state.cooking.stage === 'cooking' ? 'cooking' : 'idle', message: '' }), id);
  savePot(next);
  set(next);
}

// One pot step on everything in the pot now; whatever goes in later misses it.
async function doPotStep(op) {
  if (!state.pot.items.length || stepping || busyCooking() || cookBusy) return;
  const seed = hashString(`${op}|${state.pot.steps.length}|${Date.now()}|${Math.random()}`);
  stepping = true;
  const next = S.potStep(S.setCooking(state, { stage: 'idle', message: '' }), op, state.recipe.heat, seed);
  savePot(next);
  set(next);
  await wait(reducedMotion() ? 0 : POT_STEP_MS);
  stepping = false; render();
}

function savePot(s) {
  s.pot.items.forEach((it, i) => storage.put('pantry', { ...it, potIndex: i }));
  try { localStorage.setItem(POT_STEPS_KEY, JSON.stringify(s.pot.steps)); } catch { /* private mode: the pot just won't survive a reload */ }
}
function clearSavedPot(items) {
  items.forEach((it) => storage.del('pantry', it.id));
  try { localStorage.removeItem(POT_STEPS_KEY); } catch { /* ignore */ }
}

// ---------- 出锅 ----------
function setStatus(message) {
  set(S.setCooking(state, { message }));
}

let cookBusy = false; // true from the click until the dish has landed on the page's plate
async function startCook() {
  if (!S.canCook(state) || stepping || cookBusy) return;
  cookBusy = true;
  abort = new AbortController();
  const { signal } = abort;
  const rows = S.potRows(state);
  const steps = state.pot.steps;
  const recipe = { steps, method: S.cookMethod(steps), heat: S.cookHeat(steps), title: state.recipe.title };
  const prompt = buildPrompt(rows, recipe);
  const seed = recipeSeed(rows, recipe);
  set(S.setCooking(state, { stage: 'cooking', progress: 0, message: '起锅，装盘…' }));
  try {
    const remote = settings.provider !== 'local'
      ? cook({ rows, recipe, prompt, seed, settings, signal }).then(async (r) => ({ ...r, img: await loadImage(URL.createObjectURL(r.blob)) }))
      : null;
    const prep = await prepareCook({ rows, recipe, seed, signal });
    const local = await renderDish(prep, signal);
    if (remote) setStatus('等生图接口回话…');
    const result = remote ? await remote : { blob: local.blob, provider: 'local', img: local.canvas };
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    const title = recipe.title?.trim() || suggestTitle(rows, recipe);
    // The pieces gather into the dish in the pan, then it is carried to the plate.
    await pot.serve(result.img);
    const src = await blobToDataUrl(result.blob);
    const dish = {
      id: S.newId('dish'), src, title, recipe: describeRecipe(rows, recipe), prompt,
      method: recipe.method, heat: recipe.heat, potSteps: steps,
      rows: rows.map((r) => ({ ingredientId: r.ingredientId, steps: r.steps, potSteps: r.potSteps, amount: r.amount, name: r.ingredient.name })),
      provider: result.provider, seed, createdAt: Date.now(),
    };
    storage.put('dishes', dish);
    clearSavedPot(state.pot.items);
    const from = pot.dishRect();
    set(S.addDish(S.emptyPot(S.setCooking(state, { stage: 'done', progress: 1, message: `出锅：${dish.title}` })), dish));
    await flyToPlate(src, from);
  } catch (err) {
    const cancelled = err?.name === 'AbortError';
    set(S.setCooking(state, { stage: cancelled ? 'idle' : 'error', progress: 0, message: cancelled ? '熄火了，锅里的还在' : `这锅糊了：${err.message}` }));
  } finally {
    abort = null;
    cookBusy = false;
    render();
  }
}

// A clone of the dish flies from the pan to the plate on the page.
async function flyToPlate(src, from) {
  const to = el.plateImg.getBoundingClientRect();
  if (reducedMotion() || !from || !to.width) return;
  const clone = document.createElement('img');
  clone.src = src; clone.className = 'dish-flight'; clone.alt = '';
  Object.assign(clone.style, { left: `${from.x - from.size / 2}px`, top: `${from.y - from.size / 2}px`, width: `${from.size}px`, height: `${from.size}px` });
  document.body.append(clone);
  el.plateImg.style.visibility = 'hidden';
  const dx = to.left + to.width / 2 - from.x; const dy = to.top + to.height / 2 - from.y;
  const k = to.width / from.size;
  const anim = clone.animate([
    { transform: 'translate(0,0) scale(1)', borderRadius: '50%' },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(${(1 + k) / 2 * 1.04})`, borderRadius: '50%', offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(${k})`, borderRadius: getComputedStyle(el.plateImg).borderRadius || '50%' },
  ], { duration: 900, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
  try { await anim.finished; } catch { /* cancelled */ }
  el.plateImg.style.visibility = '';
  clone.remove();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('结果读取失败'));
    r.readAsDataURL(blob);
  });
}

// A served dish goes straight back into the pot, whole, to keep cooking with what is there.
async function dishToPot(dish) {
  if (busyCooking() || cookBusy) return;
  if (!S.potHasRoom(state)) { setStatus(`锅里最多 ${S.MAX_INGREDIENTS} 样，先出锅`); return; }
  const img = await loadImage(dish.src);
  const next = S.addToPot(S.setCooking(state, { stage: 'idle', message: '' }), {
    name: dish.title, flavor: '', src: dish.src, width: img.naturalWidth, height: img.naturalHeight, colors: dominantColors(img), origin: 'dish',
  });
  const added = next.pot.items.at(-1);
  if (!el.plateImg.hidden) pot.dropFrom(added.id, el.plateImg.getBoundingClientRect());
  savePot(next);
  set(next);
}

function download(dish) {
  const a = document.createElement('a');
  a.href = dish.src;
  a.download = `${dish.title}.jpg`;
  a.click();
}

// ---------- Settings ----------
function openSettings() {
  el.provider.replaceChildren(...Object.entries(PROVIDERS).map(([k, p]) => { const o = document.createElement('option'); o.value = k; o.textContent = p.label; return o; }));
  el.form.provider.value = settings.provider;
  el.form.baseUrl.value = settings.baseUrl;
  el.form.apiKey.value = settings.apiKey;
  el.form.model.value = settings.model;
  el.form.size.value = settings.size;
  syncProviderFields();
  el.dialog.showModal();
}

function syncProviderFields() {
  const k = el.form.provider.value;
  const p = PROVIDERS[k];
  const remote = k !== 'local';
  el.form.querySelectorAll('[data-remote]').forEach((f) => { f.hidden = !remote; });
  el.form.baseUrl.placeholder = p.baseUrl || 'https://…';
  el.form.model.placeholder = p.model || '';
  el.providerNote.textContent = {
    local: '在浏览器里按烹饪方式把照片合成一张新照片，速度快、完全离线，但不是真正的图生图。',
    openai: '调用 OpenAI 兼容的 /images/edits，多张照片作为参考图，提示词即烹饪笔记。',
    ark: '调用火山方舟 Seedream 的图生图接口，image 字段传多张照片。',
    custom: '向你自己的地址 POST JSON { prompt, images:[dataURL] }，返回 { image: dataURL 或 url }。',
  }[k];
}

function saveSettingsFromForm() {
  settings = {
    provider: el.form.provider.value,
    baseUrl: el.form.baseUrl.value.trim(),
    apiKey: el.form.apiKey.value.trim(),
    model: el.form.model.value.trim(),
    size: el.form.size.value.trim() || '1024x1024',
  };
  saveSettings(settings);
  render();
}

// ---------- Wiring ----------
el.fileInput.addEventListener('change', () => { ingestFiles(el.fileInput.files); el.fileInput.value = ''; });
['dragenter', 'dragover'].forEach((t) => el.dropzone.addEventListener(t, (e) => { e.preventDefault(); el.dropzone.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((t) => el.dropzone.addEventListener(t, () => el.dropzone.classList.remove('is-over')));
el.dropzone.addEventListener('drop', (e) => { e.preventDefault(); ingestFiles(e.dataTransfer.files); });
document.addEventListener('paste', (e) => { const files = [...(e.clipboardData?.files || [])]; if (files.length) ingestFiles(files); });

// Drag a board card onto the pot to put it in. Files dropped on the pot land on the board first.
['dragenter', 'dragover'].forEach((t) => el.pot.addEventListener(t, (e) => {
  const types = e.dataTransfer.types;
  if (types.includes('text/x-ingredient') || types.includes('Files')) { e.preventDefault(); el.pot.classList.add('is-over'); }
}));
el.pot.addEventListener('dragleave', (e) => { if (!el.pot.contains(e.relatedTarget)) el.pot.classList.remove('is-over'); });
el.pot.addEventListener('drop', (e) => {
  e.preventDefault();
  el.pot.classList.remove('is-over');
  const id = e.dataTransfer.getData('text/x-ingredient');
  if (id) toPot(id);
  else if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files);
});
el.btnToPot.addEventListener('click', () => { if (state.selected) toPot(state.selected); });
el.btnMix.addEventListener('click', () => {
  mixPick = mixPick ? null : state.selected;
  render();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mixPick) { mixPick = null; render(); } });

el.editName.addEventListener('change', () => commitIngredient(state.selected, { name: el.editName.value.trim() || '未命名记忆' }));
el.editFlavor.addEventListener('change', () => commitIngredient(state.selected, { flavor: el.editFlavor.value.trim() }));
el.btnCook.addEventListener('click', () => startCook());
el.btnCancel.addEventListener('click', () => abort?.abort());
el.plateActions.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  const dish = S.plateDish(state);
  if (!dish) return;
  if (act === 'download') download(dish);
  if (act === 'pantry') dishToPot(dish);
  if (act === 'remove') { storage.del('dishes', dish.id); set(S.removeDish(state, dish.id)); }
});
el.btnSamples.addEventListener('click', addSamples);
el.btnSettings.addEventListener('click', openSettings);
el.btnSettingsCancel.addEventListener('click', () => el.dialog.close());
el.provider.addEventListener('change', syncProviderFields);
el.form.addEventListener('submit', saveSettingsFromForm);

(async function boot() {
  const [pantry, dishes] = await Promise.all([storage.all('pantry'), storage.all('dishes')]);
  let s = state;
  // Records with an inAt are in the pot (in the order they went in); the rest are on the board.
  pantry.filter((it) => it.inAt == null).sort((a, b) => a.addedAt - b.addedAt).forEach((it) => { s = S.addIngredient(s, it); });
  let steps = [];
  try { steps = JSON.parse(localStorage.getItem(POT_STEPS_KEY) || '[]'); } catch { steps = []; }
  const inPot = pantry.filter((it) => it.inAt != null).sort((a, b) => (a.potIndex ?? 0) - (b.potIndex ?? 0)).slice(0, S.MAX_INGREDIENTS);
  s = { ...s, pot: { items: inPot.map((it) => ({ ...it, inAt: Math.min(it.inAt, steps.length) })), steps: inPot.length ? steps : [] } };
  dishes.sort((a, b) => a.createdAt - b.createdAt).forEach((d) => { s = S.addDish(s, d); });
  set(s);
  // An empty worktop starts with sample photos on the board, ready to cut.
  if (!state.pantry.length && !state.pot.items.length) await addSamples();
})();
