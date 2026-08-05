import * as THREE from 'three';
import { MISSION, EXPO, CITY } from '../config.js';
import { clamp, makeRng } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  任务：找到 Sara 被关在哪
//
//  阶段一 · 追溯 —— 人群里藏着 3 个知情者，没有地图标记。
//     只有心灵回响：靠近才能感觉到。附身他们、读取记忆。
//  阶段二 · 渗透 —— 三条线索拼出 DODC 设施。禁区里平民会被喝止，
//     必须附身一名守卫走正门；用骚乱把守卫调开是唯一的窗口。
//  阶段三 · 撤离 —— 拿到记录，把意识带回本体。
// ═══════════════════════════════════════════════════════════

export const ST_TRACE = 0, ST_INFILTRATE = 1, ST_EXTRACT = 2, ST_DONE = 3;

const CLUES = [
  { who: '一个 DODC 后勤司机',
    text: '“……第 7 号车队每周二夜里从西侧闸口进，车里的东西不许登记。”',
    tag: '位置' },
  { who: '一个下夜班的护士',
    text: '“他们把她送来的时候还有呼吸。第二天单子上写的是‘样本回收’。”',
    tag: '时间' },
  { who: '一个换岗的保安',
    text: '“B 区那层不刷卡进不去。能进的只有穿制服的人 —— 只有。”',
    tag: '守卫' },
];

const FILLER = [
  '这人在想晚饭。', '这人刚被开除，还没敢告诉家里。',
  '这人在背一段台词。', '这人在数还有几站地铁。',
  '这人满脑子都是一首听过一次的歌。', '这人想着要不要打那通电话。',
  '这人在担心明天的检查结果。', '这人什么都没在想。',
];

export class Mission {
  constructor(city, crowd, seed = 8801) {
    this.rng = makeRng(seed);
    this.city = city; this.crowd = crowd;
    this.stage = ST_TRACE;
    this.found = 0;
    this.clues = [];
    this.expo = 0;
    this.failed = null;
    this.log = [];
    this.reading = 0;
    this.readTarget = null;
    this.evidence = false;

    // ── 设施：挑一栋离广场最远的建筑 ──
    let best = null, bd = -1;
    const c = city.plazaCenter || new THREE.Vector3();
    for (const b of city.boxes) {
      if (b.low || b.h < 20) continue;
      const d = Math.hypot(b.x - c.x, b.z - c.z);
      if (d > bd) { bd = d; best = b; }
    }
    this.facility = best
      ? { x: best.x, z: best.z, hw: best.hw, hd: best.hd, h: best.h }
      : { x: 0, z: 0, hw: 12, hd: 12, h: 30 };
    // 入口取靠向城中心的一侧
    const dx = c.x - this.facility.x, dz = c.z - this.facility.z;
    if (Math.abs(dx) > Math.abs(dz)) {
      this.gate = { x: this.facility.x + Math.sign(dx) * (this.facility.hw + 3.2), z: this.facility.z };
    } else {
      this.gate = { x: this.facility.x, z: this.facility.z + Math.sign(dz) * (this.facility.hd + 3.2) };
    }

    // ── 知情者：从人群里挑 3 个，分散在城市不同角落 ──
    const pool = crowd.a.filter(a => a.alive);
    const picked = [];
    for (let i = 0; i < MISSION.informants && pool.length; i++) {
      let bestA = null, bs = -1;
      for (let k = 0; k < 60; k++) {
        const cand = pool[(this.rng() * pool.length) | 0];
        if (!cand || cand.knows) continue;
        // 尽量远离已选的和设施
        let s = Math.hypot(cand.x - this.facility.x, cand.z - this.facility.z) * 0.35;
        for (const p of picked) s = Math.min(s, Math.hypot(cand.x - p.x, cand.z - p.z));
        if (s > bs) { bs = s; bestA = cand; }
      }
      if (!bestA) break;
      bestA.knows = { ...CLUES[i], read: false, idx: i };
      bestA.essential = true;        // 任务命脉，绝不能跑掉或被移除
      picked.push(bestA);
    }
    this.informants = picked;
    this.pushLog('琴：Sara 在他们手里。这条街上一定有人见过。');
  }

  pushLog(t) { this.log.unshift({ t, age: 0 }); if (this.log.length > 4) this.log.pop(); }

  inRestricted(x, z) {
    return Math.hypot(x - this.facility.x, z - this.facility.z) < MISSION.restrictedR;
  }
  atGate(x, z) {
    return Math.hypot(x - this.gate.x, z - this.gate.z) < 4.0;
  }

  /** 最近的未读知情者与距离（用于心灵回响） */
  nearestEcho(x, z) {
    let best = null, bd = Infinity;
    for (const a of this.informants) {
      if (!a.alive || a.knows.read) continue;
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < bd) { bd = d; best = a; }
    }
    return best ? { agent: best, d: bd } : null;
  }

  /** 读取当前宿主的记忆。返回 'clue' | 'filler' | null */
  read(host, dt) {
    if (!host) { this.reading = 0; this.readTarget = null; return null; }
    if (this.readTarget !== host) { this.readTarget = host; this.reading = 0; }
    this.reading += dt;
    if (this.reading < MISSION.readTime) return null;
    this.reading = 0;
    if (host.knows && !host.knows.read) {
      host.knows.read = true;
      this.found++;
      this.clues.push(host.knows);
      this.pushLog(`【${host.knows.tag}】${host.knows.text}`);
      if (this.found >= MISSION.informants) {
        this.stage = ST_INFILTRATE;
        this.pushLog('琴：三条线拼上了。B 区，只有穿制服的能进。');
      }
      return 'clue';
    }
    if (host.readOnce) return 'again';
    host.readOnce = true;
    this.pushLog(FILLER[(this.rng() * FILLER.length) | 0]);
    return 'filler';
  }

  addExpo(n) {
    this.expo = clamp(this.expo + n, 0, EXPO.max);
    // 满值即终局：不能让同一帧后面的自然衰减把它压回 99.96 —— 那样失败条件
    // 永远不触发，暴露度就成了一个永远填不满的槽。
    if (this.expo >= EXPO.max && !this.failed) this.failed = '本体被定位';
  }

  update(dt, ctx) {
    for (const l of this.log) l.age += dt;

    // 满值即终局（可能是上一帧 addExpo 推到的）
    if (this.expo >= EXPO.max && !this.failed) { this.failed = '本体被定位'; return; }

    // 本体附近的恐慌 = 被定位的风险
    let near = 0;
    for (const a of this.crowd.a)
      if (a.alive && a.state === 2 &&
          Math.hypot(a.x - ctx.bodyX, a.z - ctx.bodyZ) < EXPO.panicNearBody) near++;
    this.expo = clamp(this.expo + near * EXPO.panicRate * dt - (near ? 0 : EXPO.decay) * dt, 0, EXPO.max);

    if (this.expo >= EXPO.max && !this.failed) {
      this.failed = '本体被定位';
      return;
    }

    // 阶段二：以守卫身份走到闸口
    if (this.stage === ST_INFILTRATE && ctx.isGuardHost && this.atGate(ctx.x, ctx.z)) {
      this.stage = ST_EXTRACT;
      this.evidence = true;
      this.pushLog('【B 区】档案：Sara Grey — 状态“样本回收”。日期是三个月前。');
      this.pushLog('琴：她早就不在了。');
    }

    // 阶段三：把意识带回本体
    if (this.stage === ST_EXTRACT && ctx.inBody) this.stage = ST_DONE;
  }

  get objectiveMain() {
    switch (this.stage) {
      case ST_TRACE: return '追溯 — 找到见过她的人';
      case ST_INFILTRATE: return '渗透 — 以守卫身份进入 B 区';
      case ST_EXTRACT: return '撤离 — 把意识带回本体';
      default: return '完成';
    }
  }
  get objectiveSub() {
    switch (this.stage) {
      case ST_TRACE: return `记忆碎片 ${this.found}/${MISSION.informants} · 靠近才能感觉到回响`;
      case ST_INFILTRATE: return '平民进不去。附身一名守卫，或先制造骚乱把人调开';
      case ST_EXTRACT: return '回到本体所在的位置';
      default: return '';
    }
  }
}
