import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { validatePlan, guideTool, describeCamera } from '../src/guide-contract.js';
import { validateCamera, REQUIRED_PART_IDS } from '../src/model/contract.js';
import { buildCamera as buildPlaceholder } from '../src/model/placeholder.js';
import * as real from '../src/model/r6iii.js';
import parts from '../src/parts.json' with { type: 'json' };
import { createFirmware, MODES } from '../src/firmware/state.js';

test('parts.json ids are unique and have Chinese names', () => {
  const ids = parts.parts.map(p => p.id); assert.equal(new Set(ids).size, ids.length);
  for (const p of parts.parts) { assert.ok(p.name && p.en && p.description, p.id); assert.match(p.id, /^[a-z0-9_]+$/); }
});
test('placeholder satisfies the model contract', () => {
  const r = validateCamera(buildPlaceholder(THREE), THREE);
  assert.deepEqual(r.missing, []); assert.deepEqual(r.sizeIssues, []); assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.controls.includes('mode_dial'));
});
test('real builder, once implemented, satisfies the model contract', { skip: !real.IMPLEMENTED && 'src/model/r6iii.js 尚未实现' }, () => {
  const r = validateCamera(real.buildCamera(THREE), THREE); assert.ok(r.ok, JSON.stringify(r));
});
test('validatePlan accepts a good plan and rejects bad ones', () => {
  const ok = validatePlan({ answer: '好', steps: [{ caption: '看卡槽', parts: ['card_slot_1'], focus: true, visibility: 'keep', view: 'right', control: { name: 'card_door_open', value: 1 } }] });
  assert.equal(ok.steps[0].control.name, 'card_door_open');
  assert.throws(() => validatePlan({ answer: '', steps: [] }));
  assert.throws(() => validatePlan({ answer: 'x', steps: [{ caption: 'y', parts: ['nope'] }] }));
  assert.throws(() => validatePlan({ answer: 'x', steps: [{ caption: 'y', parts: [], focus: true }] }));
  assert.throws(() => validatePlan({ answer: 'x', steps: [{ caption: 'y', control: { name: 'mode_dial', value: 2 } }] }));
});
test('guide tool enumerates every part id', () => {
  const t = guideTool(); assert.equal(t.name, 'present_camera'); assert.ok(t.strict);
  assert.deepEqual(t.input_schema.properties.steps.items.properties.parts.items.enum, parts.parts.map(p => p.id));
  assert.equal(describeCamera('placeholder').parts.length, parts.parts.length); assert.ok(REQUIRED_PART_IDS.length > 40);
});

test('validatePlan accepts firmware steps and rejects unknown actions', () => {
  const ok = validatePlan({ answer: '开机', steps: [{ caption: '拨开关', parts: ['power_switch'], focus: true, firmware: { action: 'power_on', value: null } }, { caption: '换模式', firmware: { action: 'set_mode', value: 'Av' } }] });
  assert.equal(ok.steps[1].firmware.value, 'Av');
  assert.throws(() => validatePlan({ answer: 'x', steps: [{ caption: 'y', firmware: { action: 'format_card' } }] }));
});
test('firmware: power, dials and exposure behave like the manual says', () => {
  const fw = createFirmware();
  assert.equal(fw.display().power, 'off'); fw.mainDial(1); assert.equal(fw.state.aperture, 3, '关机时拨盘无效');
  fw.setPower('on'); assert.equal(fw.state.screen, 'shoot');
  fw.setMode('Av'); fw.mainDial(3); assert.equal(fw.display().aperture, '8.0'); assert.ok(fw.display().shutterAuto);
  fw.quickDial1(3); assert.equal(fw.display().ec, 3);
  fw.setMode('M'); fw.mainDial(-3); assert.equal(fw.display().shutter, '1/60'); fw.quickDial1(-1); assert.equal(fw.display().aperture, '7.1');
  fw.setPower('lock'); const before = fw.state.shutter; fw.mainDial(1); assert.equal(fw.state.shutter, before, 'LOCK 锁定主拨盘');
  fw.setPower('on'); fw.press('menu_button'); assert.equal(fw.state.screen, 'menu'); assert.equal(fw.menuView().pageName, '图像画质/大小'); fw.mainDial(1); assert.equal(fw.menuView().label, '自动对焦'); fw.quickDial2(1); assert.equal(fw.menuView().pageName, '被摄体检测'); fw.quickDial1(9); assert.equal(fw.menuView().selected, 2); fw.press('menu_button');
  fw.press('shutter_button'); assert.equal(fw.state.shots.length, 1); assert.equal(fw.display().remaining, 998);
  fw.setMode('A+'); fw.quickDial1(1); assert.equal(fw.display().ec, 3, '自动模式下不能改曝光补偿');
  assert.equal(MODES.length, 12);
});

test('menu.json mirrors the official manual: 8 tabs, secondary tabs, creative-zone marks', () => {
  const fw = createFirmware(); fw.setPower('on'); fw.press('menu_button');
  const v = fw.menuView(); assert.equal(v.tabs.length, 8); assert.deepEqual(v.tabs.map(t => t.label), ['拍摄', '自动对焦', '回放', '通信功能', '设置', '自定义控制', '自定义功能', '我的菜单']);
  assert.equal(v.pages, 10); assert.equal(v.items[0].label, '图像画质');
  fw.setMode('A+'); fw.press('menu_button'); fw.quickDial2(1); assert.notEqual(fw.menuView().pageName, '曝光', '基础区跳过只含创意区项目的曝光页'); assert.ok(fw.menuView().items.every(i => !i.adv));
});

test('firmware: menu options, quick control, dialogs, movie and playback', () => {
  const t = { now: 1000 }; const fw = createFirmware({ now: () => t.now, schedule: (fn) => { t.pending = fn; } });
  fw.setPower('on'); fw.press('menu_button'); fw.press('set_button'); assert.equal(fw.menuView().editing.label, '图像画质');
  fw.quickDial1(2); fw.press('set_button'); assert.equal(fw.get('图像画质'), 'RAW'); assert.equal(fw.menuView().editing, null);
  fw.mainDial(4); fw.quickDial1(4); fw.press('set_button'); assert.equal(fw.state.dialog.title, '格式化存储卡');
  fw.quickDial1(1); fw.press('set_button'); assert.equal(fw.state.dialog, null);
  fw.press('menu_button'); fw.press('q_button'); assert.equal(fw.state.screen, 'quick'); fw.quickDial1(2); fw.mainDial(1); assert.equal(fw.get('驱动模式'), '高速连拍+'); fw.press('q_button');
  fw.setSetting('驱动模式', '自拍:2秒'); fw.press('shutter_button'); assert.ok(fw.state.timer, '自拍倒计时'); t.now += 2000; t.pending(); assert.equal(fw.state.shots.length, 1);
  fw.setStillMovie('movie'); fw.press('movie_button'); assert.ok(fw.state.recording); t.now += 5000; fw.press('movie_button'); assert.equal(fw.state.shots[1].type, 'movie'); assert.equal(fw.state.shots[1].seconds, 5);
  fw.press('playback_button'); assert.equal(fw.state.playIndex, 1); fw.quickDial1(-1); assert.equal(fw.state.playIndex, 0);
  fw.press('erase_button'); assert.equal(fw.state.dialog.options[1], '删除'); fw.quickDial1(1); fw.press('set_button'); assert.equal(fw.state.shots.length, 1);
  assert.equal(fw.setSetting('自动对焦操作', 'SERVO'), true); assert.equal(fw.setSetting('自动对焦操作', '乱写'), false);
  assert.equal(fw.snapshot().af, 'SERVO');
});

test('lessons: goals check in order, hints exist, all lessons completable', async () => {
  const { createLessonRunner, LESSONS } = await import('../src/firmware/lessons.js');
  const t = { now: 1000 }; const fw = createFirmware({ now: () => t.now, schedule: fn => { t.pending = fn; } }); const r = createLessonRunner(fw);
  assert.ok(LESSONS.length >= 8); for (const l of LESSONS) assert.ok(l.goals.length >= 2 && l.goals.every(g => typeof g.check === 'function'), l.id);
  let st = r.start('exposure_triangle'); assert.equal(st.next, 0);
  fw.setPower('on'); fw.setMode('Av'); fw.setAperture('8.0'); st = r.status(); assert.equal(st.next, 3, '前三步完成后卡在 ISO');
  fw.setIso('400'); assert.ok(r.status().complete);
  r.start('self_timer'); fw.setSetting('驱动模式', '自拍:10秒'); fw.press('shutter_button'); t.now += 10000; t.pending(); assert.ok(r.status().complete, '自拍课程');
  r.start('format_card'); fw.press('menu_button'); fw.mainDial(4); assert.equal(r.status().next, 2); fw.quickDial1(4); fw.press('set_button'); fw.quickDial1(1); fw.press('set_button'); assert.ok(r.status().complete, '格式化课程');
  // The earlier self-timer lesson leaves the drive mode at 10 seconds; this lesson takes immediate shots.
  fw.setSetting('驱动模式', '单拍');
  r.start('playback_delete'); fw.press('menu_button'); fw.press('shutter_button'); fw.press('shutter_button'); fw.press('playback_button'); fw.press('erase_button'); fw.quickDial1(1); fw.press('set_button'); assert.ok(r.status().complete, '删除课程');
  r.stop(); assert.equal(r.status(), null);
});

test('portrait lessons follow the Canon tutorials and are completable', async () => {
  const { createLessonRunner, PORTRAIT_LESSONS } = await import('../src/firmware/lessons.js');
  assert.equal(PORTRAIT_LESSONS.length, 6); for (const l of PORTRAIT_LESSONS) assert.ok(l.source.startsWith('https://www.canon.com.cn/special/canon_portrait/'), l.id);
  const fw = createFirmware(); const r = createLessonRunner(fw); fw.setPower('on');
  r.start('portrait_bokeh'); fw.setMode('Av'); fw.setAperture('4.0'); fw.setSetting('色彩模式', '人像'); fw.setEc(1 / 3); fw.setSetting('自动旋转', '关'); assert.ok(r.status().complete, 'bokeh');
  r.start('portrait_eyes'); fw.setSetting('检测的被摄体', '人物'); fw.setSetting('眼睛检测', '自动'); fw.setSetting('自动对焦区域', '整个区域'); fw.setSetting('自动对焦操作', 'SERVO'); fw.press('af_on_button'); assert.ok(r.status().complete, 'eyes');
  r.start('portrait_backlit'); fw.setSetting('测光模式', '点测光'); fw.press('ae_lock_button'); fw.setEc(1); fw.setSetting('高光色调优先', '启用'); assert.ok(r.status().complete, 'backlit');
  r.start('portrait_lowkey'); fw.setIso('250'); fw.setEc(-1); fw.setSetting('自动亮度优化', '关闭'); assert.ok(r.status().complete, 'lowkey');
  r.start('portrait_mono'); fw.setSetting('色彩模式', '单色'); fw.setIso('3200'); fw.setSetting('高ISO感光度降噪功能', '关'); fw.setEc(2 / 3); assert.ok(r.status().complete, 'mono');
  r.start('portrait_kids'); fw.setSetting('驱动模式', '高速连拍+'); fw.setIso('800'); fw.setScreen('shoot'); fw.press('shutter_button'); fw.press('shutter_button'); fw.press('shutter_button'); assert.ok(r.status().complete, 'kids');
});

test('scenes: backlit face exposure and AF targets follow settings', async () => {
  const { SCENES } = await import('../src/firmware/scenes.js');
  const fw = createFirmware(); fw.setPower('on'); fw.setScene('backlit');
  assert.ok(fw.exposure().faceStops < -1.5, '评价测光下人脸欠曝');
  fw.setSetting('测光模式', '点测光'); fw.press('ae_lock_button'); assert.ok(fw.exposure().faceStops > -0.5, '点测光加 AE 锁后人脸正常'); assert.ok(fw.exposure().brightness > 1.5, '背景过曝');
  fw.setScene('kid'); let t = fw.afTargets(); assert.ok(t.main && t.eye, '人物+眼睛检测');
  fw.setSetting('眼睛检测', '关闭'); t = fw.afTargets(); assert.ok(t.main && !t.eye);
  fw.setSetting('自动对焦区域', '单点自动对焦'); assert.equal(fw.afTargets().main, undefined, '单点区域不做人物检测');
  for (const sc of Object.values(SCENES)) for (const f of sc.faces) { assert.equal(f.box.length, 4); assert.equal(f.eyes.length, 2); }
});
