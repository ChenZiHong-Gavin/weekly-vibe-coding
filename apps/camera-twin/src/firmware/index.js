// Binds the firmware to the 3D model: LCD/EVF textures, dial & switch poses, and physical interaction on the canvas.
import * as THREE from 'three';
import { createFirmware, MODES } from './state.js';
import { createScreenRenderer } from './screen.js';

const DIALS = { main_dial: 'mainDial', quick_control_dial_1: 'quickDial1', quick_control_dial_2: 'quickDial2', mode_dial: 'turnMode' };
const BUTTONS = new Set(['menu_button', 'info_button', 'q_button', 'playback_button', 'set_button', 'af_on_button', 'shutter_button', 'erase_button', 'ae_lock_button', 'magnify_button', 'movie_button', 'rate_button', 'af_point_button']);
const MECHANICAL = { screen: 'screen_open', card_slot_cover: 'card_door_open', card_slot_1: 'card_door_open', card_slot_2: 'card_door_open', lens_release_button: 'lens_attached', battery_cover: 'battery_cover_open', battery_cover_lock: 'battery_cover_open', battery: 'battery_cover_open', lens_af_mf_switch: 'lens_af_mf', lens_is_switch: 'lens_is', lens_zoom_ring: 'lens_zoom' };
export const INTERACTIVE = new Set([...Object.keys(DIALS), ...BUTTONS, 'power_switch', 'still_movie_switch', 'multi_controller', ...Object.keys(MECHANICAL)]);

export function attachFirmware({ stage, root, lcdPreview, onEvent }) {
  const fw = createFirmware();
  const screenCanvas = document.createElement('canvas');
  const renderer = createScreenRenderer(screenCanvas, fw);
  const texture = new THREE.CanvasTexture(screenCanvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const lit = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const previewCtx = lcdPreview?.getContext('2d'); if (lcdPreview) { lcdPreview.width = screenCanvas.width; lcdPreview.height = screenCanvas.height; }

  // Find the display surfaces: the widest thin pad inside `screen`, and the optical pad inside `viewfinder`.
  const surface = (partId, pick) => { const p = root.getObjectByName(partId); if (!p) return null; let best = null; p.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); const s = o.geometry.boundingBox.getSize(new THREE.Vector3()); if (pick(s, best)) best = { mesh: o, size: s }; } }); return best?.mesh || null; };
  const lcd = surface('screen', (s, b) => s.z < 0.2 && s.x > 5 && (!b || s.x < b.size.x));
  const evf = surface('viewfinder', (s, b) => s.z < 0.2 && s.x > 1.5 && (!b || s.x < b.size.x));
  const originals = new Map(); for (const m of [lcd, evf]) if (m) { originals.set(m, m.material); planarUV(m); }
  // Extruded pads carry shape-space UVs; remap the front face to 0..1 so the LCD picture fills it exactly once.
  function planarUV(m) {
    const g = m.geometry = m.geometry.clone(); g.computeBoundingBox(); const bb = g.boundingBox, pos = g.attributes.position, uv = g.attributes.uv;
    const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / w, (pos.getY(i) - bb.min.y) / h);
    uv.needsUpdate = true;
  }
  // Texture orientation: the leaf's front face points +Z in the closed pose; flip horizontally if the model shows it mirrored.
  function applyDisplays() {
    const on = fw.state.power !== 'off';
    for (const m of [lcd, evf]) { if (!m) continue; m.material = on ? lit : originals.get(m); }
  }
  const controls = root.userData.controls || {};
  // The power lever is tiny and sits on the rim of quick control dial 2, so clicks land on the dial.
  // Give the lever an enlarged transparent hit box that rotates with it.
  (function addPowerHitBox() {
    const sw = root.getObjectByName('power_switch'); if (!sw) return;
    const box = new THREE.Box3(); let found = false;
    sw.updateWorldMatrix(true, true);
    sw.traverse(m => { if (!m.isMesh) return; m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); const size = b.getSize(new THREE.Vector3()); if (Math.max(size.x, size.z) < 1.6) { box.union(b); found = true; } });
    if (!found) return;
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(size.x, 0.6) * 2.2, Math.max(size.y, 0.3) * 3, Math.max(size.z, 0.6) * 2.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.name = 'power_switch_hit'; hit.castShadow = hit.receiveShadow = false;
    sw.worldToLocal(center); hit.position.copy(center); hit.quaternion.copy(sw.getWorldQuaternion(new THREE.Quaternion()).invert()); sw.add(hit);
  })();
  const dialParts = Object.fromEntries(Object.keys(DIALS).map(id => [id, root.getObjectByName(id)]));
  let modeAngleBase = null;
  function syncPose() {
    const s = fw.state;
    controls.power?.(s.power === 'off' ? 0 : s.power === 'on' ? 0.5 : 1);
    controls.mode_dial?.(s.modeIndex / (MODES.length - 1));
    controls.still_movie?.(s.stillMovie === 'movie' ? 1 : 0);
  }
  function nudge(partId, delta) { const p = dialParts[partId]; if (!p || partId === 'mode_dial') return; p.rotation.y += delta * 0.35; stage.invalidate?.(); }
  function redraw() { renderer.draw(); texture.needsUpdate = true; if (previewCtx) previewCtx.drawImage(screenCanvas, 0, 0); stage.invalidate?.(); }
  fw.subscribe((s, ev) => { applyDisplays(); syncPose(); redraw(); stage.invalidate?.(); onEvent?.(ev, fw); });
  // toasts expire on their own; keep the texture fresh at a low rate
  renderer.onPhotoLoaded(() => redraw());
  setInterval(() => { if (fw.state.toast || fw.state.recording || fw.state.timer || (fw.state.screen === 'shoot' && fw.afTargets().servo)) redraw(); }, fw.afTargets ? 120 : 250);

  // Mechanical controls are toggled with a short tween so the motion reads as a hinge, not a jump.
  const mech = {}; // name -> current value
  const defaults = { lens_attached: 1 };
  function tweenControl(name, to, ms = 450) {
    const fn = controls[name]; if (!fn) return false;
    const from = mech[name] ?? defaults[name] ?? 0, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); const v = from + (to - from) * e; mech[name] = v; fn(v); stage.invalidate?.(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); return true;
  }
  function toggleMechanical(partId) {
    const name = MECHANICAL[partId]; if (!name || !controls[name]) return false;
    const cur = mech[name] ?? defaults[name] ?? 0, to = cur > 0.5 ? 0 : 1;
    if (name === 'lens_af_mf') fw.setSetting('对焦模式', to ? 'MF' : 'AF');
    if (name === 'lens_is') fw.setSetting('影像稳定器模式', to ? '开' : '关');
    if (name === 'lens_attached') fw.state.lensAttached = to === 1;
    tweenControl(name, to); return true;
  }
  /** Touch on the 3D LCD: map the hit UV to menu rows, tabs, quick items. Returns true if consumed. */
  function touch(hit) {
    if (!hit || hit.object !== lcd || !hit.uv || fw.state.power === 'off') return false;
    const x = hit.uv.x * 960, y = (1 - hit.uv.y) * 640, st = fw.state;
    if (st.dialog) { const n = st.dialog.options.length, total = n * 200 + (n - 1) * 24, bx = 480 - total / 2; const i = Math.floor((x - bx) / 224); if (i >= 0 && i < n && y > 300 && y < 380) { st.dialog.index = i; fw.press('set_button'); } return true; }
    if (st.screen === 'menu') {
      if (st.menu.editing) { const e = st.menu.editing; const visible = Math.min(e.options.length, 8), h = 60 + visible * 54 + 16, y0 = Math.max(70, (640 - h) / 2), start = Math.max(0, Math.min(e.index - 3, e.options.length - visible)); const k = Math.floor((y - y0 - 60) / 54); if (k >= 0 && k < visible) { e.index = start + k; fw.press('set_button'); } return true; }
      if (y < 64) { const tab = Math.floor(x / 120); if (tab !== st.menu.tab) { st.menu.tab = tab; st.menu.page = 0; st.menu.item = 0; fw.press('info_button'); fw.press('info_button'); } return true; } // info toggles are no-ops in menu; used to emit
      if (y < 110) { fw.quickDial2(x > 480 ? 1 : -1); return true; }
      const row = Math.floor((y - 118) / 58); const n = fw.menuView().items.length; if (row >= 0 && row < n) { st.menu.item = row; fw.press('set_button'); } return true;
    }
    if (st.screen === 'quick') { if (y >= 70 && y < 290) { const i = Math.floor((x - 20) / 184) + Math.floor((y - 70) / 110) * 5; if (i >= 0 && i < 10) { st.quick.item = i; st.quick.editing = true; fw.press('info_button'); fw.press('info_button'); } } return true; }
    if (st.screen === 'shoot') { if (y > 564 && x < 100) fw.press('q_button'); else fw.halfPress(); return true; }
    if (st.screen === 'playback') { fw.playbackJump(x > 480 ? 1 : -1); return true; }
    return false;
  }
  /** Handle a click on a part id. Returns true if the firmware consumed it. */
  function click(partId, { shift } = {}) {
    if (MECHANICAL[partId] && toggleMechanical(partId)) return true;
    if (partId === 'power_switch') { if (shift) fw.setPower(fw.state.power === 'lock' ? 'on' : 'lock'); else fw.setPower(fw.state.power === 'off' ? 'on' : 'off'); return true; }
    if (partId === 'still_movie_switch') { fw.setStillMovie(fw.state.stillMovie === 'still' ? 'movie' : 'still'); return true; }
    if (partId === 'multi_controller') { fw.press('set_button'); return true; }
    if (DIALS[partId]) { const d = shift ? -1 : 1; fw[DIALS[partId]](d); nudge(partId, d); return true; }
    if (BUTTONS.has(partId)) { fw.press(partId); pressAnim(partId); return true; }
    return false;
  }
  /** Handle a wheel event over a part id. Returns true if consumed. */
  function wheel(partId, deltaY) { if (!DIALS[partId]) return false; const d = deltaY > 0 ? 1 : -1; fw[DIALS[partId]](d); nudge(partId, d); return true; }
  function pressAnim(partId) { const p = root.getObjectByName(partId); if (!p) return; const cap = p.children[1]; if (!cap) return; const y = cap.position.y; cap.position.y = y - 0.06; stage.invalidate?.(); setTimeout(() => { cap.position.y = y; stage.invalidate?.(); }, 120); }

  applyDisplays(); syncPose(); redraw();
  return { fw, click, wheel, touch, redraw, tweenControl, mech, lcdMesh: lcd, evfMesh: evf, DIALS };
}
