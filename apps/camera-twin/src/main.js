import { createScene } from './scene.js';
import { loadCamera } from './model/index.js';
import { createGuide } from './guide.js';
import data from './parts.json' with { type: 'json' };
import { attachFirmware, INTERACTIVE } from './firmware/index.js';
import { createLessonRunner } from './firmware/lessons.js';
import { SCENES } from './firmware/scenes.js';
import { createTracker } from './tracker.js';

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
  $('#lesson-body').classList.toggle('hidden', !st); if (!st) return;
  $('#lesson-intro').textContent = st.intro; $('#lesson-source').innerHTML = st.source ? `来源：<a href="${st.source}" target="_blank" rel="noopener">佳能人像摄影专业技巧</a>` : '';
  $('#lesson-goals').innerHTML = st.goals.map((g, i) => `<li class="${g.done ? 'done' : i === st.next ? 'next' : ''}">${g.text}</li>`).join('');
  $('#lesson-done').classList.toggle('hidden', !st.complete);
  if (st.complete && !renderLesson.celebrated) { renderLesson.celebrated = true; guide.log('system', `课程「${st.title}」完成，用时 ${Math.round((st.completedAt - st.startedAt) / 1000)} 秒。`); }
}
lessons.subscribe(renderLesson);
$('#lesson-start').addEventListener('click', () => { renderLesson.celebrated = false; const st = lessons.start($('#lesson-select').value); guide.log('system', `开始课程：${st.title}。目标：${st.goals.map(g => g.text).join('；')}`); });
$('#lesson-stop').addEventListener('click', () => { lessons.stop(); });
$('#lesson-hint').addEventListener('click', () => { const st = lessons.status(); if (!st) { guide.log('system', '先选一门课程并点击开始。'); return; } if (st.complete) { guide.log('system', '这门课已经完成了。'); return; } guide.ask(`我在练习「${st.title}」，卡在第 ${st.next + 1} 步「${st.goals[st.next].text}」。给我提示，告诉我该碰哪个部件、怎么操作，但不要替我完成。`, { part: active, lesson: st }); });
window.__twin.lessons = lessons;
$('#scene-select').innerHTML = Object.values(SCENES).map(sc => `<option value="${sc.id}">取景：${sc.name}</option>`).join('');
$('#scene-select').addEventListener('change', e => firmware.fw.setScene(e.target.value));
firmware.fw.subscribe((s, ev) => { if (ev === 'scene') $('#scene-select').value = s.scene; });
fetch('/api/health').then(r => r.json()).then(h => { const el = $('#llm-status'); el.textContent = h.configured ? `讲解员：${h.model}` : '讲解员：未配置 ANTHROPIC_API_KEY'; el.classList.add(h.configured ? 'ok' : 'bad'); }).catch(() => { $('#llm-status').textContent = '讲解员：服务未启动'; });

// part list
const list = $('#part-list'); let active = null;
function renderList(filter = '') {
  const q = filter.trim().toLowerCase();
  list.innerHTML = data.parts.filter(p => !q || p.name.includes(q) || p.en.toLowerCase().includes(q) || p.id.includes(q)).map(p => `<li data-id="${p.id}" class="${p.id === active ? 'active' : ''}"><span>${p.name}</span><small>${p.side}</small></li>`).join('');
}
renderList(); $('#part-filter').addEventListener('input', e => renderList(e.target.value));
list.addEventListener('click', e => { const li = e.target.closest('li'); if (li) select(li.dataset.id); });
function showCard(id, fly) {
  const p = partsById.get(id); const card = $('#part-card'); if (!p) { card.classList.add('hidden'); stage.highlight([]); return; }
  card.classList.remove('hidden'); $('#part-card-title').textContent = `${p.name} · ${p.en}`;
  $('#part-card-desc').textContent = p.description + (p.howto ? ' ' + p.howto : '') + (firmware.DIALS[id] ? '（可操作：左右拖动或滚轮）' : INTERACTIVE.has(id) ? '（可操作：点击）' : '');
  stage.highlight([id]); if (fly) stage.focus([id]);
}
function select(id) { active = id; renderList($('#part-filter').value); showCard(id, true); }
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  const fw = firmware.fw; const map = { p: () => fw.togglePower(), m: () => fw.press('menu_button'), i: () => fw.press('info_button'), q: () => fw.press('q_button'), ' ': () => fw.press('shutter_button'), Enter: () => fw.press('set_button'), ArrowLeft: () => fw.mainDial(-1), ArrowRight: () => fw.mainDial(1), ArrowUp: () => fw.quickDial1(-1), ArrowDown: () => fw.quickDial1(1), '[': () => fw.quickDial2(-1), ']': () => fw.quickDial2(1), ',': () => fw.turnMode(-1), '.': () => fw.turnMode(1), v: () => fw.press('movie_button'), s: () => fw.setStillMovie(fw.state.stillMovie === 'still' ? 'movie' : 'still'), r: () => fw.press('rate_button'), a: () => fw.press('af_on_button'), l: () => fw.press('ae_lock_button'), z: () => fw.press('magnify_button'), Backspace: () => fw.press('erase_button'), Escape: () => fw.press('menu_button') };
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
  if (INTERACTIVE.has(id) && firmware.click(id, { shift: e.shiftKey })) { flashHint(id); if (active !== id) { active = id; renderList($('#part-filter').value); showCard(id, false); } return; }
  select(id);
});
$('#stage').addEventListener('wheel', e => { const id = stage.pick(e.clientX, e.clientY); if (id && firmware.wheel(id, e.deltaY)) { e.preventDefault(); e.stopImmediatePropagation(); flashHint(id); } }, { capture: true, passive: false });
$('#stage').addEventListener('pointermove', e => { if (drag) return; const id = stage.pick(e.clientX, e.clientY); $('#stage').style.cursor = id && INTERACTIVE.has(id) ? (firmware.DIALS[id] ? 'ew-resize' : 'pointer') : 'grab'; });
function flashHint(id) { const p = partsById.get(id); const el = $('#fw-hint'); el.textContent = p ? p.name : id; el.classList.remove('hidden'); clearTimeout(flashHint.t); flashHint.t = setTimeout(() => el.classList.add('hidden'), 1200); }
document.querySelectorAll('.viewbar [data-view]').forEach(b => b.addEventListener('click', () => stage.setView(b.dataset.view)));
$('#show-all').addEventListener('click', () => guide.reset());
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); guide.ask($('#chat-input').value, { part: active }); });
$('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chat-form').requestSubmit(); } });
$('#stop').addEventListener('click', () => guide.stop());
guide.log('system', '点击电源开关开机，滚轮转动模式转盘和拨盘，点击按钮操作。键盘：P 电源，逗号/句号 模式，左右 主拨盘，上下 速控转盘1，[ ] 速控转盘2，M 菜单，I INFO，Q 速控，空格 快门，回车 SET，S 照片/短片，V 录像，A AF-ON，L 曝光锁，Z 放大，R 评分，退格 删除。');

// real-camera sync
const tracker = createTracker({ stage, els: { preview: $('#tracker-preview') }, onStatus: (text, ok) => { const el = $('#tracker-status'); el.textContent = text; el.style.color = ok ? '#8fd6a3' : '#cfcac0'; } });
$('#tracker-start').addEventListener('click', async () => { try { tracker.setMarkerSize(+$('#tracker-size').value || 40); await tracker.start($('#tracker-mode').value); $('#tracker-preview').classList.remove('hidden'); } catch (e) { $('#tracker-status').textContent = '无法启动：' + e.message; } });
$('#tracker-flip').addEventListener('click', () => tracker.flip());
$('#tracker-align').addEventListener('click', () => tracker.align());
$('#tracker-stop').addEventListener('click', () => { tracker.stop(); $('#tracker-preview').classList.add('hidden'); });
$('#tracker-print').addEventListener('click', () => { tracker.setMarkerSize(+$('#tracker-size').value || 40); tracker.printMarkers(); });
$('#tracker-size').addEventListener('change', e => tracker.setMarkerSize(+e.target.value || 40));
window.__twin.tracker = tracker;
