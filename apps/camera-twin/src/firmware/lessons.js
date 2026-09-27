// Teaching tasks. Each lesson has ordered goals checked live against the firmware state; the guide coaches with hints.
// Pure JS so the server can send the catalogue to the model and tests can run it.

const eq = (a, b) => String(a) === String(b);

export const LESSONS = [
  { id: 'power_and_mode', title: '开机并切到光圈优先', level: 1, intro: '认识电源开关和模式转盘。', goals: [
    { text: '把电源开关拨到 ON', check: d => d.power === 'on' || d.power === 'lock', hint: '电源开关在右肩速控转盘 2 的外圈，点击拨动，或按键盘 P。' },
    { text: '把模式转盘转到 Av', check: d => d.mode === 'Av', hint: '滚轮悬停在模式转盘上转动，或按逗号/句号。' }
  ] },
  { id: 'exposure_triangle', title: '曝光三要素：Av、F8、ISO 400', level: 1, intro: '在光圈优先下设定光圈和 ISO，观察快门自动变化。', goals: [
    { text: '开机', check: d => d.power !== 'off' },
    { text: '模式 Av', check: d => d.mode === 'Av', hint: '先转到 Av，后面主拨盘才会调光圈。' },
    { text: '光圈 F8.0', check: d => d.mode === 'Av' && eq(d.aperture, '8.0'), hint: 'Av 模式下滚动快门后方的主拨盘，往一个方向滚到 F8.0。' },
    { text: 'ISO 400', check: d => eq(d.iso, '400'), hint: '速控转盘 2（右肩后方竖立的滚轮）调 ISO，或按 [ ] 键。' }
  ] },
  { id: 'manual_exposure', title: '手动曝光：M、1/250、F5.6、ISO 800', level: 2, intro: 'M 模式下三要素都由你定，屏幕会真实变亮变暗。', goals: [
    { text: '模式 M', check: d => d.power !== 'off' && d.mode === 'M' },
    { text: '快门 1/250', check: d => d.mode === 'M' && eq(d.shutter, '1/250'), hint: 'M 模式下主拨盘调快门。' },
    { text: '光圈 F5.6', check: d => d.mode === 'M' && eq(d.aperture, '5.6'), hint: 'M 模式下背面的速控转盘 1（SET 外圈）调光圈。' },
    { text: 'ISO 800', check: d => eq(d.iso, '800'), hint: '速控转盘 2 调 ISO。' }
  ] },
  { id: 'servo_af', title: '切换到伺服自动对焦', level: 2, intro: '拍运动的东西要用 SERVO。', goals: [
    { text: '开机', check: d => d.power !== 'off' },
    { text: '自动对焦操作 = SERVO', check: d => eq(d.af, 'SERVO'), hint: '按 Q 打开速控屏，第一项就是 AF，主拨盘切换；或者 MENU → 自动对焦 → AF操作/区域 → 自动对焦操作。' }
  ] },
  { id: 'self_timer', title: '用 10 秒自拍拍一张', level: 2, intro: '改驱动模式并真的按下快门。', goals: [
    { text: '驱动模式 = 自拍:10秒', check: d => eq(d.drive, '自拍:10秒'), hint: 'Q 速控屏第三项"驱动"，主拨盘切到"自拍:10秒"。' },
    { text: '按快门开始倒计时并完成拍摄', check: (d, fw) => fw.state.shots.some(s => s.type === 'still' && s.selfTimer), hint: '设好后回到拍摄画面，按快门（空格），等倒计时结束。' }
  ] },
  { id: 'record_movie', title: '录一段短片', level: 2, intro: '照片/短片开关、录像按钮和回放。', goals: [
    { text: '拨到短片模式', check: d => d.stillMovie === 'movie', hint: '左肩的照片/短片切换开关，点击拨动，或按 S。' },
    { text: '按录像钮开始录制', check: (d, fw) => d.recording !== null || fw.state.shots.some(s => s.type === 'movie'), hint: '红点录像钮在模式转盘旁，或按 V。' },
    { text: '再按一次停止并保存', check: (d, fw) => fw.state.shots.some(s => s.type === 'movie'), hint: '录几秒后再按一次录像钮。' },
    { text: '回放看到这段短片', check: (d, fw) => d.screen === 'playback' && fw.state.shots[d.playIndex]?.type === 'movie', hint: '按回放按钮（背面左下）。' }
  ] },
  { id: 'format_card', title: '格式化存储卡', level: 3, intro: '在菜单里找到设置页签并完成一次确认操作。', goals: [
    { text: '打开菜单', check: d => d.screen === 'menu', hint: '按 MENU。' },
    { text: '进入"设置"页签的"文件/存储卡设置"', check: (d, fw) => d.screen === 'menu' && fw.menuView().label === '设置' && fw.menuView().page === 0, hint: '主拨盘切换主页签，第五个黄色扳手就是设置。' },
    { text: '选中"格式化存储卡"并按 SET，确认格式化', check: (d, fw) => fw.state.formattedAt !== undefined, hint: '速控转盘 1 往下选到第五项，SET，再选"确定"后 SET。' }
  ] },
  { id: 'playback_delete', title: '拍两张并删掉一张', level: 3, intro: '拍摄、回放翻页、删除确认。', goals: [
    { text: '拍下至少两张照片', check: (d, fw) => fw.state.stats.stills >= 2, hint: '拍摄画面下按快门（空格）两次。' },
    { text: '进入回放', check: d => d.screen === 'playback' },
    { text: '删除一张', check: (d, fw) => fw.state.stats.deleted >= 1, hint: '回放里按删除按钮（垃圾桶），选"删除"后 SET。' }
  ] }
];

export function createLessonRunner(fw) {
  let current = null; const listeners = new Set();
  const emit = () => listeners.forEach(l => l(status()));
  function status() {
    if (!current) return null;
    const d = fw.display(); const goals = current.lesson.goals.map((g, i) => ({ text: g.text, done: current.done[i] || false, hint: g.hint || '' }));
    // goals are ordered; a goal is only checked live once the previous ones are done, and stays done once achieved
    for (let i = 0; i < goals.length; i++) { if (goals[i].done) continue; if (i > 0 && !goals[i - 1].done) break; if (current.lesson.goals[i].check(d, fw)) { current.done[i] = true; goals[i].done = true; } else break; }
    const next = goals.findIndex(g => !g.done);
    const complete = next === -1;
    if (complete && !current.completedAt) current.completedAt = Date.now();
    return { id: current.lesson.id, title: current.lesson.title, intro: current.lesson.intro, goals, next, complete, startedAt: current.startedAt, completedAt: current.completedAt || null };
  }
  fw.subscribe(() => { if (current) emit(); });
  return {
    lessons: LESSONS.map(({ id, title, level, intro, goals }) => ({ id, title, level, intro, goals: goals.map(g => g.text) })),
    start(id) { const lesson = LESSONS.find(l => l.id === id); if (!lesson) return null; current = { lesson, done: [], startedAt: Date.now() }; emit(); return status(); },
    stop() { current = null; emit(); },
    status, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}
