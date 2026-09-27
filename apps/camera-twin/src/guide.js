import { validatePlan } from './guide-contract.js';

/** Chat panel + step executor. `stage` is the object from createScene. */
export function createGuide({ stage, firmware, lessons, partsById, modelSource, els }) {
  const history = []; let running = null, currentPlan = null;
  const log = (role, text) => { const d = document.createElement('div'); d.className = 'msg ' + role; d.textContent = text; els.log.appendChild(d); els.log.scrollTop = els.log.scrollHeight; return d; };

  async function ask(question, context = {}) {
    if (!question.trim()) return;
    log('user', question); els.input.value = ''; els.send.disabled = true; const pending = log('system', '讲解员思考中…');
    history.push({ role: 'user', content: question });
    try {
      const res = await fetch('/api/guide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12), modelSource, context: { ...context, camera: firmware?.fw.snapshot(), lesson: lessons?.status() || undefined } }) });
      const data = await res.json(); pending.remove();
      if (!res.ok) { history.pop(); log('error', data.error || '请求失败'); return; }
      const plan = validatePlan(data.plan);
      history.push({ role: 'assistant', content: plan.answer + (plan.steps.length ? `\n[演示 ${plan.steps.length} 步：${plan.steps.map(s => s.caption).join('；')}]` : '') });
      log('guide', plan.answer);
      if (plan.steps.length) await play(plan);
    } catch (e) { pending.remove(); history.pop(); log('error', '讲解失败：' + e.message); }
    finally { els.send.disabled = false; }
  }
  function renderSteps(plan, idx) {
    els.steps.classList.toggle('hidden', !plan); if (!plan) return;
    els.steps.innerHTML = '<ol>' + plan.steps.map((s, i) => `<li class="${i === idx ? 'current' : ''}" data-i="${i}">${escapeHtml(s.caption)}</li>`).join('') + '</ol>';
    els.steps.querySelectorAll('li').forEach(li => li.onclick = () => runStep(plan.steps[+li.dataset.i], +li.dataset.i, plan));
  }
  function runStep(step, i, plan) {
    renderSteps(plan, i);
    if (step.visibility === 'all') stage.isolate(null); else if (step.visibility === 'only') stage.isolate(step.parts);
    if (step.control) stage.control(step.control.name, step.control.value);
    if (step.firmware && firmware) runFirmware(step.firmware);
    stage.highlight(step.parts);
    if (step.focus) stage.focus(step.parts, step.view); else stage.setView(step.view);
  }
  function runFirmware({ action, value }) {
    const fw = firmware.fw, n = Number(value);
    const ops = { power_on: () => fw.setPower('on'), power_off: () => fw.setPower('off'), power_lock: () => fw.setPower('lock'), set_mode: () => fw.setMode(value), set_aperture: () => fw.setAperture(value), set_shutter: () => fw.setShutter(value), set_iso: () => fw.setIso(value), set_ec: () => fw.setEc(value), press: () => fw.press(value), main_dial: () => fw.mainDial(n || 1), quick_dial_1: () => fw.quickDial1(n || 1), quick_dial_2: () => fw.quickDial2(n || 1), still_movie: () => fw.setStillMovie(value), set_setting: () => { const [k, v] = String(value).split('='); fw.setSetting(k?.trim(), v?.trim()); }, start_lesson: () => { const st = lessons?.start(value); if (st) log('system', `开始课程：${st.title}`); } };
    ops[action]?.();
  }
  async function play(plan) {
    stop(); currentPlan = plan; const token = running = {};
    for (let i = 0; i < plan.steps.length; i++) { if (running !== token) return; runStep(plan.steps[i], i, plan); await sleep(Math.max(2200, 900 + plan.steps[i].caption.length * 60)); }
    if (running === token) running = null;
  }
  function stop() { running = null; }
  function reset() { stop(); currentPlan = null; renderSteps(null); stage.isolate(null); stage.highlight([]); stage.setView('overview'); }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return { ask, stop, reset, log, get history() { return history; } };
}
