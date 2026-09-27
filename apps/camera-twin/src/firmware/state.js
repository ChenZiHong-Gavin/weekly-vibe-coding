// Camera "firmware": a plain state machine reproducing the parts of the EOS R6 Mark III behaviour a beginner meets first.
// No DOM, no Three.js. The browser renders it (screen.js) and the guide can drive it (guide-contract.js).

export const MODES = ['A+', 'SCN', 'Fv', 'P', 'Tv', 'Av', 'M', 'B', 'S&F', 'C1', 'C2', 'C3'];
export const MODE_NAMES = { 'A+': '场景智能自动', SCN: '特殊场景', Fv: '灵活优先', P: '程序自动', Tv: '快门优先', Av: '光圈优先', M: '手动曝光', B: 'B 门', 'S&F': '慢动作/快动作短片', C1: '自定义 1', C2: '自定义 2', C3: '自定义 3' };
export const SHUTTERS = ['30"', '25"', '20"', '15"', '13"', '10"', '8"', '6"', '5"', '4"', '3"2', '2"5', '2"', '1"6', '1"3', '1"', '0"8', '0"6', '0"5', '0"4', '0"3', '1/4', '1/5', '1/6', '1/8', '1/10', '1/13', '1/15', '1/20', '1/25', '1/30', '1/40', '1/50', '1/60', '1/80', '1/100', '1/125', '1/160', '1/200', '1/250', '1/320', '1/400', '1/500', '1/640', '1/800', '1/1000', '1/1250', '1/1600', '1/2000', '1/2500', '1/3200', '1/4000', '1/5000', '1/6400', '1/8000'];
export const APERTURES = ['4.0', '4.5', '5.0', '5.6', '6.3', '7.1', '8.0', '9.0', '10', '11', '13', '14', '16', '18', '20', '22']; // RF 24-105 F4L
export const ISOS = ['AUTO', '100', '125', '160', '200', '250', '320', '400', '500', '640', '800', '1000', '1250', '1600', '2000', '2500', '3200', '4000', '5000', '6400', '8000', '10000', '12800', '16000', '20000', '25600', '32000', '40000', '51200', '64000', '80000', '102400'];
export const EC_STEPS = 19; // -3 .. +3 in 1/3 stops, index 9 = 0
export const AF_MODES = ['ONE SHOT', 'SERVO'];
export const DRIVE_MODES = ['单拍', '高速连拍+', '高速连拍', '低速连拍', '自拍:10秒', '自拍:2秒'];
export const WB_MODES = ['AWB', '日光', '阴影', '阴天', '钨丝灯', '荧光灯', '闪光灯'];

import menuData from './menu.json' with { type: 'json' };
import menuOptions from './menu-options.json' with { type: 'json' };
import { SCENES } from './scenes.js';
// Per-item official intro text and option lists scraped from the Canon manual item pages (see docs/MODELING_BRIEF.md 数据来源).
export const MENU_INFO = menuOptions;
// Official tab structure from the Canon online manual (设置页菜单 pages), see menu.json. Values shown for items the twin simulates.
export const MENU = menuData.tabs;
export const MENU_VALUES = { '图像画质': 'RAW+▲L', '全像素双核RAW': '关闭', '裁切/长宽比': 'FULL', '数码长焦附加镜': '关', '曝光补偿/AEB': '−2..1..0..1..2', 'ISO感光度设置': '自动', '防闪烁拍摄': '关闭', '高频防闪烁拍摄': '关闭', '测光模式': '评价测光', '色彩模式': '自动', '色彩空间': 'sRGB', '清晰度': '0', 'HDR拍摄（PQ）': '关闭', 'HDR模式': '关闭HDR', '自动亮度优化': '标准', '高光色调优先': '关闭', '镜头像差校正': '开', '长时间曝光降噪功能': '关', '高ISO感光度降噪功能': '标准', '多重曝光': '关闭', '对焦包围拍摄': '关闭', '驱动模式': '单拍', '预先连续拍摄': '关', '间隔定时器': '关闭', 'B门定时器': '关闭', '静音快门功能': '关', '快门模式': '电子前帘', '未装存储卡释放快门': '关', '影像稳定器模式': '开', '测光定时器': '8秒', '图像确认': '2秒', '高速显示': '关', '显示模拟': '曝光+景深', '拍摄信息显示': '—', '显示帧频设置': '省电', '取景器显示格式': '显示1', '镜像显示': '关', '自动关闭电源温度': '标准', '短片记录尺寸': '4K 25P', '短片记录格式': 'MP4', '录音': '自动', '音频格式': 'LPCM', '自动对焦操作': 'ONE SHOT', '自动对焦区域': '整个区域', '伺服自动对焦追踪全部区域': '开', '对焦模式': 'AF', '短片伺服自动对焦': '开', '检测的被摄体': '人物', '眼睛检测': '自动', 'Case自动': '', '追踪灵敏度': '0', '加速/减速追踪': '0', '预览自动对焦': '关', '自动对焦辅助光发光': '开', '限制自动对焦区域': '', '手动对焦峰值设置': '关', '对焦向导': '关', '镜头电子手动对焦': '关', '保护图像': '', '删除图像': '', '旋转静止图像': '', '评分': '', '幻灯片播放': '', '放大倍率': '2x', '播放信息显示': '', '高光警告': '关', '显示自动对焦点': '关', '播放网格线': '关', '短片播放计时': '记录时间', '飞行模式': '关', 'Wi-Fi设置': '开', '蓝牙设置': '开', '相机名称': 'EOS R6 Mark III', '记录功能+存储卡/文件夹选择': '', '文件编号': '连续编号', '剪辑编号': '连续编号', '文件名': 'IMG_', '格式化存储卡': '', '自动旋转': '开', '添加旋转信息': '关闭', '日期/时间/区域': '2026/09/27 10:30', '语言': '简体中文', '系统频率': '50.00 Hz', '帮助文本尺寸': '小', '功能介绍': '开', '提示音': '开', '音量': '', '音频监控器': '关', '屏幕亮度': '4', '取景器亮度': '自动', '屏幕/取景器显示': '自动', '用户界面放大': '关', 'HDMI分辨率': '自动', '关机时的快门状态': '关闭', '清洁感应器': '', '节电': '', '重置相机': '', '自定义拍摄模式(C1-C3)': '', '电池信息': '', '版权信息': '', '固件': 'Ver. 1.0.0', '触摸快门': '关', '多功能锁': '', '触摸控制': '标准', '曝光等级增量': '1/3级', 'ISO感光度设置增量': '1/3级', '包围曝光自动取消': '开', '包围曝光顺序': '0−+', '包围曝光拍摄数量': '3张', '安全偏移': '关', '未装镜头释放快门': '关', '默认删除选项': '取消', '菜单显示': '正常显示' };


// Options for the items the twin lets you change (第三级选项). Everything else opens a "未模拟" notice.
export const OPTIONS = {
  '图像画质': ['RAW+▲L', '▲L', 'RAW', 'C-RAW', '▲M', '▲S1', 'HEIF L'],
  '全像素双核RAW': ['关闭', '启用'], '裁切/长宽比': ['FULL', '1.6x(裁切)', '1:1', '4:3', '16:9'], '数码长焦附加镜': ['关', '2.0x', '4.0x'],
  'ISO感光度设置': ['自动', '100', '200', '400', '800', '1600', '3200', '6400', '12800'], '防闪烁拍摄': ['关闭', '启用'], '高频防闪烁拍摄': ['关闭', '启用'],
  '测光模式': ['评价测光', '局部测光', '点测光', '中央重点平均测光'], '色彩模式': ['自动', '标准', '人像', '风光', '精致细节', '中性', '可靠设置', '单色'], '色彩空间': ['sRGB', 'Adobe RGB'],
  '清晰度': ['-4', '-2', '0', '+2', '+4'], 'HDR拍摄（PQ）': ['关闭', '启用'], 'HDR模式': ['关闭HDR', '自动', '±1EV', '±2EV', '±3EV'], '自动亮度优化': ['关闭', '弱', '标准', '强'], '高光色调优先': ['关闭', '启用', '增强'],
  '镜头像差校正': ['开', '关'], '长时间曝光降噪功能': ['关', '自动', '开'], '高ISO感光度降噪功能': ['关', '弱', '标准', '强', '多张拍摄降噪'], '多重曝光': ['关闭', '开:功能/控制', '开:连续拍摄'], '对焦包围拍摄': ['关闭', '启用'],
  '驱动模式': DRIVE_MODES, '预先连续拍摄': ['关', '开'], '间隔定时器': ['关闭', '启用'], 'B门定时器': ['关闭', '启用'], '静音快门功能': ['关', '开'], '快门模式': ['机械', '电子前帘', '电子'], '未装存储卡释放快门': ['关', '开'],
  '影像稳定器模式': ['关', '开'], '测光定时器': ['4秒', '8秒', '16秒', '30秒', '1分', '10分', '30分'], '图像确认': ['关', '2秒', '4秒', '8秒', '持续显示'], '高速显示': ['关', '开'], '显示模拟': ['曝光+景深', '曝光', '仅在景深预览期间', '关闭'],
  '短片记录尺寸': ['4K 25P', '4K 50P', '4K 100P', 'FHD 25P', 'FHD 50P', 'FHD 100P', '7K RAW 25P'], '短片记录格式': ['MP4', 'RAW'], '录音': ['自动', '手动', '关'], '音频格式': ['LPCM', 'AAC'],
  '自动对焦操作': AF_MODES, '自动对焦区域': ['定点自动对焦', '单点自动对焦', '扩展自动对焦区域', '灵活区域自动对焦1', '灵活区域自动对焦2', '灵活区域自动对焦3', '整个区域'], '伺服自动对焦追踪全部区域': ['开', '关'], '对焦模式': ['AF', 'MF'], '短片伺服自动对焦': ['开', '关'],
  '检测的被摄体': ['自动', '人物', '动物', '车辆', '飞机', '火车', '无'], '眼睛检测': ['自动', '关闭'], 'Case自动': ['启用', '关闭'], '追踪灵敏度': ['-2', '-1', '0', '+1', '+2'], '加速/减速追踪': ['-2', '-1', '0', '+1', '+2'],
  '预览自动对焦': ['关', '开'], '自动对焦辅助光发光': ['开', '关'], '手动对焦峰值设置': ['关', '开'], '对焦向导': ['关', '开'], '镜头电子手动对焦': ['关', '开'],
  '高光警告': ['关', '开'], '显示自动对焦点': ['关', '开'], '播放网格线': ['关', '3x3', '6x4', '3x3+对角线'], '短片播放计时': ['记录时间', '时间码'], '放大倍率': ['1x', '2x', '4x', '8x', '10x', '实际大小'],
  '飞行模式': ['关', '开'], 'Wi-Fi设置': ['开', '关'], '蓝牙设置': ['开', '关'],
  '文件编号': ['连续编号', '自动重设', '手动重设'], '剪辑编号': ['连续编号', '自动重设'], '自动旋转': ['开', '开(仅相机)', '关'], '添加旋转信息': ['关闭', '启用'], '语言': ['简体中文', 'English', '日本語', '繁體中文'], '系统频率': ['50.00 Hz', '59.94 Hz', '24.00 Hz'], '帮助文本尺寸': ['小', '标准'], '功能介绍': ['开', '关'],
  '提示音': ['开', '关'], '音频监控器': ['关', '开'], '屏幕亮度': ['1', '2', '3', '4', '5', '6', '7'], '取景器亮度': ['自动', '手动'], '屏幕/取景器显示': ['自动', '仅屏幕', '仅取景器', '屏幕(自动切换)'], '用户界面放大': ['关', '开'], 'HDMI分辨率': ['自动', '1080p'],
  '关机时的快门状态': ['关闭', '打开'], '触摸快门': ['关', '开'], '触摸控制': ['标准', '灵敏', '关'], '菜单显示': ['正常显示', '仅显示我的菜单', '从我的菜单开始显示'],
  '曝光等级增量': ['1/3级', '1/2级'], 'ISO感光度设置增量': ['1/3级', '1级'], '包围曝光自动取消': ['开', '关'], '包围曝光顺序': ['0−+', '−0+', '+0−'], '包围曝光拍摄数量': ['3张', '2张', '5张', '7张'], '安全偏移': ['关', '开', 'ISO感光度'], '未装镜头释放快门': ['关', '开'], '默认删除选项': ['取消', '删除']
};
for (const [label, info] of Object.entries(menuOptions)) if (!OPTIONS[label] && info.options?.length) OPTIONS[label] = info.options.map(o => o.name);
export const OPTION_DESC = Object.fromEntries(Object.entries(menuOptions).filter(([, v]) => v.options?.length).map(([k, v]) => [k, Object.fromEntries(v.options.map(o => [o.name, o.desc]))]));
// Items that run a procedure instead of picking an option.
export const ACTIONS = { '格式化存储卡': 'format', '清洁感应器': 'clean', '重置相机': 'reset', '删除图像': 'erase', '保护图像': 'protect', '评分': 'rate', '幻灯片播放': 'slideshow', '电池信息': 'battery', '固件': 'firmware', '版权信息': 'copyright', '日期/时间/区域': 'datetime' };
export const QUICK_ITEMS = [
  { key: '自动对焦操作', short: 'AF' }, { key: '自动对焦区域', short: 'AF区域' }, { key: '驱动模式', short: '驱动' }, { key: '白平衡', short: 'WB', options: WB_MODES },
  { key: 'iso', short: 'ISO' }, { key: 'ec', short: '曝光补偿' }, { key: '图像画质', short: '画质' }, { key: '测光模式', short: '测光' }, { key: '影像稳定器模式', short: 'IS' }, { key: '色彩模式', short: '色彩' }
];
export const SELF_TIMER_SECONDS = { '自拍:10秒': 10, '自拍:2秒': 2 };
export function createFirmware({ now = () => Date.now(), schedule = (fn, ms) => setTimeout(fn, ms) } = {}) {
  const s = {
    power: 'off',            // off | on | lock
    modeIndex: 5,            // Av
    shutter: 36,             // 1/125
    aperture: 3,             // f/5.6
    iso: 0,                  // AUTO
    ec: 9,                   // 0
    settings: { ...Object.fromEntries(Object.entries(OPTIONS).map(([k, v]) => [k, v[0]])), ...MENU_VALUES, '白平衡': 'AWB' },
    stillMovie: 'still',
    screen: 'shoot',         // off | shoot | menu | quick | playback
    infoLevel: 1,            // 0 clean, 1 basic, 2 full
    menu: { tab: 0, page: 0, item: 0, editing: null },   // editing: { label, options, index }
    quick: { item: 0, editing: false },
    dialog: null,            // { kind, title, options, index, onConfirm }
    shots: [], cardCapacity: 999, playIndex: 0, zoom: false,
    recording: null,         // { startedAt }
    timer: null,             // self-timer { until }
    aeLock: false, afLocked: false, toast: null, lastEvent: '',
    stats: { stills: 0, movies: 0, deleted: 0 }, formattedAt: undefined,
    scene: 'landscape'
  };
  const listeners = new Set();
  const emit = (ev) => { s.lastEvent = ev; listeners.forEach(l => l(s, ev)); };
  const wrap = (i, n) => ((i % n) + n) % n;
  const clampI = (i, n) => Math.max(0, Math.min(n - 1, i));
  const mode = () => MODES[s.modeIndex];
  const on = () => s.power !== 'off';
  const toast = (text, ms = 1800) => { s.toast = { text, until: now() + ms }; };
  const basicZone = () => ['A+', 'SCN'].includes(mode());
  const visibleItems = () => { const page = MENU[s.menu.tab].pages[s.menu.page]; const basic = basicZone(); return page.items.filter(it => !(basic && it.adv)); };
  const openDialog = (d) => { s.dialog = { index: 0, ...d }; };
  const get = (k) => s.settings[k];
  const set = (k, v) => { s.settings[k] = v; };
  const isSelfTimer = () => SELF_TIMER_SECONDS[get('驱动模式')] !== undefined;

  const api = {
    get state() { return s; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    mode, get, set,
    /** Effective exposure for rendering: returns { ev, stops, brightness } given a sunny scene of EV 13. */
    exposure() {
      const m = mode(), scene = SCENES[s.scene] || SCENES.landscape;
      const shutterSec = shutterSeconds(SHUTTERS[s.shutter]);
      const N = parseFloat(APERTURES[s.aperture]);
      const isoV = s.iso === 0 ? 400 : parseInt(ISOS[s.iso], 10);
      const ecStops = (s.ec - 9) / 3;
      // Backlit scene: evaluative metering exposes for the bright background, so the face ends up dark.
      // Spot metering + AE lock (or spot alone, roughly) meters the face instead: face correct, background blown out.
      const bl = scene.backlit; const spotOnFace = bl && get('测光模式') === '点测光' && s.aeLock;
      const faceStops = bl ? (spotOnFace ? 0 : bl.faceStops) : 0, bgStops = bl && spotOnFace ? -bl.faceStops : 0;
      let stops;
      if (m === 'M' || m === 'B') { const ev = Math.log2(N * N / shutterSec) - Math.log2(isoV / 100); stops = scene.sceneEV - ev; }
      else stops = ecStops;
      const b = x => Math.pow(2, x * 0.9);
      return { ev: scene.sceneEV - stops, stops, brightness: b(stops + bgStops), faceBrightness: b(stops + faceStops), faceStops: stops + faceStops, scene: scene.id };
    },
    setScene(id) { if (SCENES[id]) { s.scene = id; emit('scene'); } },
    /** Where the AF system currently "sees" faces/eyes, given subject detection and AF area settings. */
    afTargets() {
      const scene = SCENES[s.scene] || SCENES.landscape; const area = get('自动对焦区域') || '整个区域';
      const detectPeople = ['自动', '人物'].includes(get('检测的被摄体') || '人物') && get('对焦模式') !== 'MF';
      const wholeArea = area === '整个区域' || area.startsWith('灵活');
      if (!detectPeople || !scene.faces.length || !wholeArea) return { faces: [], eye: null, mode: area };
      const face = scene.faces.find(f => f.near) || scene.faces[0];
      const eyeOn = get('眼睛检测') !== '关闭';
      const eye = eyeOn ? (get('左/右眼检测') === '右眼' ? face.eyes[1] : face.eyes[0]) : null;
      return { faces: scene.faces, main: face, eye, mode: area, servo: get('自动对焦操作') === 'SERVO' };
    },
    display() {
      const m = mode(), auto = basicZone();
      const isoV = s.iso === 0 ? 400 : parseInt(ISOS[s.iso], 10), targetEV = 13 - (s.ec - 9) / 3 + Math.log2(isoV / 100);
      let shutter = SHUTTERS[s.shutter], aperture = APERTURES[s.aperture];
      const N = parseFloat(aperture), t = shutterSeconds(shutter);
      if (auto || m === 'P') { aperture = nearest(APERTURES, a => Math.log2(parseFloat(a) ** 2), Math.min(targetEV / 2, Math.log2(64))); shutter = nearest(SHUTTERS, x => -Math.log2(shutterSeconds(x)), targetEV - Math.log2(parseFloat(aperture) ** 2)); }
      else if (m === 'Av') shutter = nearest(SHUTTERS, x => -Math.log2(shutterSeconds(x)), targetEV - Math.log2(N * N));
      else if (m === 'Tv') aperture = nearest(APERTURES, a => Math.log2(parseFloat(a) ** 2), targetEV + Math.log2(t));
      return {
        mode: m, modeName: MODE_NAMES[m], shutter, aperture, iso: ISOS[s.iso], ec: s.ec - 9,
        af: get('自动对焦操作'), afArea: get('自动对焦区域'), drive: get('驱动模式'), wb: get('白平衡'), quality: get('图像画质'), metering: get('测光模式'), is: get('影像稳定器模式'), movieSize: get('短片记录尺寸'),
        shutterAuto: auto || m === 'Av' || m === 'P', apertureAuto: auto || m === 'Tv' || m === 'P',
        remaining: s.cardCapacity - s.shots.length, shots: s.shots.length,
        power: s.power, screen: s.screen, stillMovie: s.stillMovie, infoLevel: s.infoLevel, menu: s.menu, quick: s.quick, dialog: s.dialog,
        recording: s.recording ? Math.floor((now() - s.recording.startedAt) / 1000) : null, timer: s.timer ? Math.max(0, Math.ceil((s.timer.until - now()) / 1000)) : null,
        aeLock: s.aeLock, afLocked: s.afLocked, playIndex: s.playIndex, zoom: s.zoom,
        toast: s.toast && s.toast.until > now() ? s.toast.text : null
      };
    },
    // ---- physical controls ----
    setPower(p) { if (!['off', 'on', 'lock'].includes(p)) return; const was = s.power; s.power = p; if (p === 'off') { s.screen = 'off'; s.afLocked = false; s.aeLock = false; s.recording = null; s.timer = null; s.dialog = null; s.menu.editing = null; } else if (was === 'off') { s.screen = 'shoot'; s.infoLevel = 1; } emit('power'); },
    togglePower() { api.setPower(s.power === 'off' ? 'on' : 'off'); },
    setMode(i) { if (typeof i === 'string') i = MODES.indexOf(i); if (i < 0 || i >= MODES.length) return; s.modeIndex = i; if (on() && s.screen !== 'off') { s.screen = 'shoot'; s.dialog = null; s.menu.editing = null; } toast(MODE_NAMES[MODES[i]]); emit('mode'); },
    turnMode(delta) { api.setMode(wrap(s.modeIndex + delta, MODES.length)); },
    mainDial(delta) {
      if (!on()) return;
      if (s.power === 'lock' && s.screen === 'shoot') { toast('多功能锁：主拨盘已锁定'); return; }
      if (s.dialog) { s.dialog.index = wrap(s.dialog.index + delta, s.dialog.options.length); emit('dialog'); return; }
      if (s.screen === 'menu') { if (s.menu.editing) { s.menu.editing.index = wrap(s.menu.editing.index + delta, s.menu.editing.options.length); } else { s.menu.tab = wrap(s.menu.tab + delta, MENU.length); s.menu.page = 0; s.menu.item = 0; } emit('menu'); return; }
      if (s.screen === 'quick') { api.quickChange(delta); return; }
      if (s.screen === 'playback') { api.playbackJump(delta * 10); return; }
      const m = mode();
      if (m === 'Av') s.aperture = clampI(s.aperture + delta, APERTURES.length);
      else if (m === 'Tv' || m === 'M' || m === 'Fv' || m === 'P' || m === 'S&F') s.shutter = clampI(s.shutter + delta, SHUTTERS.length);
      else { toast('此模式下主拨盘无效'); return; }
      emit('exposure');
    },
    quickDial1(delta) {
      if (!on()) return;
      if (s.dialog) { s.dialog.index = wrap(s.dialog.index + delta, s.dialog.options.length); emit('dialog'); return; }
      if (s.screen === 'menu') { if (s.menu.editing) s.menu.editing.index = wrap(s.menu.editing.index + delta, s.menu.editing.options.length); else s.menu.item = clampI(s.menu.item + delta, visibleItems().length); emit('menu'); return; }
      if (s.screen === 'quick') { if (s.quick.editing) api.quickChange(delta); else s.quick.item = wrap(s.quick.item + delta, QUICK_ITEMS.length); emit('quick'); return; }
      if (s.screen === 'playback') { api.playbackJump(delta); return; }
      const m = mode();
      if (m === 'M') s.aperture = clampI(s.aperture + delta, APERTURES.length);
      else if (basicZone()) { toast('自动模式下不能调曝光补偿'); return; }
      else s.ec = clampI(s.ec + delta, EC_STEPS);
      emit('exposure');
    },
    quickDial2(delta) {
      if (!on()) return;
      if (s.screen === 'menu' && !s.menu.editing) { const pages = MENU[s.menu.tab].pages.length; for (let k = 0; k < pages; k++) { s.menu.page = wrap(s.menu.page + delta, pages); if (visibleItems().length) break; } s.menu.item = 0; emit('menu'); return; }
      if (s.screen !== 'shoot') return;
      if (basicZone()) { toast('自动模式下 ISO 固定为自动'); return; }
      s.iso = clampI(s.iso + delta, ISOS.length); emit('exposure');
    },
    setStillMovie(v) { s.stillMovie = v === 'movie' ? 'movie' : 'still'; if (s.recording) s.recording = null; if (on() && s.screen !== 'off') s.screen = 'shoot'; toast(s.stillMovie === 'movie' ? '短片记录模式' : '静止图像拍摄'); emit('stillmovie'); },
    press(button) {
      if (!on()) return;
      if (s.dialog) { if (button === 'set_button') { const d = s.dialog; s.dialog = null; d.onConfirm?.(d.options[d.index], d.index); } else if (button === 'menu_button' || button === 'playback_button') s.dialog = null; else return; emit('dialog'); return; }
      switch (button) {
        case 'menu_button':
          if (s.screen === 'menu' && s.menu.editing) { s.menu.editing = null; break; }
          s.screen = s.screen === 'menu' ? 'shoot' : 'menu'; s.zoom = false; break;
        case 'info_button': if (s.screen === 'shoot') s.infoLevel = (s.infoLevel + 1) % 3; else if (s.screen === 'playback') s.infoLevel = (s.infoLevel + 1) % 3; break;
        case 'q_button': if (s.screen === 'quick') { s.screen = 'shoot'; s.quick.editing = false; } else if (s.screen === 'shoot') s.screen = 'quick'; break;
        case 'playback_button': s.screen = s.screen === 'playback' ? 'shoot' : 'playback'; s.playIndex = Math.max(0, s.shots.length - 1); s.zoom = false; break;
        case 'set_button': api.confirm(); return;
        case 'af_on_button': if (s.screen === 'shoot') { s.afLocked = true; toast(get('自动对焦操作') === 'SERVO' ? '伺服自动对焦：持续追踪' : 'AF-ON：已对焦'); } break;
        case 'shutter_button': api.shutter(); return;
        case 'movie_button': api.movie(); return;
        case 'erase_button': if (s.screen === 'playback' && s.shots.length) openDialog({ kind: 'confirm', title: '删除这张图像？', options: ['取消', '删除'], onConfirm: (o) => { if (o === '删除') { s.shots.splice(s.playIndex, 1); s.stats.deleted++; s.playIndex = clampI(s.playIndex, Math.max(1, s.shots.length)); toast('已删除'); } } }); break;
        case 'ae_lock_button': if (s.screen === 'shoot') { s.aeLock = !s.aeLock; toast(s.aeLock ? '✱ 自动曝光锁定' : '解除曝光锁定'); } break;
        case 'af_point_button': if (s.screen === 'shoot') { const opts = OPTIONS['自动对焦区域']; set('自动对焦区域', opts[wrap(opts.indexOf(get('自动对焦区域')) + 1, opts.length)]); toast('自动对焦区域：' + get('自动对焦区域')); } break;
        case 'magnify_button': if (s.screen === 'playback') { s.zoom = !s.zoom; } else if (s.screen === 'shoot') toast('放大取景 5x（示意）'); break;
        case 'rate_button': if (s.screen === 'playback' && s.shots.length) { const sh = s.shots[s.playIndex]; sh.rating = ((sh.rating || 0) + 1) % 6; toast('评分：' + '★'.repeat(sh.rating) || '无'); } else if (s.screen === 'shoot') { const opts = OPTIONS['色彩模式']; set('色彩模式', opts[wrap(opts.indexOf(get('色彩模式')) + 1, opts.length)]); toast('色彩模式：' + get('色彩模式')); } break;
        default: return;
      }
      emit(button);
    },
    halfPress() { if (!on() || s.screen !== 'shoot') return; s.afLocked = true; emit('half_press'); },
    /** SET: enter / confirm depending on the screen. */
    confirm() {
      if (s.screen === 'menu') {
        if (s.menu.editing) { const e = s.menu.editing; set(e.label, e.options[e.index]); s.menu.editing = null; toast(`${e.label}：${e.options[e.index]}`); emit('menu'); return; }
        const it = visibleItems()[s.menu.item]; if (!it) return;
        if (ACTIONS[it.label]) { api.runAction(ACTIONS[it.label], it.label); emit('menu'); return; }
        const options = OPTIONS[it.label];
        if (options) { s.menu.editing = { label: it.label, options, index: Math.max(0, options.indexOf(get(it.label))) }; emit('menu'); return; }
        openDialog({ kind: 'notice', title: it.label, options: ['确定'], text: (MENU_INFO[it.label]?.intro || '') + (MENU_INFO[it.label]?.intro ? '（官方说明；数字孪生未模拟此项的具体设置）' : '数字孪生尚未模拟这一项。') }); emit('dialog'); return;
      }
      if (s.screen === 'quick') { s.quick.editing = !s.quick.editing; emit('quick'); return; }
      if (s.screen === 'playback') { s.zoom = !s.zoom; emit('playback'); return; }
    },
    quickChange(delta) {
      const q = QUICK_ITEMS[s.quick.item];
      if (q.key === 'iso') { if (basicZone()) { toast('自动模式下 ISO 固定为自动'); return; } s.iso = clampI(s.iso + delta, ISOS.length); }
      else if (q.key === 'ec') { if (basicZone()) { toast('自动模式下不能调曝光补偿'); return; } s.ec = clampI(s.ec + delta, EC_STEPS); }
      else { const opts = q.options || OPTIONS[q.key]; set(q.key, opts[wrap(opts.indexOf(get(q.key)) + delta, opts.length)]); }
      emit('quick');
    },
    runAction(kind, label) {
      const actions = {
        format: () => openDialog({ kind: 'confirm', title: '格式化存储卡', text: `存储卡 1 · 将删除全部数据（${s.shots.length} 张）`, options: ['取消', '确定'], onConfirm: o => { if (o === '确定') { s.shots = []; s.playIndex = 0; s.formattedAt = now(); toast('格式化完成'); } } }),
        clean: () => { toast('正在清洁感应器…', 1500); schedule(() => { toast('清洁完成'); emit('clean'); }, 1500); },
        reset: () => openDialog({ kind: 'confirm', title: '重置相机', text: '基本设置将恢复为默认值', options: ['取消', '确定'], onConfirm: o => { if (o === '确定') { Object.assign(s.settings, Object.fromEntries(Object.entries(OPTIONS).map(([k, v]) => [k, v[0]])), MENU_VALUES, { '白平衡': 'AWB' }); s.modeIndex = 5; s.shutter = 36; s.aperture = 3; s.iso = 0; s.ec = 9; toast('已重置'); } } }),
        erase: () => { s.screen = 'playback'; s.playIndex = Math.max(0, s.shots.length - 1); if (s.shots.length) api.press('erase_button'); else toast('没有图像'); },
        protect: () => { const sh = s.shots[s.playIndex]; if (sh) { sh.protected = !sh.protected; toast(sh.protected ? '已保护' : '已取消保护'); } else toast('没有图像'); },
        rate: () => { s.screen = 'playback'; s.playIndex = Math.max(0, s.shots.length - 1); if (s.shots.length) api.press('rate_button'); else toast('没有图像'); },
        slideshow: () => { if (s.shots.length) { s.screen = 'playback'; s.playIndex = 0; toast('幻灯片播放（示意）'); } else toast('没有图像'); },
        battery: () => openDialog({ kind: 'notice', title: '电池信息', text: 'LP-E6P · 剩余电量 78% · 快门次数 ' + s.shots.length + ' · 充电性能 ●●●', options: ['确定'] }),
        firmware: () => openDialog({ kind: 'notice', title: '固件', text: '相机 Ver. 1.0.0 · 镜头 RF24-105mm F4 L IS USM Ver. 2.0.0', options: ['确定'] }),
        copyright: () => openDialog({ kind: 'notice', title: '版权信息', text: '作者名：（未设置）', options: ['确定'] }),
        datetime: () => openDialog({ kind: 'notice', title: '日期/时间/区域', text: get('日期/时间/区域') + ' · 北京 UTC+8', options: ['确定'] })
      };
      actions[kind]?.();
    },
    playbackJump(delta) { if (!s.shots.length) return; s.playIndex = wrap(s.playIndex + delta, s.shots.length); s.zoom = false; emit('playback'); },
    shutter() {
      if (s.screen !== 'shoot') { s.screen = 'shoot'; s.quick.editing = false; emit('shutter_button'); return; }
      if (s.stillMovie === 'movie') { api.movie(); return; }
      if (s.timer) { s.timer = null; toast('自拍已取消'); emit('timer'); return; }
      if (s.shots.length >= s.cardCapacity) { toast('存储卡已满'); emit('shutter_button'); return; }
      const secs = SELF_TIMER_SECONDS[get('驱动模式')];
      if (secs) { s.timer = { until: now() + secs * 1000 }; toast(`自拍倒计时 ${secs} 秒`, secs * 1000); schedule(() => { if (s.timer) { s.timer = null; takeShot(true); } }, secs * 1000); emit('timer'); return; }
      takeShot();
    },
    movie() {
      if (s.stillMovie !== 'movie') { toast('请先把照片/短片开关拨到短片'); emit('movie_button'); return; }
      if (s.recording) { const secs = Math.max(1, Math.round((now() - s.recording.startedAt) / 1000)); s.stats.movies++; s.shots.push({ id: s.shots.length + 1, type: 'movie', seconds: secs, size: get('短片记录尺寸'), mode: mode(), exposure: api.exposure(), at: now() }); s.recording = null; toast(`已保存短片 ${secs} 秒`); }
      else { s.recording = { startedAt: now() }; s.screen = 'shoot'; }
      emit('movie_button');
    },
    joystick(dir) { if (!on()) return; if (s.dialog || s.screen === 'menu' || s.screen === 'quick') { if (dir === 'up') api.quickDial1(-1); else if (dir === 'down') api.quickDial1(1); else if (dir === 'left') api.mainDial(-1); else if (dir === 'right') api.mainDial(1); } },
    menuView() {
      const tab = MENU[s.menu.tab], page = tab.pages[s.menu.page];
      return { tabs: MENU.map(t => ({ id: t.id, label: t.label, color: t.color })), tab: s.menu.tab, tabId: tab.id, label: tab.label, color: tab.color, page: s.menu.page, pages: tab.pages.length, pageName: page.name, items: visibleItems().map(it => ({ label: it.label, value: get(it.label) ?? '', adv: it.adv, editable: !!(OPTIONS[it.label] || ACTIONS[it.label]) })), selected: s.menu.item, editing: s.menu.editing };
    },
    quickView() { return QUICK_ITEMS.map((q, i) => ({ short: q.short, value: q.key === 'iso' ? ISOS[s.iso] : q.key === 'ec' ? fmtEc(s.ec - 9) : get(q.key), selected: i === s.quick.item, editing: i === s.quick.item && s.quick.editing })); },
    // ---- high-level setters used by the guide ----
    setAperture(v) { const i = APERTURES.indexOf(String(v)); if (i >= 0) { s.aperture = i; emit('exposure'); } },
    setShutter(v) { const i = SHUTTERS.indexOf(String(v)); if (i >= 0) { s.shutter = i; emit('exposure'); } },
    setIso(v) { const i = ISOS.indexOf(String(v).toUpperCase()); if (i >= 0) { s.iso = i; emit('exposure'); } },
    setEc(v) { const i = Math.round(Number(v) * 3) + 9; if (i >= 0 && i < EC_STEPS) { s.ec = i; emit('exposure'); } },
    setSetting(label, value) { const opts = label === '白平衡' ? WB_MODES : OPTIONS[label]; if (opts && opts.includes(value)) { set(label, value); toast(`${label}：${value}`); emit('setting'); return true; } return false; },
    setScreen(v) { if (['shoot', 'menu', 'quick', 'playback'].includes(v) && on()) { s.screen = v; emit('screen'); } },
    snapshot() { const d = api.display(); return { scene: SCENES[s.scene]?.name, power: d.power, stillMovie: d.stillMovie, screen: d.screen, mode: d.mode, modeName: d.modeName, shutter: d.shutter, aperture: d.aperture, iso: d.iso, ec: fmtEc(d.ec), af: d.af, afArea: d.afArea, drive: d.drive, wb: d.wb, quality: d.quality, metering: d.metering, shots: d.shots, remaining: d.remaining, recording: d.recording, menu: d.screen === 'menu' ? { tab: api.menuView().label, page: api.menuView().pageName, item: api.menuView().items[s.menu.item]?.label } : undefined, exposureStops: +api.exposure().stops.toFixed(2) }; }
  };
  function takeShot(selfTimer = false) {
    const d = api.display(); s.stats.stills++;
    s.shots.push({ id: s.shots.length + 1, type: 'still', selfTimer, mode: d.mode, shutter: d.shutter, aperture: d.aperture, iso: d.iso, ec: d.ec, quality: d.quality, exposure: api.exposure(), at: now() });
    s.afLocked = false; s.aeLock = false; emit('shot');
  }
  return api;
}
export const fmtEc = (thirds) => thirds === 0 ? '±0' : (thirds > 0 ? '+' : '−') + Math.abs(thirds / 3).toFixed(1).replace('.0', '');

const nearest = (list, f, target) => list.reduce((best, x) => Math.abs(f(x) - target) < Math.abs(f(best) - target) ? x : best, list[0]);

export function shutterSeconds(label) {
  if (label.startsWith('1/')) return 1 / parseFloat(label.slice(2));
  return parseFloat(label.replace('"', '.'));
}
