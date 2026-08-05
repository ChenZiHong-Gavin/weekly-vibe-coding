import * as THREE from 'three';
import { DODC, MISSION, CROWD, WITNESS } from '../config.js';
import { clamp, damp, shortAngle, makeRng } from '../core/utils.js';
import { CLIP_IDLE, CLIP_WALK, CLIP_RUN } from './crowd.js';

// ═══════════════════════════════════════════════════════════
//  DODC 守卫
//
//  他们不是靶子，是"眼睛"。核心是怀疑度：
//    · 视锥内出现刚被附身、走路发飘的人 → 怀疑上升
//    · 平民闯进设施禁区 → 直接怀疑
//    · 怀疑满且贴近 → 制服（把你从宿主里赶出去）
//    · 听到骚乱 → 离岗去查（这是玩家调虎离山的窗口）
//  守卫自己也能被附身 —— 那是进设施的正门。
//  字段用扁平的 x/y/z/vx/vz，与人群 agent 对齐，方便共用化身与渲染。
// ═══════════════════════════════════════════════════════════

export const G_POST = 0, G_INVESTIGATE = 1, G_CHALLENGE = 2, G_ALERT = 3;

export class Guards {
  constructor(city, fx, facility, gate, seed = 4242) {
    this.city = city; this.fx = fx; this.facility = facility;
    this.rng = makeRng(seed);
    this.list = [];
    const R = this.rng;
    const tmp = new THREE.Vector3();

    const atGate = Math.round(DODC.count * 0.55);
    for (let i = 0; i < DODC.count; i++) {
      let px, pz;
      if (i < atGate) {
        // 布在闸口这一侧的扇形上，玩家有清晰的接近路线
        const base = Math.atan2(gate.x - facility.x, gate.z - facility.z);
        const a = base + (R() - 0.5) * 1.7;
        const r = 8 + R() * 14;
        px = facility.x + Math.sin(a) * r;
        pz = facility.z + Math.cos(a) * r;
      } else {
        const w = city.walkPts[(R() * city.walkPts.length) | 0];
        px = w.x + (R() - 0.5) * 6; pz = w.y + (R() - 0.5) * 6;
      }
      // 岗位必须真的在楼外：单趟 pushOut 会把人从一栋楼推进隔壁那栋，
      // 所以先迭代推出，再用螺旋搜索兜底确认。
      tmp.set(px, 0, pz);
      city.pushOut(tmp, 1.3);
      const free = city.nearestFree(tmp.x, tmp.z, 1.2);
      tmp.set(free.x, 0, free.z);
      this.list.push({
        x: tmp.x, y: 0, z: tmp.z, vx: 0, vz: 0, yaw: R() * 6.283,
        homeX: tmp.x, homeZ: tmp.z, post: i < atGate,
        state: G_POST, suspect: 0, investigate: 0,
        scanT: R() * 4, scanYaw: R() * 6.283,
        // 站岗巡逻：在岗位周围的几个点之间慢慢踱步
        postX: tmp.x, postZ: tmp.z, pauseT: R() * 3, shiftT: R() * 2,
        clip: CLIP_IDLE, phase: R(), h: 1.82 + R() * 0.08,
        alive: true, host: false, immune: false,
        stumble: 0, stumbleDur: 0.6, stumbleDir: 1, model: 2,
        knows: null, isGuard: true, r: 0.34, id: i, down: 0,
        bodyLock: 0, spotsBody: false,
      });
    }

    this.alarm = 0;
    this.lure = null;
    this.onDetain = null;
    this.onAlarm = null;
    this.detainCd = 0;
  }

  /** 骚乱：把附近守卫拉过去 */
  attract(x, z, time = MISSION.disturbTime) {
    this.lure = { x, z, t: time };
    let n = 0;
    for (const g of this.list) {
      if (g.host || !g.alive) continue;
      if (Math.hypot(g.x - x, g.z - z) < MISSION.disturbPull) {
        g.state = G_INVESTIGATE; g.investigate = time; g.suspect *= 0.4; n++;
      }
    }
    return n;
  }

  /**
   * 有人当众被附身（或脱离）。宿主猛地一趔趄、眼神发空 —— 视野内的守卫
   * 会把这当成一次异常事件，一次性拉高怀疑度；被跳的人本身穿着制服则更严重。
   * @returns {number} 目击的守卫数
   */
  witnessHop(x, z, hostIsGuard = false, exiting = false) {
    const W = WITNESS;
    const mul = (hostIsGuard ? W.guardHostMul : 1) * (exiting ? W.exitMul : 1);
    const at = { x, z };
    let n = 0;
    for (const g of this.list) {
      if (g.host || !g.alive) continue;
      const dx = x - g.x, dz = z - g.z, d = Math.hypot(dx, dz);
      if (d > W.guardRange) continue;
      const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
      if ((dx * fx + dz * fz) / (d || 1) <= DODC.viewCone) continue;   // 背对着，没看见
      if (!this.#los(g, at)) continue;
      const near = clamp(1 - d / W.guardRange, 0.15, 1);
      g.suspect = clamp(g.suspect + W.guardSuspect * mul * near, 0, 100);
      // 看到了就会走过去看看 —— 否则怀疑度涨了却站着不动，读作没反应
      if (g.state === G_POST) { g.state = G_INVESTIGATE; g.investigate = 5.5; }
      n++;
    }
    if (n) this.lure = { x, z, t: Math.max(this.lure?.t || 0, 5.5) };
    return n;
  }

  /** HUD 预览：现在跳过去，会有几个守卫看到？（不改状态） */
  wouldWitness(x, z) {
    const at = { x, z };
    let n = 0;
    for (const g of this.list) {
      if (g.host || !g.alive) continue;
      const dx = x - g.x, dz = z - g.z, d = Math.hypot(dx, dz);
      if (d > WITNESS.guardRange) continue;
      const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
      if ((dx * fx + dz * fz) / (d || 1) <= DODC.viewCone) continue;
      if (this.#los(g, at)) n++;
    }
    return n;
  }

  raiseAlarm(a = 0.5) {
    const b = this.alarm;
    this.alarm = clamp(this.alarm + a, 0, 1);
    if (b < 1 && this.alarm >= 1) this.onAlarm?.();
  }

  /** 玩家附身守卫时，由玩家驱动 */
  driveHost(g, dt, ix, iz, speed) {
    g.vx = damp(g.vx, ix * speed, 8, dt);
    g.vz = damp(g.vz, iz * speed, 8, dt);
    g.x += g.vx * dt; g.z += g.vz * dt;
    _p.set(g.x, 0, g.z); this.city.pushOut(_p, 0.5);
    g.x = _p.x; g.z = _p.z;
    if (g.stumble > 0) g.stumble = Math.max(0, g.stumble - dt);
  }

  /** @param avatar 玩家当前所在的身体   @param body 琴的本体（投射中时会被发现） */
  update(dt, avatar, cam, body) {
    if (this.lure) { this.lure.t -= dt; if (this.lure.t <= 0) this.lure = null; }
    this.alarm = Math.max(0, this.alarm - dt * 0.035);
    this.detainCd = Math.max(0, this.detainCd - dt);

    for (const g of this.list) {
      if (!g.alive) { g.down = Math.min(1, g.down + dt * 2.4); continue; }
      if (g.host) { g.clip = CLIP_IDLE; continue; }
      if (g.stumble > 0) g.stumble = Math.max(0, g.stumble - dt);

      // ── 感知 ──
      let sees = false, d = Infinity;
      if (avatar) {
        const dx = avatar.x - g.x, dz = avatar.z - g.z;
        d = Math.hypot(dx, dz);
        if (d < DODC.viewRange) {
          const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
          if ((dx * fx + dz * fz) / (d || 1) > DODC.viewCone && this.#los(g, avatar)) sees = true;
        }
      }

      let gain = 0;
      if (sees && avatar) {
        const near = clamp(1 - d / DODC.viewRange, 0, 1);
        if (avatar.stumbleT > 0) gain += DODC.suspectRate * near;
        if (avatar.inRestricted && !avatar.isGuardHost) gain += DODC.suspectRate * 1.25;
        if (avatar.speed > 4.6 && !avatar.isGuardHost) gain += DODC.suspectRate * 0.32 * near;
        if (this.alarm > 0.5 && avatar.isHost) gain += DODC.suspectRate * 0.3 * this.alarm;
      }
      // 投射中的本体：一动不动还在发光，近距离直视会被发现
      g.spotsBody = false;
      let bodyDist = Infinity;
      if (body && body.projecting) {
        const bx = body.x - g.x, bz = body.z - g.z;
        bodyDist = Math.hypot(bx, bz);
        if (bodyDist < 10) {
          const fx2 = Math.sin(g.yaw), fz2 = Math.cos(g.yaw);
          if ((bx * fx2 + bz * fz2) / (bodyDist || 1) > 0.35 && this.#los(g, body)) {
            g.spotsBody = true;
            // 看见了就盯住：接下来几秒他会走过去看，而不是跑去查远处的宿主。
            // 早先这里只加怀疑度，结果守卫扭头去追宿主，反而看丢了本体 —— 
            // 画中画就完全没有紧张感了。
            g.bodyLock = 4.5;
          }
        }
      }
      if (g.bodyLock > 0) g.bodyLock -= dt;
      const onBody = g.bodyLock > 0 && body && body.projecting;
      if (onBody) gain = Math.max(gain, DODC.suspectRate * 1.1);
      g.suspect = clamp(g.suspect + (gain > 0 ? gain : -DODC.suspectDecay) * dt, 0, 100);

      if (g.suspect > 45) g.state = g.suspect >= 100 ? G_ALERT : G_CHALLENGE;
      else if (g.state === G_CHALLENGE || g.state === G_ALERT) g.state = G_POST;

      if (g.state === G_ALERT && d < DODC.detainRange && this.detainCd <= 0) {
        this.detainCd = 2.0; g.suspect = 55;
        this.onDetain?.(g);
      }

      // ── 行为 ──
      let tx = 0, tz = 0, spd = 0, fx = null, fz = null;
      if (onBody) {
        // 那具身体比远处的路人可疑得多 —— 优先走过去看
        const dx = body.x - g.x, dz = body.z - g.z, l = Math.hypot(dx, dz) || 1;
        fx = dx / l; fz = dz / l;
        if (l > 1.6) { tx = fx; tz = fz; spd = DODC.speed * 0.9; }
        g.state = G_CHALLENGE;
      } else if (g.state === G_CHALLENGE || g.state === G_ALERT) {
        if (avatar) {
          const dx = avatar.x - g.x, dz = avatar.z - g.z, l = Math.hypot(dx, dz) || 1;
          fx = dx / l; fz = dz / l;
          if (l > DODC.detainRange * 0.8) { tx = fx; tz = fz; spd = DODC.speed * (g.state === G_ALERT ? 1.3 : 0.85); }
        }
      } else if (g.state === G_INVESTIGATE) {
        g.investigate -= dt;
        if (this.lure) {
          const dx = this.lure.x - g.x, dz = this.lure.z - g.z, l = Math.hypot(dx, dz) || 1;
          if (l > 3.5) { tx = dx / l; tz = dz / l; spd = DODC.speed; fx = tx; fz = tz; }
          else { g.scanT -= dt; if (g.scanT <= 0) { g.scanT = 1.6 + this.rng() * 2; g.scanYaw = this.rng() * 6.283; } }
        }
        if (g.investigate <= 0) g.state = G_POST;
      } else {
        // 站岗 = 在岗位周围慢慢踱步 + 停下来扫视，不是钉在一个点上。
        // 完全静止的人形（尤其贴着墙时）会被读作"卡在墙里的 bug"。
        const hx = g.homeX - g.x, hz = g.homeZ - g.z, hd = Math.hypot(hx, hz);
        if (hd > 1.2) {
          tx = hx / hd; tz = hz / hd;
          spd = DODC.patrolSpeed;
          fx = tx; fz = tz;
        } else {
          g.pauseT -= dt;
          g.scanT -= dt;
          // 站着也不会一动不动：在驻点周围小幅挪重心。
          // 纯静止的人形（尤其贴着墙）会被读作"卡在墙里的 bug" ——
          // 实测最长静止 8.2 秒，玩家看到的就是这个。
          g.shiftT = (g.shiftT ?? 0) - dt;
          if (g.shiftT <= 0) {
            g.shiftT = 0.9 + this.rng() * 1.4;
            const a3 = this.rng() * Math.PI * 2;
            const rr = DODC.idleShift * (0.5 + this.rng() * 0.5);
            const nx = g.homeX + Math.cos(a3) * rr, nz = g.homeZ + Math.sin(a3) * rr;
            if (!this.city.isBlocked(nx, nz, 1.0)) { g.shiftX = nx; g.shiftZ = nz; }
          }
          if (g.shiftX !== undefined) {
            const sx = g.shiftX - g.x, sz = g.shiftZ - g.z, sd = Math.hypot(sx, sz);
            if (sd > 0.08) { tx = sx / sd; tz = sz / sd; spd = 0.42; }
          }
          if (g.scanT <= 0) { g.scanT = 2.5 + this.rng() * 3.5; g.scanYaw = this.rng() * 6.283; }
          if (g.pauseT <= 0) {
            // 换一个新的驻点，必须在岗位半径内、且不在建筑里
            g.pauseT = DODC.patrolPause[0]
              + this.rng() * (DODC.patrolPause[1] - DODC.patrolPause[0]);
            for (let k = 0; k < 8; k++) {
              const a2 = this.rng() * Math.PI * 2;
              const rr = 1.8 + this.rng() * (DODC.patrolRadius - 1.8);
              const nx = g.postX + Math.cos(a2) * rr, nz = g.postZ + Math.sin(a2) * rr;
              if (!this.city.insideBuilding(nx, nz, 1.1)) { g.homeX = nx; g.homeZ = nz; break; }
            }
          }
        }
      }

      g.vx = damp(g.vx, tx * spd, 7, dt);
      g.vz = damp(g.vz, tz * spd, 7, dt);
      g.x += g.vx * dt; g.z += g.vz * dt;
      _p.set(g.x, 0, g.z); this.city.pushOut(_p, 0.55);
      g.x = _p.x; g.z = _p.z;

      const moving = Math.hypot(g.vx, g.vz) > 0.2;
      const want = fx !== null ? Math.atan2(fx, fz) : moving ? Math.atan2(g.vx, g.vz) : g.scanYaw;
      g.yaw += shortAngle(g.yaw, want) * Math.min(1, dt * 4.2);
      if (g.yaw > 12.6 || g.yaw < -12.6) g.yaw %= Math.PI * 2;

      // 和人群同一条规则：低速用待机，播走路时相位有下限。
      // 守卫踱步只有 1.15 m/s、挪重心 0.42 —— 不设下限的话腿会定在半步上。
      const sp = Math.hypot(g.vx, g.vz);
      g.clip = sp > 2.6 ? CLIP_RUN : sp > CROWD.walkAnimMin ? CLIP_WALK : CLIP_IDLE;
      g.phase += g.clip === CLIP_IDLE
        ? dt * 0.5
        : dt * Math.max(sp / (g.clip === CLIP_RUN ? 3.9 : 1.55), CROWD.phaseMin);
      g.phase -= Math.floor(g.phase);
    }
  }

  #los(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, n = 8;
    for (const box of this.city.boxes) {
      if (box.low) continue;
      for (let i = 1; i < n; i++) {
        const x = a.x + dx * i / n, z = a.z + dz * i / n;
        if (Math.abs(x - box.x) < box.hw && Math.abs(z - box.z) < box.hd) return false;
      }
    }
    return true;
  }

  /** 附身中的守卫朝同僚开火 —— 制造真正的混乱，但警报立刻拉满 */
  hostFires(g) {
    let best = null, bd = 20;
    for (const o of this.list) {
      if (o === g || !o.alive || o.host) continue;
      const d = Math.hypot(o.x - g.x, o.z - g.z);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return null;
    best.alive = false; best.down = 0;
    this.fx.impact(best.x, 1.2, best.z, 1, 0.4, 0.3, 18, 7);
    this.fx.impact(g.x + Math.sin(g.yaw) * 0.5, 1.45, g.z + Math.cos(g.yaw) * 0.5, 1, 0.85, 0.4, 8, 5);
    g.yaw = Math.atan2(best.x - g.x, best.z - g.z);
    this.raiseAlarm(0.7);
    // 目击者立刻警觉
    for (const o of this.list) {
      if (!o.alive || o.host) continue;
      if (Math.hypot(o.x - g.x, o.z - g.z) < 45) { o.state = G_ALERT; o.suspect = 100; }
    }
    return best;
  }

  aliveCount() { let n = 0; for (const g of this.list) if (g.alive) n++; return n; }

  peakSuspect() {
    let m = 0;
    for (const g of this.list) if (g.alive && !g.host && g.suspect > m) m = g.suspect;
    return m;
  }
}

const _p = new THREE.Vector3();
