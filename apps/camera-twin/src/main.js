import { createScene } from './scene.js';
import { loadCamera } from './model/index.js';
import { createGuide } from './guide.js';
import data from './parts.json' with { type: 'json' };
import { attachFirmware, INTERACTIVE } from './firmware/index.js';
import { createLessonRunner } from './firmware/lessons.js';
import { SCENES } from './firmware/scenes.js';
import { readShootingInfo, summary as exifSummary } from './firmware/exif.js';

const $ = s => document.querySelector(s);
const partsById = new Map(data.parts.map(p => [p.id, p]));
const stage = createScene($('#stage'));
const { root, source, report } = loadCamera();
stage.setModel(root);
const modelStatus = $('#model-status');
modelStatus.textContent = source === 'r6iii' ? `模型：R6 Mark III（${report.parts} 部件，${report.triangles} 三角面）` : `模型：占位方块（等待 src/model/r6iii.js）`;
modelStatus.classList.toggle('ok', source === 'r6iii');
console.info('模型契约检查', report);

// firmware: LCD/EVF textures, dials, switches
const firmware = attachFirmware({ stage, root, lcdPreview: $('#lcd-preview'), onEvent: (ev, fw) => { const d = fw.display(); $('#fw-status').textContent = d.power === 'off' ? '电源 OFF' : `${d.power === 'lock' ? 'LOCK · ' : ''}${d.mode} · ${d.shutter} · F${d.aperture} · ISO ${d.iso}${d.ec ? ' · ' + (d.ec > 0 ? '+' : '') + (d.ec / 3).toFixed(1) : ''} · ${{ shoot: '拍摄', menu: '菜单', quick: '速控', playback: '回放' }[d.screen] || ''}`; } });
window.__twin = { stage, firmware };

const lessons = createLessonRunner(firmware.fw);
const guide = createGuide({ stage, firmware, lessons, partsById, modelSource: source, els: { log: $('#chat-log'), steps: $('#steps'), input: $('#chat-input'), send: $('#send') } });
// lessons UI
$('#lesson-select').innerHTML = [...new Set(lessons.lessons.map(l => l.category))].map(c => `<optgroup label="${c}">` + lessons.lessons.filter(l => l.category === c).map(l => `<option value="${l.id}">${'★'.repeat(l.level)} ${l.title}</option>`).join('') + '</optgroup>').join('');
function renderLesson(st) {
  // highlight the parts the next step needs, and say what to do with them on the stage
  const targetEl = $('#lesson-target');
  if (st && !st.complete) { stage.setLessonTargets(st.nextParts); const names = st.nextParts.map(id => partsById.get(id)?.name).filter(Boolean); targetEl.innerHTML = `<b>第 ${st.next + 1} 步</b>${st.goals[st.next].text}${names.length ? ' · 用：' + names.join('、') : ''}`; targetEl.classList.remove('hidden'); }
  else { stage.setLessonTargets([]); targetEl.classList.add('hidden'); }
  $('#photo-check').classList.toggle('hidden', !st || !st.exif); if (!st) { $('#photo-result').classList.add('hidden'); }
  $('#lesson-body').classList.toggle('hidden', !st); $('#lesson-badge').textContent = st ? (st.complete ? '已完成' : `${st.goals.filter(g => g.done).length}/${st.goals.length}`) : ''; if (!st) return;
  $('#lesson-intro').textContent = st.intro; $('#lesson-source').innerHTML = st.source ? `来源：<a href="${st.source}" target="_blank" rel="noopener">佳能人像摄影专业技巧</a>` : '';
  $('#lesson-goals').innerHTML = st.goals.map((g, i) => `<li class="${g.done ? 'done' : i === st.next ? 'next' : ''}">${g.text}</li>`).join('');
  $('#lesson-done').classList.toggle('hidden', !st.complete);
  if (st.complete && !renderLesson.celebrated) { renderLesson.celebrated = true; guide.log('system', `课程「${st.title}」完成，用时 ${Math.round((st.completedAt - st.startedAt) / 1000)} 秒。`); }
}
lessons.subscribe(renderLesson);
$('#lesson-start').addEventListener('click', () => { $('#lesson-block').open = true; renderLesson.celebrated = false; const st = lessons.start($('#lesson-select').value); guide.log('system', `开始课程：${st.title}。目标：${st.goals.map(g => g.text).join('；')}`); });
$('#lesson-stop').addEventListener('click', () => { lessons.stop(); });
$('#lesson-target').addEventListener('click', () => { const st = lessons.status(); if (st && st.nextParts.length) stage.focus(st.nextParts); });
$('#lesson-hint').addEventListener('click', () => { const st = lessons.status(); if (!st) { guide.log('system', '先选一门课程并点击开始。'); return; } if (st.complete) { guide.log('system', '这门课已经完成了。'); return; } guide.ask(`我在练习「${st.title}」，卡在第 ${st.next + 1} 步「${st.goals[st.next].text}」。给我提示，告诉我该碰哪个部件、怎么操作，但不要替我完成。`, { part: active, lesson: st }); });
window.__twin.lessons = lessons;
$('#scene-select').innerHTML = Object.values(SCENES).map(sc => `<option value="${sc.id}">取景：${sc.name}</option>`).join('');
$('#scene-select').addEventListener('change', e => firmware.fw.setScene(e.target.value));
firmware.fw.subscribe((s, ev) => { if (ev === 'scene') $('#scene-select').value = s.scene; });
fetch('/api/health').then(r => r.json()).then(h => { const el = $('#llm-status'); el.textContent = h.configured ? `讲解员：${h.model}` : '讲解员：未配置 ANTHROPIC_API_KEY'; el.classList.add(h.configured ? 'ok' : 'bad'); }).catch(() => { $('#llm-status').textContent = '讲解员：服务未启动'; });

// part list, grouped by where the part sits on the body
const SIDE_LABELS = { top: '顶部', front: '正面', back: '背面', left: '左侧（端子）', right: '右侧（卡槽）', bottom: '底部', lens: '镜头', all: '整体' };
const SIDE_ORDER = ['top', 'front', 'back', 'left', 'right', 'bottom', 'lens', 'all'];
const list = $('#part-list'); let active = null; const collapsed = new Set();
function renderList(filter = '') {
  const q = filter.trim().toLowerCase();
  const match = p => !q || p.name.includes(q) || p.en.toLowerCase().includes(q) || p.id.includes(q) || (p.description || '').includes(q);
  const groups = SIDE_ORDER.map(side => ({ side, items: data.parts.filter(p => p.side === side && match(p)) })).filter(g => g.items.length);
  list.innerHTML = groups.map(g => `<div class="group ${!q && collapsed.has(g.side) ? 'collapsed' : ''}" data-side="${g.side}"><div class="group-head"><span>${SIDE_LABELS[g.side] || g.side}</span><span class="n">${g.items.length}</span></div>` +
    g.items.map(p => `<li data-id="${p.id}" class="${p.id === active ? 'active' : ''} ${INTERACTIVE.has(p.id) ? 'interactive' : ''}" title="${INTERACTIVE.has(p.id) ? '可操作' : ''}"><span>${p.name}</span><span class="io"></span></li>`).join('') + '</div>').join('');
  $('#part-count').textContent = q ? `${groups.reduce((n, g) => n + g.items.length, 0)} 个匹配` : `${data.parts.length} 个部件 · 绿点可操作`;
}
renderList(); $('#part-filter').addEventListener('input', e => renderList(e.target.value));
list.addEventListener('click', e => { const head = e.target.closest('.group-head'); if (head) { const side = head.parentElement.dataset.side; collapsed.has(side) ? collapsed.delete(side) : collapsed.add(side); renderList($('#part-filter').value); return; } const li = e.target.closest('li'); if (li) select(li.dataset.id); });
list.addEventListener('mouseover', e => { const li = e.target.closest('li'); if (li && li.dataset.id !== active) stage.highlight([li.dataset.id, ...(active ? [active] : [])]); });
list.addEventListener('mouseleave', () => stage.highlight(active ? [active] : []));
function showCard(id, fly) {
  const p = partsById.get(id); const card = $('#part-card'); if (!p) { card.classList.add('hidden'); stage.highlight([]); return; }
  card.classList.remove('hidden'); $('#part-card-title').textContent = `${p.name} · ${p.en}`; $('#part-card-side').textContent = SIDE_LABELS[p.side] || p.side;
  $('#part-card-desc').textContent = p.description + (p.howto ? ' ' + p.howto : '') + (firmware.DIALS[id] ? '（可操作：左右拖动或滚轮）' : INTERACTIVE.has(id) ? '（可操作：点击）' : '');
  stage.highlight([id]); if (fly) stage.focus([id]);
  document.querySelector('#part-list li.active')?.classList.remove('active'); document.querySelector(`#part-list li[data-id="${id}"]`)?.classList.add('active');
  document.querySelector(`#part-list li[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
}
function select(id) { active = id; showCard(id, true); }
$('#part-card-close').addEventListener('click', () => { active = null; showCard(null); document.querySelector('#part-list li.active')?.classList.remove('active'); });
$('#locate-part').addEventListener('click', () => { if (active) stage.focus([active]); });
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.key === '?' ) { toggleHelp(true); return; }
  const fw = firmware.fw; const map = { p: () => fw.togglePower(), m: () => fw.press('menu_button'), i: () => fw.press('info_button'), q: () => fw.press('q_button'), ' ': () => fw.press('shutter_button'), Enter: () => fw.press('set_button'), ArrowLeft: () => fw.mainDial(-1), ArrowRight: () => fw.mainDial(1), ArrowUp: () => fw.quickDial1(-1), ArrowDown: () => fw.quickDial1(1), '[': () => fw.quickDial2(-1), ']': () => fw.quickDial2(1), ',': () => fw.turnMode(-1), '.': () => fw.turnMode(1), v: () => fw.press('movie_button'), s: () => fw.setStillMovie(fw.state.stillMovie === 'still' ? 'movie' : 'still'), r: () => fw.press('rate_button'), a: () => fw.press('af_on_button'), l: () => fw.press('ae_lock_button'), z: () => fw.press('magnify_button'), Backspace: () => fw.press('erase_button'), Escape: () => { if (!$('#help').classList.contains('hidden')) toggleHelp(false); else fw.press('menu_button'); } };
  if (map[e.key]) { e.preventDefault(); map[e.key](); }
});
$('#ask-part').addEventListener('click', () => { const p = partsById.get(active); if (p) guide.ask(`${p.name}是做什么的？怎么用？`, { part: active }); });
let downAt = null, drag = null;
$('#stage').addEventListener('pointerdown', e => {
  downAt = [e.clientX, e.clientY];
  const hit = stage.pickHit(e.clientX, e.clientY); if (!hit) return;
  if (firmware.DIALS[hit.id]) { drag = { id: hit.id, x: e.clientX, acc: 0 }; stage.controls.enabled = false; $('#stage').setPointerCapture(e.pointerId); }
  else if (hit.id === 'shutter_button') { firmware.fw.halfPress(); flashHint('半按快门：对焦'); }
});
$('#stage').addEventListener('pointermove', e => {
  if (!drag) return; drag.acc += e.clientX - drag.x; drag.x = e.clientX;
  while (Math.abs(drag.acc) >= 28) { const d = Math.sign(drag.acc); drag.acc -= d * 28; firmware.wheel(drag.id, d); drag.moved = true; flashHint(drag.id); }
});
const endDrag = e => { if (drag) { stage.controls.enabled = true; try { $('#stage').releasePointerCapture(e.pointerId); } catch {} } };
$('#stage').addEventListener('pointerup', endDrag); $('#stage').addEventListener('pointercancel', endDrag);
$('#stage').addEventListener('click', e => {
  if (drag) { const moved = drag.moved; drag = null; if (moved) return; }
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return; // was a drag
  const hit = stage.pickHit(e.clientX, e.clientY); if (!hit) return; const id = hit.id;
  if (id === 'screen' && firmware.touch(hit)) { flashHint('触摸屏'); return; }
  if (INTERACTIVE.has(id) && firmware.click(id, { shift: e.shiftKey })) { flashHint(id); if (active !== id) { active = id; showCard(id, false); } return; }
  select(id);
});
$('#stage').addEventListener('wheel', e => { const id = stage.pick(e.clientX, e.clientY); if (id && firmware.wheel(id, e.deltaY)) { e.preventDefault(); e.stopImmediatePropagation(); flashHint(id); } }, { capture: true, passive: false });
$('#stage').addEventListener('pointermove', e => {
  if (drag) return; const id = stage.pick(e.clientX, e.clientY); $('#stage').style.cursor = id && INTERACTIVE.has(id) ? (firmware.DIALS[id] ? 'ew-resize' : 'pointer') : 'grab';
  const tip = $('#tip'); const p = id && partsById.get(id);
  if (p && e.pointerType !== 'touch') { const r = $('#stage').getBoundingClientRect(); tip.textContent = p.name + (id === 'power_switch' ? ' · 点击开/关，Shift 点击锁定' : firmware.DIALS[id] ? ' · 拖动/滚轮' : INTERACTIVE.has(id) ? ' · 点击' : ''); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.remove('hidden'); } else tip.classList.add('hidden');
});
$('#stage').addEventListener('pointerleave', () => $('#tip').classList.add('hidden'));
function flashHint(id) { const p = partsById.get(id); const el = $('#fw-hint'); el.textContent = p ? p.name : id; el.classList.remove('hidden'); clearTimeout(flashHint.t); flashHint.t = setTimeout(() => el.classList.add('hidden'), 1200); }
document.querySelectorAll('.viewbar [data-view]').forEach(b => b.addEventListener('click', () => { stage.setView(b.dataset.view); document.querySelectorAll('.viewbar [data-view]').forEach(x => x.classList.toggle('active', x === b)); }));
$('#show-all').addEventListener('click', () => { guide.reset(); document.querySelectorAll('.viewbar [data-view]').forEach(x => x.classList.toggle('active', x.dataset.view === 'overview')); });
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); guide.ask($('#chat-input').value, { part: active }); });
// Enter sends, Shift+Enter inserts a newline. Enter that confirms an IME candidate (composing / keyCode 229) must not send.
let composing = false;
$('#chat-input').addEventListener('compositionstart', () => { composing = true; });
$('#chat-input').addEventListener('compositionend', () => { setTimeout(() => { composing = false; }, 0); });
$('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { if (e.isComposing || composing || e.keyCode === 229) return; e.preventDefault(); $('#chat-form').requestSubmit(); } });
// power button + onboarding
const powerBtn = $('#power-btn');
function syncPowerUI(st) { const on = st.power !== 'off'; powerBtn.classList.toggle('on', on); powerBtn.lastChild.textContent = on ? (st.power === 'lock' ? '已锁定' : '已开机') : '开机'; $('#onboard').classList.toggle('hidden', on || syncPowerUI.dismissed); }
powerBtn.addEventListener('click', () => firmware.fw.togglePower());
firmware.fw.subscribe(st => syncPowerUI(st)); syncPowerUI(firmware.fw.state);
$('#onboard').addEventListener('click', () => { syncPowerUI.dismissed = true; $('#onboard').classList.add('hidden'); });
// chat empty state chips and clear
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => guide.ask(c.dataset.q, { part: active })));
const chatEmpty = $('#chat-empty');
new MutationObserver(() => { chatEmpty.classList.toggle('hidden', $('#chat-log').querySelectorAll('.msg').length > 0); }).observe($('#chat-log'), { childList: true });
$('#chat-clear').addEventListener('click', () => { guide.history.length = 0; $('#chat-log').querySelectorAll('.msg').forEach(m => m.remove()); guide.reset(); });
// help modal
function toggleHelp(show) { $('#help').classList.toggle('hidden', !show); }
$('#help-btn').addEventListener('click', () => toggleHelp(true)); $('#help-close').addEventListener('click', () => toggleHelp(false));
$('#help').addEventListener('click', e => { if (e.target === $('#help')) toggleHelp(false); });
// narrow-screen tabs
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => { document.querySelector('.layout').dataset.active = b.dataset.target; document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('active', x === b)); window.dispatchEvent(new Event('resize')); }));
document.querySelector('.layout').dataset.active = 'stage';

// real-photo acceptance: read EXIF, run the lesson's exif rules, optionally ask the guide to review
let lastPhoto = null;
async function checkPhoto(file) {
  const st = lessons.status(); if (!st || !st.exif) return;
  try {
    const info = await readShootingInfo(file); lastPhoto = { info, results: st.exif.map(r => ({ text: r.text, ok: !!r.check(info) })) };
    $('#photo-summary').textContent = exifSummary(info);
    $('#photo-goals').innerHTML = lastPhoto.results.map(r => `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✗'} ${r.text}</li>`).join('');
    $('#photo-result').classList.remove('hidden');
    const passed = lastPhoto.results.filter(r => r.ok).length; guide.log('system', `真机照片验收：${passed}/${lastPhoto.results.length} 项通过。`);
  } catch (e) { $('#photo-summary').textContent = '读取失败：' + e.message; $('#photo-goals').innerHTML = ''; $('#photo-result').classList.remove('hidden'); }
}
$('#photo-input').addEventListener('change', e => { if (e.target.files[0]) checkPhoto(e.target.files[0]); e.target.value = ''; });
const pc = $('#photo-check');
pc.addEventListener('dragover', e => { e.preventDefault(); pc.classList.add('dragover'); }); pc.addEventListener('dragleave', () => pc.classList.remove('dragover'));
pc.addEventListener('drop', e => { e.preventDefault(); pc.classList.remove('dragover'); const f = e.dataTransfer.files[0]; if (f) checkPhoto(f); });
$('#photo-review').addEventListener('click', () => { const st = lessons.status(); if (!lastPhoto || !st) return; guide.ask(`我用真机练习「${st.title}」拍了一张，EXIF 是：${exifSummary(lastPhoto.info)}。验收结果：${lastPhoto.results.map(r => (r.ok ? '✓' : '✗') + r.text).join('，')}。请点评设置是否符合教程要点，不符合的告诉我该怎么调。`, { part: active, lesson: st }); });

// parts column: hidden by default (clicking the model does the same job); remembered per browser
const layoutEl = document.querySelector('.layout');
function setPartsCollapsed(v) { layoutEl.classList.toggle('parts-collapsed', v); $('#parts-toggle').classList.toggle('active', !v); try { localStorage.setItem('twin.partsCollapsed', v ? '1' : '0'); } catch {} window.dispatchEvent(new Event('resize')); }
let partsCollapsed = true; try { partsCollapsed = localStorage.getItem('twin.partsCollapsed') !== '0'; } catch {}
setPartsCollapsed(partsCollapsed);
$('#parts-toggle').addEventListener('click', () => setPartsCollapsed(!layoutEl.classList.contains('parts-collapsed')));
// searching from the part card or lesson opens the list when needed
$('#lesson-block').addEventListener('toggle', () => window.dispatchEvent(new Event('resize')));

// floating LCD on the stage: collapsible
$('#lcd-toggle').addEventListener('click', () => { const f = $('#lcd-float'); const c = f.classList.toggle('collapsed'); $('#lcd-toggle').textContent = c ? '+' : '–'; });
