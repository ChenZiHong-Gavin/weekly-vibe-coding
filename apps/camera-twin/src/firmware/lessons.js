// Teaching tasks. Each lesson has ordered goals checked live against the firmware state; the guide coaches with hints.
// Pure JS so the server can send the catalogue to the model and tests can run it.

const eq = (a, b) => String(a) === String(b);
const near = (a, b, tol = 0.08) => typeof a === 'number' && Math.abs(a - b) / b <= tol;

const CANON_PORTRAIT = 'https://www.canon.com.cn/special/canon_portrait/';
// 人像课程：依据佳能（中国）「人像摄影专业技巧」系列（实践篇 / 对焦篇 / 曝光篇）改编到 R6 Mark III + RF 24-105 F4L。
export const PORTRAIT_LESSONS = [
  { id: 'portrait_bokeh', exif: [{ text: '拍摄模式 Av', check: x => x.program === 'Av' }, { text: '光圈开到最大（F4 或更大）', check: x => x.fnumber && x.fnumber <= 4.05 }, { text: '曝光补偿 +1/3 左右', check: x => x.ec >= 0.2 && x.ec <= 0.5 }], category: '人像', scene: 'kid', title: '人像 1：背景虚化的常用设置', level: 2, source: CANON_PORTRAIT + '1.html',
    intro: '佳能教程"场景 1"：用光圈优先固定光圈、开到最大，把背景大幅虚化；照片风格改成"人像"让肤色柔滑；竖拍多，所以关掉自动旋转。原文用 F2.8，这支 RF 24-105 最大 F4，变焦到 105mm 端虚化最明显。',
    goals: [
      { text: '模式 Av（光圈优先）', parts: ['mode_dial'], check: d => d.power !== 'off' && d.mode === 'Av', hint: '教程建议用光圈优先，光线变化时光圈也不会变。转动模式转盘到 Av。' },
      { text: '光圈开到最大 F4.0', parts: ['main_dial'], check: d => d.mode === 'Av' && eq(d.aperture, '4.0'), hint: '主拨盘往小数字方向滚到 F4.0，这是这支镜头的最大光圈。' },
      { text: '色彩模式 = 人像', parts: ['rate_button', 'q_button'], check: (d, fw) => eq(fw.get('色彩模式'), '人像'), hint: '教程技巧 3：照片风格选"人像"。Q 速控屏最后一项"色彩"，或者背面 RATE/COLOR 按钮循环切换。' },
      { text: '曝光补偿 +1/3', parts: ['quick_control_dial_1'], check: d => d.ec === 1, hint: '教程拍摄数据是 +1/3EV，让肤色明快。背面速控转盘 1 往右一格。' },
      { text: '自动旋转 = 关', parts: ['menu_button', 'screen'], check: (d, fw) => eq(fw.get('自动旋转'), '关'), hint: '教程技巧 2：竖拍回放时不要自动旋转。MENU → 设置 → 文件/存储卡设置 → 自动旋转。' }
    ] },
  { id: 'portrait_eyes', category: '人像', scene: 'kid', title: '人像 2：对焦在眼睛上', level: 2, source: CANON_PORTRAIT + '7.html',
    intro: '佳能"对焦篇"：人像的原则是针对眼部合焦。R6 Mark III 用被摄体检测 + 眼睛检测就能自动锁定眼睛；静止的人用 ONE SHOT，走动的人用 SERVO 持续追踪。',
    goals: [
      { text: '检测的被摄体 = 人物', parts: ['menu_button', 'screen'], check: (d, fw) => eq(fw.get('检测的被摄体'), '人物'), hint: 'MENU → 自动对焦 → 被摄体检测 → 检测的被摄体，选"人物"。' },
      { text: '眼睛检测 = 自动', parts: ['menu_button', 'screen'], check: (d, fw) => eq(fw.get('眼睛检测'), '自动'), hint: '同一页的下一项"眼睛检测"。' },
      { text: '自动对焦区域 = 整个区域', parts: ['af_point_button', 'q_button'], check: (d, fw) => eq(fw.get('自动对焦区域'), '整个区域'), hint: '让相机在整个画面里找人脸和眼睛。Q 速控屏第二项，或对焦区域按钮循环切换。' },
      { text: '自动对焦操作 = SERVO', parts: ['q_button', 'quick_control_dial_1', 'main_dial'], check: d => eq(d.af, 'SERVO'), hint: '人会动，用伺服自动对焦持续追踪眼睛。Q 速控屏第一项。' },
      { text: '半按快门或按 AF-ON 完成对焦', parts: ['shutter_button', 'af_on_button'], check: d => d.afLocked, hint: '按住画面里的快门按钮不放，或按 AF-ON（键盘 A），取景框变绿。' }
    ] },
  { id: 'portrait_backlit', exif: [{ text: '拍摄模式 Av', check: x => x.program === 'Av' }, { text: '点测光', check: x => x.metering === '点测光' }, { text: '曝光补偿 +1 左右', check: x => x.ec >= 0.6 && x.ec <= 1.4 }], category: '人像', scene: 'backlit', title: '人像 3：逆光人像的曝光', level: 3, source: CANON_PORTRAIT + '12.html',
    intro: '佳能"曝光篇"：逆光时相机会被明亮背景骗到，人脸变黑。两种办法：一是评价测光加正曝光补偿把脸提亮；二是用点测光对准脸，再按自动曝光锁固定曝光后重新构图。高光色调优先能保住背景的亮部细节。',
    goals: [
      { text: '模式 Av', parts: ['mode_dial'], check: d => d.power !== 'off' && d.mode === 'Av' },
      { text: '测光模式 = 点测光', parts: ['q_button', 'quick_control_dial_1', 'main_dial'], check: (d, fw) => eq(fw.get('测光模式'), '点测光'), hint: 'Q 速控屏"测光"项，或 MENU → 拍摄 → 曝光 → 测光模式。' },
      { text: '对准人脸按 AE 锁（✱），看屏幕上脸部变亮、背景变亮', parts: ['ae_lock_button'], check: (d, fw) => d.aeLock && fw.exposure().faceStops >= -0.5, hint: '点测光对准人脸后按背面右上的星号按钮（键盘 L），屏幕左上出现 ✱，脸就不再发黑。' },
      { text: '曝光补偿 +1', parts: ['quick_control_dial_1'], check: d => d.ec === 3, hint: '教程说逆光脸暗就加正补偿。速控转盘 1 往右三格到 +1。' },
      { text: '高光色调优先 = 启用', parts: ['menu_button', 'screen'], check: (d, fw) => eq(fw.get('高光色调优先'), '启用'), hint: '场景 2 技巧 3：亮度差大时启用高光色调优先。MENU → 拍摄 → 色彩/色调/动态范围。' }
    ] },
  { id: 'portrait_lowkey', exif: [{ text: '光圈 F4', check: x => near(x.fnumber, 4) }, { text: 'ISO 250 左右', check: x => x.iso >= 200 && x.iso <= 320 }, { text: '曝光补偿 -1 左右', check: x => x.ec <= -0.6 && x.ec >= -1.4 }], category: '人像', scene: 'lowkey', title: '人像 4：暗调人像', level: 3, source: CANON_PORTRAIT + '4.html',
    intro: '佳能"场景 4"：有意让脸部曝光不足做出暗调，关键是负曝光补偿，并且关掉自动亮度优化，否则相机会把暗部又提亮回去。原文 F4、1/60、ISO 250、-1EV。',
    goals: [
      { text: '模式 Av，光圈 F4.0', parts: ['mode_dial', 'main_dial'], check: d => d.power !== 'off' && d.mode === 'Av' && eq(d.aperture, '4.0') },
      { text: 'ISO 250', parts: ['quick_control_dial_2'], check: d => eq(d.iso, '250'), hint: '速控转盘 2 调 ISO，或 [ ] 键。' },
      { text: '曝光补偿 -1', parts: ['quick_control_dial_1'], check: d => d.ec === -3, hint: '速控转盘 1 往左三格。' },
      { text: '自动亮度优化 = 关闭', parts: ['menu_button', 'screen'], check: (d, fw) => eq(fw.get('自动亮度优化'), '关闭'), hint: '教程技巧 2。MENU → 拍摄 → 色彩/色调/动态范围 → 自动亮度优化。' }
    ] },
  { id: 'portrait_mono', exif: [{ text: 'ISO 3200 或更高', check: x => x.iso >= 3200 }, { text: '曝光补偿 +2/3 左右', check: x => x.ec >= 0.5 && x.ec <= 0.8 }], category: '人像', scene: 'lowkey', title: '人像 5：黑白颗粒人像', level: 3, source: CANON_PORTRAIT + '5.html',
    intro: '佳能"场景 5"：把照片风格设成"单色"，大胆提高 ISO 利用噪点做颗粒感，并关掉高 ISO 降噪让颗粒保留。原文 F2、1/160、ISO 3200、+2/3EV。',
    goals: [
      { text: '色彩模式 = 单色', parts: ['rate_button', 'q_button'], check: (d, fw) => eq(fw.get('色彩模式'), '单色'), hint: 'Q 速控屏最后一项"色彩"，或 RATE/COLOR 按钮循环。' },
      { text: 'ISO 3200', parts: ['quick_control_dial_2'], check: d => eq(d.iso, '3200'), hint: '速控转盘 2 一路往上。' },
      { text: '高ISO感光度降噪功能 = 关', parts: ['menu_button', 'screen'], check: (d, fw) => eq(fw.get('高ISO感光度降噪功能'), '关'), hint: '教程技巧 4。MENU → 拍摄 → 白平衡/画质校正。' },
      { text: '曝光补偿 +2/3', parts: ['quick_control_dial_1'], check: d => d.ec === 2, hint: '速控转盘 1 往右两格。' }
    ] },
  { id: 'portrait_kids', exif: [{ text: 'ISO 800 或更高', check: x => x.iso >= 800 }, { text: '快门不慢于 1/250', check: x => x.exposureTime && x.exposureTime <= 1 / 250 }], category: '人像', scene: 'kid', title: '人像 6：抓拍孩子的表情', level: 2, source: CANON_PORTRAIT + '2.html',
    intro: '佳能"场景 2"技巧 4：为了捕捉瞬间的表情变化，把驱动模式设为连拍；光线不足就适当提高 ISO。配合伺服对焦和人物检测，连按快门时眼睛始终清楚。',
    goals: [
      { text: '驱动模式 = 高速连拍+', parts: ['q_button', 'quick_control_dial_1', 'main_dial'], check: (d, fw) => eq(fw.get('驱动模式'), '高速连拍+'), hint: 'Q 速控屏第三项"驱动"。' },
      { text: '自动对焦操作 = SERVO', parts: ['q_button', 'quick_control_dial_1', 'main_dial'], check: d => eq(d.af, 'SERVO') },
      { text: '检测的被摄体 = 人物', parts: ['menu_button', 'screen'], check: (d, fw) => eq(fw.get('检测的被摄体'), '人物') },
      { text: 'ISO 至少 800', parts: ['quick_control_dial_2'], check: d => d.iso !== '' && !eq(d.iso, 'AUTO') && parseInt(d.iso, 10) >= 800, hint: '室内光线不足，速控转盘 2 把 ISO 提到 800 或更高。' },
      { text: '拍下至少 3 张', parts: ['shutter_button'], check: (d, fw) => fw.state.stats.stills >= 3, hint: '回到拍摄画面连按三次快门（空格）。' }
    ] }
];

export const LESSONS = [
  { id: 'power_and_mode', exif: [{ text: '拍摄模式 Av', check: x => x.program === 'Av' }], title: '开机并切到光圈优先', level: 1, intro: '认识电源开关和模式转盘。', goals: [
    { text: '把电源开关拨到 ON', parts: ['power_switch'], check: d => d.power === 'on' || d.power === 'lock', hint: '电源开关在右肩速控转盘 2 的外圈，点击拨动，或按键盘 P。' },
    { text: '把模式转盘转到 Av', parts: ['mode_dial'], check: d => d.mode === 'Av', hint: '滚轮悬停在模式转盘上转动，或按逗号/句号。' }
  ] },
  { id: 'exposure_triangle', exif: [{ text: '拍摄模式 Av', check: x => x.program === 'Av' }, { text: '光圈 F8', check: x => near(x.fnumber, 8) }, { text: 'ISO 400', check: x => x.iso === 400 }], title: '曝光三要素：Av、F8、ISO 400', level: 1, intro: '在光圈优先下设定光圈和 ISO，观察快门自动变化。', goals: [
    { text: '开机', parts: ['power_switch'], check: d => d.power !== 'off' },
    { text: '模式 Av', parts: ['mode_dial'], check: d => d.mode === 'Av', hint: '先转到 Av，后面主拨盘才会调光圈。' },
    { text: '光圈 F8.0', parts: ['main_dial'], check: d => d.mode === 'Av' && eq(d.aperture, '8.0'), hint: 'Av 模式下滚动快门后方的主拨盘，往一个方向滚到 F8.0。' },
    { text: 'ISO 400', parts: ['quick_control_dial_2'], check: d => eq(d.iso, '400'), hint: '速控转盘 2（右肩后方竖立的滚轮）调 ISO，或按 [ ] 键。' }
  ] },
  { id: 'manual_exposure', exif: [{ text: '拍摄模式 M', check: x => x.program === 'M' }, { text: '快门 1/250', check: x => near(x.exposureTime, 1 / 250) }, { text: '光圈 F5.6', check: x => near(x.fnumber, 5.6) }, { text: 'ISO 800', check: x => x.iso === 800 }], title: '手动曝光：M、1/250、F5.6、ISO 800', level: 2, intro: 'M 模式下三要素都由你定，屏幕会真实变亮变暗。', goals: [
    { text: '模式 M', parts: ['mode_dial'], check: d => d.power !== 'off' && d.mode === 'M' },
    { text: '快门 1/250', parts: ['main_dial'], check: d => d.mode === 'M' && eq(d.shutter, '1/250'), hint: 'M 模式下主拨盘调快门。' },
    { text: '光圈 F5.6', parts: ['quick_control_dial_1'], check: d => d.mode === 'M' && eq(d.aperture, '5.6'), hint: 'M 模式下背面的速控转盘 1（SET 外圈）调光圈。' },
    { text: 'ISO 800', parts: ['quick_control_dial_2'], check: d => eq(d.iso, '800'), hint: '速控转盘 2 调 ISO。' }
  ] },
  { id: 'servo_af', title: '切换到伺服自动对焦', level: 2, intro: '拍运动的东西要用 SERVO。', goals: [
    { text: '开机', parts: ['power_switch'], check: d => d.power !== 'off' },
    { text: '自动对焦操作 = SERVO', parts: ['q_button', 'quick_control_dial_1', 'main_dial'], check: d => eq(d.af, 'SERVO'), hint: '按 Q 打开速控屏，第一项就是 AF，主拨盘切换；或者 MENU → 自动对焦 → AF操作/区域 → 自动对焦操作。' }
  ] },
  { id: 'self_timer', title: '用 10 秒自拍拍一张', level: 2, intro: '改驱动模式并真的按下快门。', goals: [
    { text: '驱动模式 = 自拍:10秒', parts: ['q_button', 'quick_control_dial_1', 'main_dial'], check: d => eq(d.drive, '自拍:10秒'), hint: 'Q 速控屏第三项"驱动"，主拨盘切到"自拍:10秒"。' },
    { text: '按快门开始倒计时并完成拍摄', parts: ['shutter_button'], check: (d, fw) => fw.state.shots.some(s => s.type === 'still' && s.selfTimer), hint: '设好后回到拍摄画面，按快门（空格），等倒计时结束。' }
  ] },
  { id: 'record_movie', title: '录一段短片', level: 2, intro: '照片/短片开关、录像按钮和回放。', goals: [
    { text: '拨到短片模式', parts: ['still_movie_switch'], check: d => d.stillMovie === 'movie', hint: '左肩的照片/短片切换开关，点击拨动，或按 S。' },
    { text: '按录像钮开始录制', parts: ['movie_button'], check: (d, fw) => d.recording !== null || fw.state.shots.some(s => s.type === 'movie'), hint: '红点录像钮在模式转盘旁，或按 V。' },
    { text: '再按一次停止并保存', parts: ['movie_button'], check: (d, fw) => fw.state.shots.some(s => s.type === 'movie'), hint: '录几秒后再按一次录像钮。' },
    { text: '回放看到这段短片', parts: ['playback_button'], check: (d, fw) => d.screen === 'playback' && fw.state.shots[d.playIndex]?.type === 'movie', hint: '按回放按钮（背面左下）。' }
  ] },
  { id: 'format_card', title: '格式化存储卡', level: 3, intro: '在菜单里找到设置页签并完成一次确认操作。', goals: [
    { text: '打开菜单', parts: ['menu_button'], check: d => d.screen === 'menu', hint: '按 MENU。' },
    { text: '进入"设置"页签的"文件/存储卡设置"', parts: ['main_dial', 'screen'], check: (d, fw) => d.screen === 'menu' && fw.menuView().label === '设置' && fw.menuView().page === 0, hint: '主拨盘切换主页签，第五个黄色扳手就是设置。' },
    { text: '选中"格式化存储卡"并按 SET，确认格式化', parts: ['quick_control_dial_1', 'set_button'], check: (d, fw) => fw.state.formattedAt !== undefined, hint: '速控转盘 1 往下选到第五项，SET，再选"确定"后 SET。' }
  ] },
  { id: 'playback_delete', title: '拍两张并删掉一张', level: 3, intro: '拍摄、回放翻页、删除确认。', goals: [
    { text: '拍下至少两张照片', parts: ['shutter_button'], check: (d, fw) => fw.state.stats.stills >= 2, hint: '拍摄画面下按快门（空格）两次。' },
    { text: '进入回放', parts: ['playback_button'], check: d => d.screen === 'playback' },
    { text: '删除一张', parts: ['erase_button', 'set_button'], check: (d, fw) => fw.state.stats.deleted >= 1, hint: '回放里按删除按钮（垃圾桶），选"删除"后 SET。' }
  ] }
].map(l => ({ category: '基础', ...l })).concat(PORTRAIT_LESSONS);

export function createLessonRunner(fw) {
  let current = null; const listeners = new Set();
  const emit = () => listeners.forEach(l => l(status()));
  function status() {
    if (!current) return null;
    const d = fw.display(); const goals = current.lesson.goals.map((g, i) => ({ text: g.text, done: current.done[i] || false, hint: g.hint || '', parts: g.parts || [] }));
    // goals are ordered; a goal is only checked live once the previous ones are done, and stays done once achieved
    for (let i = 0; i < goals.length; i++) { if (goals[i].done) continue; if (i > 0 && !goals[i - 1].done) break; if (current.lesson.goals[i].check(d, fw)) { current.done[i] = true; goals[i].done = true; } else break; }
    const next = goals.findIndex(g => !g.done);
    const complete = next === -1;
    if (complete && !current.completedAt) current.completedAt = Date.now();
    return { id: current.lesson.id, title: current.lesson.title, category: current.lesson.category, source: current.lesson.source || null, intro: current.lesson.intro, goals, next, complete, nextParts: next >= 0 ? goals[next].parts : [], exif: current.lesson.exif || null, startedAt: current.startedAt, completedAt: current.completedAt || null };
  }
  fw.subscribe(() => { if (current) emit(); });
  return {
    lessons: LESSONS.map(({ id, title, level, category, source, intro, goals }) => ({ id, title, level, category, source: source || null, intro, goals: goals.map(g => g.text) })),
    start(id) { const lesson = LESSONS.find(l => l.id === id); if (!lesson) return null; current = { lesson, done: [], startedAt: Date.now() }; fw.setScene?.(lesson.scene || 'landscape'); emit(); return status(); },
    stop() { current = null; fw.setScene?.('landscape'); emit(); },
    status, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}
