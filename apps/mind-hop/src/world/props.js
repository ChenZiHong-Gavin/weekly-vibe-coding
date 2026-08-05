import * as THREE from 'three';
import { clamp, makeRng } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  街道物件 —— 念动力的弹药。每个是一个简化刚体：
//  重力 / 地面弹跳与摩擦 / 建筑 AABB 碰撞 / 撞击伤害
// ═══════════════════════════════════════════════════════════

export const P_REST = 0, P_HELD = 1, P_FLY = 2;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

const TYPES = [
  { name: 'crate',   geo: () => new THREE.BoxGeometry(1.05, 1.05, 1.05),
    col: 0x7a6242, rough: 0.92, m: 34, r: 0.72, dmg: 1.0 },
  { name: 'bin',     geo: () => new THREE.CylinderGeometry(0.46, 0.40, 1.14, 12),
    col: 0x3f5a4c, rough: 0.75, metal: 0.5, m: 26, r: 0.62, dmg: 0.9 },
  { name: 'bench',   geo: () => new THREE.BoxGeometry(2.1, 0.5, 0.7),
    col: 0x6b533a, rough: 0.9, m: 55, r: 1.1, dmg: 1.3 },
  { name: 'hydrant', geo: () => new THREE.CylinderGeometry(0.28, 0.32, 0.95, 10),
    col: 0xb2453a, rough: 0.6, metal: 0.35, m: 68, r: 0.5, dmg: 1.5 },
  { name: 'barrier', geo: () => new THREE.BoxGeometry(1.9, 1.0, 0.28),
    col: 0xc08a30, rough: 0.7, m: 30, r: 0.95, dmg: 1.0 },
  { name: 'car',     geo: () => carGeo(),
    col: 0x2f4a6e, rough: 0.42, metal: 0.62, m: 1200, r: 2.2, dmg: 4.0, big: true },
];

function carGeo() {
  const g = [];
  const body = new THREE.BoxGeometry(4.30, 0.72, 1.82); body.translate(0, 0.78, 0);
  const hood = new THREE.BoxGeometry(1.40, 0.30, 1.72); hood.translate(1.42, 1.06, 0);
  const trunk = new THREE.BoxGeometry(1.05, 0.34, 1.72); trunk.translate(-1.62, 1.08, 0);
  const cab = new THREE.BoxGeometry(2.05, 0.62, 1.60); cab.translate(-0.10, 1.42, 0);
  const roof = new THREE.BoxGeometry(1.85, 0.10, 1.52); roof.translate(-0.10, 1.76, 0);
  const skirt = new THREE.BoxGeometry(4.05, 0.22, 1.60); skirt.translate(0, 0.44, 0);
  g.push(body, hood, trunk, cab, roof, skirt);
  // 四个轮子
  for (const [wx, wz] of [[1.35, 0.92], [1.35, -0.92], [-1.35, 0.92], [-1.35, -0.92]]) {
    const w = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12);
    w.rotateX(Math.PI / 2);
    w.translate(wx, 0.36, wz);
    g.push(w);
  }
  return mergeGeos(g);
}
function mergeGeos(list) {
  let vc = 0, ic = 0;
  for (const g of list) { vc += g.attributes.position.count; ic += g.index.count; }
  const pos = new Float32Array(vc * 3), nrm = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
  const idx = new Uint16Array(ic);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3);
    nrm.set(g.attributes.normal.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
    vo += g.attributes.position.count; io += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3(1, 1, 1);

export class Props {
  constructor(city, seed = 5150) {
    this.city = city;
    this.rng = makeRng(seed);
    this.items = [];
    this.group = new THREE.Group();
    this.byType = [];

    const R = this.rng;
    const buckets = TYPES.map(() => []);

    for (const spot of city.propSpots) {
      const n = 1 + (R() * 2 | 0);
      for (let k = 0; k < n; k++) {
        let t = (R() * (TYPES.length - 1)) | 0;               // 车单独放
        const def = TYPES[t];
        const it = {
          type: t, def,
          p: new THREE.Vector3(spot.x + (R() - 0.5) * 3.2, def.r * 0.95, spot.y + (R() - 0.5) * 3.2),
          v: new THREE.Vector3(),
          q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R() * 6.28, 0)),
          w: new THREE.Vector3(),
          state: P_REST, rest: 0, hitCd: 0,
        };
        if (city.insideBuilding(it.p.x, it.p.z, 0.8)) continue;
        buckets[t].push(it); this.items.push(it);
      }
    }
    // 停在街边的车
    const carT = TYPES.length - 1;
    for (let i = 0; i < 26; i++) {
      const s = city.walkPts[(R() * city.walkPts.length) | 0];
      const off = 4.6 + R() * 2.0;
      const ang = R() < 0.5 ? 0 : Math.PI / 2;
      const p = new THREE.Vector3(s.x + Math.cos(ang + 1.57) * off, 0.05, s.y + Math.sin(ang + 1.57) * off);
      if (city.insideBuilding(p.x, p.z, 2.6)) continue;
      const it = {
        type: carT, def: TYPES[carT], p,
        v: new THREE.Vector3(),
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0)),
        w: new THREE.Vector3(), state: P_REST, rest: 0, hitCd: 0,
      };
      buckets[carT].push(it); this.items.push(it);
    }

    const R2 = this.rng;
    TYPES.forEach((def, i) => {
      const geo = def.geo();
      const mat = new THREE.MeshStandardMaterial({
        color: def.col, roughness: def.rough, metalness: def.metal || 0.05,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, buckets[i].length));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = buckets[i].length;
      // 逐实例高亮（被念力锁定时发光）
      const n = Math.max(1, buckets[i].length);
      const glow = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
      geo.setAttribute('iGlow', glow);
      // 逐实例配色：同一批道具也要有色差
      const cols = new Float32Array(n * 3);
      const base = new THREE.Color(def.col);
      const hsl = { h: 0, s: 0, l: 0 };
      base.getHSL(hsl);
      const tc = new THREE.Color();
      for (let k = 0; k < n; k++) {
        const hueJit = def.name === 'car' ? (R2() - 0.5) * 0.9 : (R2() - 0.5) * 0.16;
        tc.setHSL((hsl.h + hueJit + 1) % 1,
                  clamp01(hsl.s * (0.55 + R2() * 0.9)),
                  clamp01(hsl.l * (0.95 + R2() * 0.8) + (def.name === 'car' ? 0.12 : 0)));
        cols[k * 3] = tc.r; cols[k * 3 + 1] = tc.g; cols[k * 3 + 2] = tc.b;
      }
      geo.setAttribute('iCol', new THREE.InstancedBufferAttribute(cols, 3));
      mat.onBeforeCompile = s => {
        s.vertexShader = s.vertexShader
          .replace('#include <common>', '#include <common>\n attribute float iGlow;\n attribute vec3 iCol;\n varying float vGlow;\n varying vec3 vCol;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n vGlow = iGlow; vCol = iCol;');
        s.fragmentShader = s.fragmentShader
          .replace('#include <common>', '#include <common>\n varying float vGlow;\n varying vec3 vCol;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vCol * 1.9;')
          .replace('#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.85,0.35,1.0) * vGlow;');
      };
      mat.customProgramCacheKey = () => 'prop-glow';
      buckets[i].forEach((it, k) => { it.idx = k; });
      this.byType.push({ mesh, glow, list: buckets[i] });
      this.group.add(mesh);
    });
  }

  /** 半径内最近的可抓物件 */
  pick(origin, dir, range, cone = 0.86) {
    let best = null, bs = -1;
    for (const it of this.items) {
      if (it.state === P_HELD) continue;
      const dx = it.p.x - origin.x, dy = it.p.y - origin.y, dz = it.p.z - origin.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > range || d < 0.4) continue;
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / d;
      if (dot < cone) continue;
      const score = dot * 2.2 - d / range;
      if (score > bs) { bs = score; best = it; }
    }
    return best;
  }

  step(dt, ctx) {
    const city = this.city;
    for (const it of this.items) {
      it.hitCd = Math.max(0, it.hitCd - dt);
      if (it.state === P_REST) continue;

      if (it.state === P_HELD) {
        // 由 telekinesis 直接写 p/v
        it.q.multiply(_q.setFromEuler(_e.set(it.w.x * dt, it.w.y * dt, it.w.z * dt)));
        continue;
      }

      // 飞行
      it.v.y -= 21 * dt;
      it.p.addScaledVector(it.v, dt);
      it.q.multiply(_q.setFromEuler(_e.set(it.w.x * dt, it.w.y * dt, it.w.z * dt)));

      const r = it.def.r;
      // 地面
      const ground = 0;
      if (it.p.y - r * 0.6 < ground) {
        it.p.y = ground + r * 0.6;
        if (it.v.y < -1.2) {
          it.v.y = -it.v.y * 0.26;
          it.w.multiplyScalar(0.5);
          if (ctx?.onImpact) ctx.onImpact(it, 'ground');
        } else it.v.y = 0;
        it.v.x *= 0.82; it.v.z *= 0.82;
        it.w.multiplyScalar(0.9);
      }
      // 建筑
      for (const b of city.boxes) {
        if (b.low) continue;
        if (Math.abs(it.p.x - b.x) < b.hw + r && Math.abs(it.p.z - b.z) < b.hd + r && it.p.y < b.h + r) {
          const ox = b.hw + r - Math.abs(it.p.x - b.x);
          const oz = b.hd + r - Math.abs(it.p.z - b.z);
          if (ox < oz) { it.p.x += Math.sign(it.p.x - b.x || 1) * ox; it.v.x *= -0.32; }
          else { it.p.z += Math.sign(it.p.z - b.z || 1) * oz; it.v.z *= -0.32; }
          it.w.multiplyScalar(0.6);
          if (ctx?.onImpact) ctx.onImpact(it, 'wall');
        }
      }

      if (it.v.lengthSq() < 0.28 && it.p.y - r * 0.6 <= ground + 0.02) {
        it.rest += dt;
        if (it.rest > 0.4) { it.state = P_REST; it.v.set(0, 0, 0); it.w.set(0, 0, 0); }
      } else it.rest = 0;
    }
  }

  flush() {
    for (const t of this.byType) {
      for (const it of t.list) {
        _m.compose(it.p, it.q, _s);
        t.mesh.setMatrixAt(it.idx, _m);
      }
      t.mesh.instanceMatrix.needsUpdate = true;
      t.glow.needsUpdate = true;
    }
  }

  setGlow(it, v) {
    const t = this.byType[it.type];
    t.glow.array[it.idx] = v;
  }
  clearGlow() {
    for (const t of this.byType) t.glow.array.fill(0);
  }
}
