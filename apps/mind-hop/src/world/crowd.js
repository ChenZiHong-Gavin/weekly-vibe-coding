import * as THREE from 'three';
import { CROWD, CITY } from '../config.js';
import { SpatialHash, clamp, makeRng, shortAngle } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  人群仿真 —— Helbing social force model，跑在 XZ 平面上
//  驱动力 + 各向异性社会斥力 + 接触/摩擦力 + 建筑墙力
//  状态：calm / stun / panic / frozen / host(被玩家附身)
// ═══════════════════════════════════════════════════════════

export const S_CALM = 0, S_STUN = 1, S_PANIC = 2, S_FROZEN = 3;
export const CLIP_IDLE = 0, CLIP_WALK = 1, CLIP_RUN = 2;

const nbuf = [];

export class Crowd {
  constructor(city, count, seed = 99) {
    this.city = city;
    this.rng = makeRng(seed);
    this.hash = new SpatialHash(2.6);
    this.a = [];
    const R = this.rng;
    for (let i = 0; i < count; i++) {
      const p = city.randomWalkPoint(R);
      const g = city.randomWalkPoint(R);
      this.a.push({
        i,
        x: p.x + (R() - 0.5) * 3, z: p.y + (R() - 0.5) * 3, y: 0,
        vx: 0, vz: 0,
        r: CROWD.radius[0] + R() * (CROWD.radius[1] - CROWD.radius[0]),
        m: CROWD.mass * (0.85 + R() * 0.3),
        v0: CROWD.vCalm * (0.82 + R() * 0.36),
        h: 1.52 + R() * 0.44,               // 身高
        gx: g.x, gz: g.y,
        yaw: R() * Math.PI * 2, gawk: 0, gx: 0, gz: 0,
        state: S_CALM, stunT: 0, freezeT: 0,
        stumble: 0, stumbleDur: 0.6, stumbleDir: 1, knows: null, essential: false,
        // 每个人都能被附身。早先有 7% 的「增强人类」会把你弹开，但一个
        // 外观上看不出区别、走过去又进不去的人，只会被读作"游戏坏了"。
        // 想保留"有人挡得住"这一层，得先让他在外观上可辨。
        host: false, immune: false,
        // 0=Michelle(年轻女性) 1=readyplayer(西装男) —— 两种截然不同的轮廓
        model: R() < 0.42 ? 1 : 0,
        // 程序化体型：宽窄 + 高矮独立变化，让远景剪影不重复
        girth: 0.88 + R() * 0.26,
        clip: CLIP_IDLE, phase: R(),
        blend: 0,
        // 换装参数：色相旋转 / 饱和度 / 明度（不是颜色，见 crowdRender.setLook）
        hue: (R() - 0.5) * Math.PI * 2,
        sat: 0.55 + R() * 1.05,
        val: 0.72 + R() * 0.62,
        alive: true, repathT: R() * 6,
      });
    }
    this.count = count;
    this.burned = 0;
  }

  /** 玩家当前附身的 agent（null = 未附身） */
  host = null;

  possess(agent) {
    if (this.host) this.release(this.host);
    agent.host = true; agent.state = S_CALM; agent.stunT = 0;
    this.host = agent;
  }
  release(agent, stun = 1.25) {
    agent.host = false;
    agent.state = S_STUN; agent.stunT = stun;
    if (this.host === agent) this.host = null;
  }

  /** 失衡冲量，配合 stumble 计时用 */
  lurch(agent, strength = 2.2) {
    const a = Math.random() * Math.PI * 2;
    agent.vx += Math.cos(a) * strength;
    agent.vz += Math.sin(a) * strength;
  }

  freezeAll(center, radius, time) {
    let n = 0;
    for (const a of this.a) {
      if (!a.alive || a.host) continue;
      const d = Math.hypot(a.x - center.x, a.z - center.z);
      if (d < radius) { a.state = S_FROZEN; a.freezeT = time; a.vx = a.vz = 0; n++; }
    }
    return n;
  }

  panicAt(x, z, radius) {
    for (const a of this.a) {
      if (!a.alive || a.host || a.state === S_FROZEN) continue;
      if (Math.hypot(a.x - x, a.z - z) < radius) a.state = S_PANIC;
    }
  }

  /**
   * 有人在众目睽睽之下被附身。附近的平民不会报警，但会侧目、后退、
   * 绕开那个"忽然断线的人" —— 这一小圈骚动本身就是守卫会注意到的东西。
   * @returns {number} 目击的平民数
   */
  gawkAt(x, z, radius) {
    let n = 0;
    for (const a of this.a) {
      if (!a.alive || a.host || a.state === S_FROZEN) continue;
      const d = Math.hypot(a.x - x, a.z - z);
      if (d > radius) continue;
      a.gx = x; a.gz = z; a.gawk = 1.6;          // 朝那边看一会儿
      if (d < radius * 0.45) a.state = S_PANIC;  // 近到看清脸的，直接退开
      n++;
    }
    return n;
  }

  // ── 一步物理 ──
  step(dt, hostInput) {
    const C = CROWD, city = this.city;
    this.hash.clear();
    for (const a of this.a) if (a.alive) this.hash.insert(a, a.x, a.z);

    for (const a of this.a) {
      if (!a.alive) continue;

      // ── 目标 ──
      let ex = 0, ez = 0, v0 = a.v0, tau = C.tau;
      if (a.host) {
        ex = hostInput.x; ez = hostInput.z; v0 = hostInput.speed; tau = C.tauHost;
      } else if (a.state === S_FROZEN) {
        a.freezeT -= dt; if (a.freezeT <= 0) { a.state = S_PANIC; }
        a.vx *= 0.001; a.vz *= 0.001; v0 = 0;
      } else if (a.state === S_STUN) {
        a.stunT -= dt; v0 = 0;
        // 踉跄期间不急刹 —— 让失衡的动量继续走两步
        if (a.stumble > 0) { a.stumble = Math.max(0, a.stumble - dt); tau = 1.5; }
        if (a.stunT <= 0) { a.state = S_PANIC; this.burned++; }
      } else if (a.state === S_PANIC) {
        // 逃离城市外缘
        const l = Math.hypot(a.x, a.z) || 1;
        ex = a.x / l; ez = a.z / l; v0 = C.vPanic * (0.9 + this.rng() * 0.2);
      } else {
        a.repathT -= dt;
        // 没有寻路：目标落在建筑对面时，agent 会一直顶着墙推，
        // 于是街上留下几个"站着不动的人"。长时间几乎不动就换目标。
        // 阈值不能太低：贴墙缓行的人速度 0.3~0.5，看着就是不动
        if (Math.hypot(a.vx, a.vz) < CROWD.stuckSpeed) a.stuckT = (a.stuckT || 0) + dt;
        else a.stuckT = 0;
        const dx = a.gx - a.x, dz = a.gz - a.z;
        const L = Math.hypot(dx, dz);
        if (L < 1.4 || a.repathT <= 0 || a.stuckT > 1.6) {
          a.stuckT = 0;
          this.#pickGoal(a);
        } else { ex = dx / L; ez = dz / L; }
      }

      let fx = a.m * (v0 * ex - a.vx) / tau;
      let fz = a.m * (v0 * ez - a.vz) / tau;

      // ── 人–人 ──
      this.hash.query(a.x, a.z, C.cutoff, nbuf);
      const sp = Math.hypot(a.vx, a.vz);
      for (let k = 0; k < nbuf.length; k++) {
        const o = nbuf[k];
        if (o === a || !o.alive) continue;
        let dx = a.x - o.x, dz = a.z - o.z;
        let d = Math.hypot(dx, dz);
        if (d > C.cutoff) continue;
        if (d < 1e-5) { dx = this.rng() - 0.5; dz = this.rng() - 0.5; d = Math.hypot(dx, dz) || 1e-5; }
        const nx = dx / d, nz = dz / d;
        const ov = (a.r + o.r) - d;

        let aniso = 1;
        if (sp > 0.05) {
          const c = (-nx * (a.vx / sp)) + (-nz * (a.vz / sp));
          aniso = C.lambda + (1 - C.lambda) * (1 + c) * 0.5;
        }
        const yld = a.host ? C.hostYield : 1;
        const rep = C.A * Math.exp(ov / C.B) * aniso * yld;
        fx += rep * nx; fz += rep * nz;

        if (ov > 0) {
          const o2 = Math.min(ov, 0.10) * (a.host ? C.hostContact : 1);
          fx += C.kBody * o2 * nx; fz += C.kBody * o2 * nz;
          const tx = -nz, tz = nx;
          const dvt = (o.vx - a.vx) * tx + (o.vz - a.vz) * tz;
          fx += C.kappa * o2 * dvt * tx; fz += C.kappa * o2 * dvt * tz;
        }
      }

      // ── 建筑墙力 ──
      for (const b of city.boxes) {
        if (b.low) continue;
        const dx = a.x - b.x, dz = a.z - b.z;
        if (Math.abs(dx) > b.hw + C.cutoff || Math.abs(dz) > b.hd + C.cutoff) continue;
        const px = clamp(a.x, b.x - b.hw, b.x + b.hw);
        const pz = clamp(a.z, b.z - b.hd, b.z + b.hd);
        let ox = a.x - px, oz = a.z - pz;
        let d = Math.hypot(ox, oz);
        if (d > C.cutoff) continue;
        if (d < 1e-5) {                        // 陷在里面：朝最近的面推
          const l = (b.x - b.hw) - a.x, r = a.x - (b.x + b.hw);
          const u = (b.z - b.hd) - a.z, w = a.z - (b.z + b.hd);
          const mx = Math.max(l, r), mz = Math.max(u, w);
          if (mx > mz) { ox = Math.sign(dx || 1); oz = 0; } else { ox = 0; oz = Math.sign(dz || 1); }
          d = 1e-5;
        }
        const nx = ox / d, nz = oz / d, ov = a.r - d;
        const rep = C.aWall * Math.exp(ov / C.bWall);
        fx += rep * nx; fz += rep * nz;
        if (ov > 0) {
          const o2 = Math.min(ov, 0.12);
          fx += C.kBody * o2 * nx; fz += C.kBody * o2 * nz;
        }
      }

      if (!a.host) { fx += (this.rng() - 0.5) * 60; fz += (this.rng() - 0.5) * 60; }
      a.fx = fx; a.fz = fz;
    }

    // ── 积分 ──
    for (const a of this.a) {
      if (!a.alive) continue;
      a.vx += a.fx / a.m * dt; a.vz += a.fz / a.m * dt;
      const s = Math.hypot(a.vx, a.vz);
      const mx = a.host ? 9.5 : a.state === S_PANIC ? 5.2 : 2.7;
      if (s > mx) { a.vx *= mx / s; a.vz *= mx / s; }
      a.x += a.vx * dt; a.z += a.vz * dt;
      // 宿主也不许走出世界（玩家会一直按着 W）
      if (a.host) {
        const lim = CITY.half - 3;
        a.x = clamp(a.x, -lim, lim); a.z = clamp(a.z, -lim, lim);
      }

      // 朝向跟随速度；刚看到有人"断线"的，先转头去看那边几秒
      const sp = Math.hypot(a.vx, a.vz);
      if (a.gawk > 0) {
        a.gawk -= dt;
        const want = Math.atan2(a.gx - a.x, a.gz - a.z);
        a.yaw += shortAngle(a.yaw, want) * Math.min(1, dt * 6);
      } else if (sp > 0.12) {
        const want = Math.atan2(a.vx, a.vz);
        a.yaw += shortAngle(a.yaw, want) * Math.min(1, dt * 11);
      }

      // ── 动画状态 ──
      // 相位速率必须有下限：phase += dt*sp/stride 在低速时会让走路循环
      // 慢到 5 秒一圈 —— 腿分开定在半步上，肉眼就是"冻住的人"。
      // 而且低速时干脆用待机，而不是播一个超慢的走路。
      let clip = CLIP_IDLE, stride = 1;
      if (sp > 3.0) { clip = CLIP_RUN; stride = 3.9; }
      else if (sp > CROWD.walkAnimMin) { clip = CLIP_WALK; stride = 1.55; }
      if (a.state === S_FROZEN || a.state === S_STUN) {
        clip = CLIP_IDLE; a.phase += dt * 0.06;
      } else if (clip === CLIP_IDLE) {
        a.phase += dt * 0.55;
      } else {
        // 每秒至少走完 CROWD.phaseMin 圈，看起来才像在迈步
        a.phase += dt * Math.max(sp / stride, CROWD.phaseMin);
      }
      a.clip = clip;
      a.phase -= Math.floor(a.phase);

      // 恐慌传染
      if (a.state === S_PANIC) {
        this.hash.query(a.x, a.z, CROWD.panicRadius, nbuf);
        for (let k = 0; k < nbuf.length; k++) {
          const o = nbuf[k];
          if (o.alive && o.state === S_CALM && !o.host &&
              Math.hypot(o.x - a.x, o.z - a.z) < CROWD.panicRadius &&
              this.rng() < CROWD.panicRate * dt) o.state = S_PANIC;
        }
        // 逃出城 → 移除。但关键 NPC（知情者）绝不能消失，否则任务无法完成：
        // 他们跑到城缘就冷静下来，被夹在城里。
        if (a.essential) {
          a.panicT = (a.panicT || 0) + dt;
          const lim = CITY.half - 6;
          if (Math.abs(a.x) > lim || Math.abs(a.z) > lim || a.panicT > 9) {
            a.state = S_CALM; a.panicT = 0;
            a.x = clamp(a.x, -lim, lim); a.z = clamp(a.z, -lim, lim);
            const g = city.randomWalkPoint(this.rng);
            a.gx = g.x; a.gz = g.y; a.repathT = 10;
          }
        } else if (Math.abs(a.x) > CITY.half + 24 || Math.abs(a.z) > CITY.half + 24) {
          a.alive = false;
        }
      }
    }
  }

  /**
   * 选一个「朝那边真的走得动」的目标。
   *
   * 只随机挑一个 walkPoint 是不够的：目标常常落在建筑后面，agent 一路顶墙，
   * 被 stuck 逻辑救起后又挑到另一个墙后目标 —— 来回乒乓，看起来就是卡住了。
   * 所以候选目标必须满足「从当前位置出发前 25m 通畅」。
   * 全都不通就退化成"朝最开阔的方向走一段"，先脱离墙角再说。
   */
  #pickGoal(a) {
    const city = this.city;
    a.repathT = 8 + this.rng() * 14;
    // 在"通畅"的候选里挑一个既够远又不太远的：walkPoints 是绕街区一圈的环，
    // 只要通畅就选最近的话，会反复选到同侧的点，人就在一小段路上来回兜圈
    //（实测净位移 1~2m 但路程 13~18m）。评分偏好 18~45m 这一档。
    let best = null, bestScore = -Infinity;
    for (let k = 0; k < 12; k++) {
      const c = city.randomWalkPoint(this.rng);
      const d = Math.hypot(c.x - a.x, c.y - a.z);
      if (d < 12) continue;
      if (!city.clearPath(a.x, a.z, c.x, c.y)) continue;
      // 离上一个目标也要有差异，别在两点之间来回
      const dPrev = Math.hypot(c.x - a.gx, c.y - a.gz);
      const score = -Math.abs(d - 30) * 0.6 + Math.min(dPrev, 25) * 0.5;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (best) { a.gx = best.x; a.gz = best.y; return; }

    // 全被挡住 → 找最开阔的方向，先走出墙角
    let bx = a.x, bz = a.z, bestRun = -1;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + this.rng() * 0.25;
      const ux = Math.cos(ang), uz = Math.sin(ang);
      let run = 0;
      for (let t = 2; t <= 22; t += 2) {
        if (city.isBlocked(a.x + ux * t, a.z + uz * t, 0.6)) break;
        run = t;
      }
      if (run > bestRun) { bestRun = run; bx = a.x + ux * run; bz = a.z + uz * run; }
    }
    a.gx = bx; a.gz = bz;
    a.repathT = 3 + this.rng() * 3;      // 脱困目标短一点，很快再重选
  }

  /** 半径内可附身的目标 */
  candidates(x, z, range, out = []) {
    out.length = 0;
    this.hash.query(x, z, range, nbuf);
    for (let k = 0; k < nbuf.length; k++) {
      const o = nbuf[k];
      if (!o.alive || o.host) continue;
      if (Math.hypot(o.x - x, o.z - z) <= range) out.push(o);
    }
    return out;
  }

  aliveCount() { let n = 0; for (const a of this.a) if (a.alive) n++; return n; }
}
