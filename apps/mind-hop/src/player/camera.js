import * as THREE from 'three';
import { RENDER } from '../config.js';
import { clamp, damp, lerp } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  第三人称相机：弹簧臂 / 建筑遮挡回缩 / 速度 FOV / 震屏 / 附身运镜
// ═══════════════════════════════════════════════════════════

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _d = new THREE.Vector3();

export class TPCamera {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0; this.pitch = -0.12;
    this.dist = 5.4; this.distWant = 5.4;
    this.height = 1.48;
    this.shoulder = 0.72;
    this.pivot = new THREE.Vector3();
    this.shake = 0; this.shakeF = 0;
    this.fov = RENDER.fov;
    this.roll = 0;
    this.extraYaw = 0;
    this.punch = 0;
  }

  addShake(a, f = 26) { this.shake = Math.max(this.shake, a); this.shakeF = f; }
  addPunch(a) { this.punch = Math.max(this.punch, a); }

  update(dt, view, input, city, opts = {}) {
    // 鼠标
    this.yaw -= input.dx;
    this.pitch = clamp(this.pitch - input.dy, -1.15, 0.95);

    // 附身飞行时把镜头轻推到行进方向（玩家仍可随时接管）
    if (opts.alignYaw !== undefined && Math.abs(input.dx) < 1e-4) {
      let d = (opts.alignYaw - this.yaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * (opts.alignRate ?? 4.5));
    }

    // 目标枢轴：角色胸口 + 速度前瞻
    const lead = opts.lead ?? 0.16;
    const H = opts.height ?? this.height;
    _t.set(view.pos.x + view.vel.x * lead,
           view.pos.y + H,
           view.pos.z + view.vel.z * lead);
    const follow = opts.snappy ? 26 : 13;
    this.pivot.x = damp(this.pivot.x, _t.x, follow, dt);
    this.pivot.y = damp(this.pivot.y, _t.y, follow * 0.72, dt);
    this.pivot.z = damp(this.pivot.z, _t.z, follow, dt);

    // 距离：瞄准拉近，高速拉远
    const sp = Math.hypot(view.vel.x, view.vel.z);
    let want = opts.dist ?? 5.4;
    want += clamp(sp * 0.06, 0, 1.0);      // 跑起来镜头稍稍拉远
    this.distWant = damp(this.distWant, want, 5, dt);

    // 期望位置
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    const yaw = this.yaw + this.extraYaw;
    _d.set(Math.sin(yaw) * cp, -sp2, Math.cos(yaw) * cp);   // 从枢轴指向相机的方向
    const right = _v.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const shoulderOff = (opts.shoulder ?? this.shoulder) * 0.55;

    // 遮挡：沿 pivot→cam 方向做球体推进，撞到建筑就回缩
    let d = this.distWant;
    if (this.distWant > 0.5) d = this.#sweep(this.pivot, _d, d, city, 0.30);
    this.dist = d < this.dist ? d : damp(this.dist, d, 9, dt);

    const px = this.pivot.x + _d.x * this.dist + right.x * shoulderOff;
    const py = this.pivot.y + _d.y * this.dist;
    const pz = this.pivot.z + _d.z * this.dist + right.z * shoulderOff;
    this.cam.position.set(px, Math.max(py, opts.dist < 0.5 ? 0.2 : 0.45), pz);

    // sweep 有 0.7m 下限，墙比这更近时相机会卡进建筑里 → 最终兜底推出去。
    // 沿最浅的那个轴推，玩家感觉是镜头贴着墙滑，而不是穿进去。
    this.#pushOutOfWalls(city);

    // 看向枢轴前方
    _t.copy(this.pivot).addScaledVector(_d, -2.0);
    this.cam.lookAt(_t.x, _t.y + 0.1, _t.z);

    // 震屏
    if (this.shake > 0.001) {
      const t = performance.now() * 0.001 * this.shakeF;
      this.cam.position.x += Math.sin(t * 1.7) * this.shake;
      this.cam.position.y += Math.sin(t * 2.3 + 1.1) * this.shake * 0.8;
      this.cam.position.z += Math.cos(t * 1.9 + 0.4) * this.shake;
      this.shake = damp(this.shake, 0, 7, dt);
    }
    // 滚转（高速/附身）
    this.roll = damp(this.roll, (opts.roll ?? 0), 7, dt);
    this.cam.rotateZ(this.roll);

    // FOV
    let fovWant = RENDER.fov;
    if (input.run && sp > 4) fovWant = RENDER.fovSprint;
    if (opts.fov) fovWant = opts.fov;
    fovWant += this.punch * 12;
    this.punch = damp(this.punch, 0, 6, dt);
    this.fov = damp(this.fov, fovWant, 8, dt);
    if (Math.abs(this.cam.fov - this.fov) > 0.01) {
      this.cam.fov = this.fov; this.cam.updateProjectionMatrix();
    }
  }

  /** 相机绝不能停在建筑内部 */
  #pushOutOfWalls(city, pad = 0.22) {
    const c = this.cam.position;
    for (let iter = 0; iter < 3; iter++) {
      let hit = false;
      for (const b of city.boxes) {
        if (b.low) continue;
        if (c.y >= b.h + pad) continue;
        const dx = c.x - b.x, dz = c.z - b.z;
        const ox = b.hw + pad - Math.abs(dx);
        const oz = b.hd + pad - Math.abs(dz);
        if (ox <= 0 || oz <= 0) continue;
        hit = true;
        const oy = b.h + pad - c.y;                 // 也可以从屋顶方向顶出去
        if (oy <= ox && oy <= oz) c.y = b.h + pad;
        else if (ox < oz) c.x += Math.sign(dx || 1) * ox;
        else c.z += Math.sign(dz || 1) * oz;
      }
      if (!hit) break;
    }
  }

  /** 从 origin 沿 dir 推进最多 maxD，遇到建筑返回可用距离 */
  #sweep(origin, dir, maxD, city, r) {
    let best = maxD;
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const t = maxD * i / steps;
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      if (y < r + 0.2) { best = Math.min(best, Math.max(0.35, t - maxD / steps)); break; }
      let hit = false;
      for (const b of city.boxes) {
        if (b.low) continue;
        if (y < b.h + r && Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) { hit = true; break; }
      }
      if (hit) { best = Math.max(0.35, t - maxD / steps); break; }
    }
    return best;
  }

  /** 世界方向：相机朝前 */
  forward(out = new THREE.Vector3()) {
    return this.cam.getWorldDirection(out);
  }
}
