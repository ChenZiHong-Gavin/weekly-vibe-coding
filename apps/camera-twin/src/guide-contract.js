// Shared by server and browser. The guide may only request operations the scene actually supports.
import parts from './parts.json' with { type: 'json' };
import { CONTROLS } from './model/contract.js';
import { OPTIONS, WB_MODES } from './firmware/state.js';
import { LESSONS } from './firmware/lessons.js';

export const VIEWS = ['keep', 'overview', 'front', 'back', 'top', 'left', 'right', 'bottom'];
// Firmware actions the guide may perform on the virtual camera (mirrors src/firmware/state.js).
export const FIRMWARE_ACTIONS = {
  power_on: '开机', power_off: '关机', power_lock: '拨到 LOCK',
  set_mode: '转到拍摄模式，value 为 A+/SCN/Fv/P/Tv/Av/M/B/S&F/C1/C2/C3 之一',
  set_aperture: '设置光圈，value 如 5.6（仅 Av/M 生效，范围 4.0–22）', set_shutter: '设置快门，value 如 1/250 或 2"（仅 Tv/M 生效）', set_iso: '设置 ISO，value 为 AUTO 或 100–102400 中的档位', set_ec: '设置曝光补偿，value 为 -3 到 3 的 1/3 档，如 0.7',
  press: '按下按钮，value 为按钮部件 id：menu_button/info_button/q_button/playback_button/set_button/af_on_button/shutter_button/movie_button/erase_button/ae_lock_button/af_point_button/magnify_button/rate_button',
  set_setting: '直接设置一个菜单/速控项，value 形如 "自动对焦操作=SERVO"、"驱动模式=自拍:10秒"、"白平衡=日光"、"图像画质=RAW"；可用项见 firmwareOptions',
  main_dial: '转动主拨盘，value 为 -1 或 1', quick_dial_1: '转动速控转盘 1，value 为 -1 或 1', quick_dial_2: '转动速控转盘 2，value 为 -1 或 1',
  still_movie: '切换照片/短片开关，value 为 still 或 movie',
  start_lesson: '开始一门练习课程，value 为课程 id（见 lessons）。用户表示想练习、想学、想考考自己时使用'
};
const PART_IDS = parts.parts.map(p => p.id);
const fail = m => { throw new Error(m); };
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = (x, max, label) => { if (typeof x !== 'string' || !x.trim() || x.length > max) fail(`${label}格式不正确`); return x.trim(); };

export function describeCamera(modelSource) {
  return { camera: parts.camera, modelSource, parts: parts.parts.map(({ id, name, en, side, description, howto }) => ({ id, name, en, side, description, howto })), controls: CONTROLS, firmwareActions: FIRMWARE_ACTIONS, firmwareOptions: { ...OPTIONS, '白平衡': WB_MODES }, lessons: LESSONS.map(l => ({ id: l.id, category: l.category, title: l.title, level: l.level, intro: l.intro, goals: l.goals.map(g => g.text) })) };
}

export function validatePlan(value) {
  if (!isObj(value)) fail('讲解不是有效对象');
  const answer = text(value.answer, 1200, '回答');
  const steps = Array.isArray(value.steps) ? value.steps : [];
  if (steps.length > 6) fail('演示最多六步');
  return { answer, steps: steps.map((s, i) => {
    if (!isObj(s)) fail(`第 ${i + 1} 步格式不正确`);
    const out = { caption: text(s.caption, 240, '步骤说明'), parts: [], focus: !!s.focus, visibility: 'keep', view: 'keep' };
    if (s.parts !== undefined) { if (!Array.isArray(s.parts) || s.parts.some(p => !PART_IDS.includes(p))) fail(`第 ${i + 1} 步引用了不存在的部件`); out.parts = [...new Set(s.parts)].slice(0, 12); }
    if (s.visibility !== undefined) { if (!['keep', 'all', 'only'].includes(s.visibility)) fail('visibility 不合法'); out.visibility = s.visibility; }
    if (s.view !== undefined) { if (!VIEWS.includes(s.view)) fail('view 不合法'); out.view = s.view; }
    if ((out.focus || out.visibility === 'only') && !out.parts.length) fail('聚焦或单独显示时必须给出部件');
    // Tolerate models that fill optional objects with {} or null-name placeholders.
    const emptyish = x => x === undefined || x === null || (isObj(x) && (Object.keys(x).length === 0 || x.name === null || x.action === null || x.name === '' || x.action === ''));
    if (emptyish(s.control)) s.control = undefined; if (emptyish(s.firmware)) s.firmware = undefined;
    if (s.firmware !== undefined && s.firmware !== null) { if (!isObj(s.firmware) || !FIRMWARE_ACTIONS[s.firmware.action]) fail('firmware 动作不合法'); const v = s.firmware.value; if (v !== undefined && v !== null && (typeof v !== 'string' || v.length > 48)) fail('firmware value 不合法'); out.firmware = { action: s.firmware.action, value: v == null ? null : v }; }
    if (s.control !== undefined) { if (!isObj(s.control) || !CONTROLS[s.control.name] || typeof s.control.value !== 'number' || s.control.value < CONTROLS[s.control.name].min || s.control.value > CONTROLS[s.control.name].max) fail('control 不合法'); out.control = { name: s.control.name, value: s.control.value }; }
    return out;
  }) };
}

/** Anthropic tool definition for the guide. */
export function guideTool() {
  return {
    name: 'present_camera',
    description: '提交中文回答和零到六个可执行的演示步骤。应用会校验并逐步执行：镜头飞到部件、高亮、单独显示、切换视角、拨动机械控制件、操作相机固件（开机、换模式、改曝光、按按钮）。只能引用清单中的部件 id、控制件和固件动作。',
    strict: true,
    input_schema: {
      type: 'object', additionalProperties: false, required: ['answer', 'steps'],
      properties: {
        answer: { type: 'string', description: '面向初学者的中文回答，简明自然，通常 60 到 200 字。不要声称动作已执行。' },
        steps: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['caption', 'parts', 'focus', 'visibility', 'view', 'control', 'firmware'], properties: {
          caption: { type: 'string', description: '这一步的一句话说明，最长 240 字' },
          parts: { type: 'array', items: { type: 'string', enum: PART_IDS }, maxItems: 12 },
          focus: { type: 'boolean', description: '镜头是否飞到并高亮 parts' },
          visibility: { type: 'string', enum: ['keep', 'all', 'only'] },
          view: { type: 'string', enum: VIEWS },
          control: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['name', 'value'], properties: { name: { type: 'string', enum: Object.keys(CONTROLS) }, value: { type: 'number', minimum: 0, maximum: 1 } } }], description: '可选：拨动一个机械控制件到 0..1 的位置（翻屏、卡槽盖、镜头等）' },
          firmware: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['action', 'value'], properties: { action: { type: 'string', enum: Object.keys(FIRMWARE_ACTIONS) }, value: { anyOf: [{ type: 'null' }, { type: 'string' }] } } }], description: '可选：对虚拟相机固件执行一个操作（开机、换模式、改曝光、按按钮），屏幕会实时变化。' }
        } } }
      }
    }
  };
}
