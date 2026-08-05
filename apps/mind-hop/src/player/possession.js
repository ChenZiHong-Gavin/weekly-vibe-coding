import * as THREE from 'three';
import { HOP, LINK } from '../config.js';
import { clamp } from '../core/utils.js';
import { S_STUN, S_PANIC } from '../world/crowd.js';

// ═══════════════════════════════════════════════════════════
//  附身系统
//
//  琴的身体留在原地、毫无防备；出去的是意识。
//  操控对象在「本体」与「宿主」之间整体切换 —— 包括相机。
//  进入与脱离时，被附身者都会踉跄一下；脱离后断片，随即惊慌。
//  链条稳定度随离本体的距离衰减，跳跃可以刷新，归零则被弹回。
// ═══════════════════════════════════════════════════════════

export const P_BODY = 0, P_TRAVEL = 1, P_HOST = 2, P_RETURN = 3;

function segHitsBox(x0, y0, z0, x1, y1, z1, b, pad = 0) {
  let tmin = 0, tmax = 1;
  const lo = [b.x - b.hw - pad, 0, b.z - b.hd - pad];
  const hi = [b.x + b.hw + pad, b.h + pad, b.z + b.hd + pad];
  const o = [x0, y0, z0], d = [x1 - x0, y1 - y0, z1 - z0];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) { if (o[i] < lo[i] || o[i] > hi[i]) return false; continue; }
    let t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i];
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export class Possession {
  constructor(jean, crowd, city, fx) {
    this.jean = jean; this.crowd = crowd; this.city = city; this.fx = fx;
    this.guards = null;

    this.state = P_BODY;
    this.host = null;            // 当前宿主 agent
    this.target = null;
    this.link = 100;
    this.chain = 0; this.chainT = 0;

    // 意识飞行
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.ctrl = new THREE.Vector3();
    this.spark = new THREE.Vector3();
    this.t = 0; this.dur = 0;
    this.pending = null;         // 传送到达后要附身的对象
    this.returning = false;

    this.stunT = 0;              // 被弹回后的眩晕
    this.hops = 0; this.burned = 0;
    this.onPossess = null;
    this.onRelease = null;
  }

  get range() { return this.state === P_HOST ? HOP.range : HOP.range * 0.9; }
  get inHost() { return this.state === P_HOST; }
  get busy() { return this.state === P_TRAVEL || this.state === P_RETURN; }

  /** 当前操控点（本体或宿主） */
  origin(out = new THREE.Vector3()) {
    if (this.state === P_HOST && this.host) return out.set(this.host.x, this.host.y, this.host.z);
    return out.copy(this.jean.pos);
  }

  distFromBody() {
    const o = this.origin(_o);
    return Math.hypot(o.x - this.jean.pos.x, o.z - this.jean.pos.z);
  }

  // ── 选靶 ──
  acquire(camDir) {
    if (this.busy || this.stunT > 0) { this.target = null; return null; }
    const o = this.origin(_o);
    const ox = o.x, oy = o.y + 1.4, oz = o.z;
    const R = this.range;
    let tight = null, ts = -Infinity, loose = null, ls = -Infinity;

    const consider = (px, py, pz, obj, kind, bonus) => {
      if (obj === this.host) return;
      const dx = px - ox, dy = py - oy, dz = pz - oz;
      const d = Math.hypot(dx, dy, dz);
      if (d > R || d < 0.9) return;
      const dot = (dx * camDir.x + dy * camDir.y + dz * camDir.z) / d;
      if (dot < -0.25) return;
      for (const b of this.city.boxes) {
        if (b.low) continue;
        if (segHitsBox(ox, oy, oz, px, py, pz, b, -0.2)) return;
      }
      const sc = dot * 3.2 + (1 - d / R) * 1.2 + bonus;
      if (dot >= 0.3) { if (sc > ts) { ts = sc; tight = { obj, kind, x: px, y: py, z: pz, d }; } }
      else if (sc > ls) { ls = sc; loose = { obj, kind, x: px, y: py, z: pz, d }; }
    };

    for (const a of this.crowd.candidates(ox, oz, R * 1.05, [])) {
      if (a.state === S_STUN) continue;
      consider(a.x, a.y + a.h * 0.62, a.z, a, 'crowd', a.knows ? 0.9 : 0);
    }
    if (this.guards) {
      for (const g of this.guards.list) {
        if (!g.alive || g.host || g.down) continue;
        consider(g.x, g.y + 1.15, g.z, g, 'guard', 0.6);
      }
    }
    this.target = tight || loose;
    return this.target;
  }

  canHop() { return !this.busy && this.stunT <= 0 && this.target; }

  /** 附身 / 换宿主 */
  hop(cam) {
    if (!this.canHop()) return false;
    const T = this.target;

    this.origin(this.from); this.from.y += 1.4;
    this.to.set(T.x, T.y, T.z);
    const dist = this.from.distanceTo(this.to);
    this.dur = HOP.travelBase + dist * HOP.travelPerM;
    this.ctrl.copy(this.from).add(this.to).multiplyScalar(0.5);
    this.ctrl.y += clamp(dist * 0.30, 0.6, 3.2);

    // 离开当前宿主
    if (this.host) this.#leave(this.host);

    this.state = P_TRAVEL; this.t = 0;
    this.pending = T.obj; this.pendingKind = T.kind;
    this.returning = false;
    this.chain = this.chainT > 0 ? Math.min(this.chain + 1, HOP.chainMax) : 0;
    this.chainT = HOP.chainWindow;
    this.hops++;
    cam?.addPunch(0.22);
    return true;
  }

  /** 主动撤回本体 */
  recall(cam) {
    if (this.busy || this.state === P_BODY) return false;
    this.#startReturn();
    return true;
  }

  /**
   * 铺设回程。不检查 busy —— 传输途中目标失效时必须能从 P_TRAVEL 直接转向，
   * 否则意识会永久卡在传输态（这是个真死锁，踩过）。
   */
  #startReturn(fromSpark = false) {
    if (fromSpark) this.from.copy(this.spark);
    else { this.origin(this.from); this.from.y += 1.4; }
    this.to.copy(this.jean.pos); this.to.y += 1.4;
    const dist = this.from.distanceTo(this.to);
    this.dur = clamp(0.25 + dist * 0.008, 0.25, 1.1);
    this.ctrl.copy(this.from).add(this.to).multiplyScalar(0.5);
    this.ctrl.y += clamp(dist * 0.18, 0.8, 6);
    if (this.host) this.#leave(this.host);
    this.state = P_RETURN; this.t = 0; this.returning = true;
    this.pending = null;
  }

  /** 链断：强制弹回，代价更大 */
  forceReturn(cam) {
    if (this.state === P_BODY || this.returning) return;
    const d = this.distFromBody();
    this.#startReturn(this.state === P_TRAVEL);
    this.pendingStun = 0.9 + d / 26;
    cam?.addShake(0.45, 30);
    this.fx.burst(this.jean.pos.x, this.jean.pos.y + 1.2, this.jean.pos.z, 1);
  }

  #leave(a) {
    a.host = false;
    a.stumble = HOP.stumbleOut;           // 脱离时踉跄
    a.stumbleDur = HOP.stumbleOut;
    a.stumbleDir = -1;
    if (a.isGuard) {
      // 守卫醒过来会当场警觉：这也是玩家附身守卫的代价
      a.suspect = Math.max(a.suspect, 55);
      a.investigate = 8; a.state = 1;
    } else {
      a.state = S_STUN;
      a.stunT = 1.35 + Math.random() * 0.5;   // 踉跄完就断片
      a.vx += (Math.random() - 0.5) * 3.0;
      a.vz += (Math.random() - 0.5) * 3.0;
    }
    this.burned++;
    this.host = null;
    this.onRelease?.(a);
  }

  #enter(a, cam) {
    a.host = true;
    if (!a.isGuard) { a.state = 0; a.stunT = 0; }
    a.stumble = HOP.stumbleIn;           // 进入时也踉跄
    a.stumbleDur = HOP.stumbleIn;
    a.stumbleDir = 1;
    this.host = a;
    this.state = P_HOST;
    this.link = Math.min(100, this.link + LINK.perJump);
    this.fx.burst(a.x, (a.y || 0) + 1.2, a.z, this.chain);
    cam?.addShake(0.14 + this.chain * 0.015, 26);
    this.onPossess?.(a);
  }

  update(dt, cam) {
    this.chainT = Math.max(0, this.chainT - dt);
    if (this.chainT === 0 && !this.busy) this.chain = 0;
    this.stunT = Math.max(0, this.stunT - dt);

    if (this.state === P_TRAVEL || this.state === P_RETURN) {
      this.t += dt;
      const u = clamp(this.t / this.dur, 0, 1);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const iu = 1 - e;
      this.spark.set(
        iu * iu * this.from.x + 2 * iu * e * this.ctrl.x + e * e * this.to.x,
        iu * iu * this.from.y + 2 * iu * e * this.ctrl.y + e * e * this.to.y,
        iu * iu * this.from.z + 2 * iu * e * this.ctrl.z + e * e * this.to.z);
      this.fx.trail(this.spark.x, this.spark.y, this.spark.z, this.chain);

      if (u >= 1) {
        if (this.returning) {
          this.state = P_BODY;
          this.stunT = this.pendingStun || 0;
          this.pendingStun = 0;
          this.link = Math.max(this.link, 12);
          this.fx.psiPuff(this.jean.pos.x, this.jean.pos.y + 1.2, this.jean.pos.z, 14);
        } else if (this.pending && this.pending.alive !== false && !this.pending.host) {
          this.#enter(this.pending, cam);
        } else {
          // 目标半空失效（跑了 / 被击倒 / 已被占用）→ 直接铺回程
          this.#startReturn(true);
        }
      }
      return;
    }

    // ── 链条稳定度 ──
    if (this.state === P_HOST) {
      const d = this.distFromBody();
      this.link -= (LINK.baseDecay + LINK.distDecay * d) * dt;
      if (this.link <= 0) { this.link = 0; this.forceReturn(cam); }
    } else if (this.state === P_BODY) {
      this.link = Math.min(100, this.link + LINK.bodyRegen * dt);
    }
  }
}

const _o = new THREE.Vector3();
