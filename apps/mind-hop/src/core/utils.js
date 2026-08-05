export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, k, dt) => lerp(a, b, 1 - Math.pow(1 - k, dt * 60));
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const TAU = Math.PI * 2;

// 可复现随机（同一 seed → 同一座城）
export function makeRng(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * 把 WASD 轴向换成世界方向。
 *
 * 两个都踩过的坑：
 *  1) TPCamera 的 _d = (sin yaw, ·, cos yaw) 是「从角色指向相机」= 背后。
 *     相机前向是 -_d = (-sin yaw, ·, -cos yaw)。
 *  2) 右向是 forward × up = (-fz, ·, fx)，不是 (fz, ·, -fx)。
 *     three.js 是右手系、Y 向上：相机默认看向 -Z 时右手边是 +X，
 *     代入 f=(0,-1) 只有 (-fz, fx)=(1,0) 对得上。
 *
 * @param ax  右(+1)/左(-1)
 * @param ay  前(+1)/后(-1)
 * @returns [wx, wz] 单位向量（无输入时为 [0,0]）
 */
export function camRelative(ax, ay, camYaw) {
  if (ax === 0 && ay === 0) return [0, 0];
  const s = Math.sin(camYaw), c = Math.cos(camYaw);
  const fx = -s, fz = -c;        // 前 = -_d
  const rx = -fz, rz = fx;       // 右 = forward × up
  const wx = ax * rx + ay * fx;
  const wz = ax * rz + ay * fz;
  const l = Math.hypot(wx, wz) || 1;
  return [wx / l, wz / l];
}

/**
 * 规范化 Mixamo 骨骼名。
 *
 * 坑：GLTFLoader 会去掉名字里的冒号，`mixamorig:LeftFoot` 变成
 * `mixamorigLeftFoot`。只写 replace('mixamorig:','') 会静默匹配不到任何骨骼，
 * 于是所有程序化姿态叠加都变成空操作 —— 没有报错，只是"动画没效果"。
 */
export function boneName(raw) {
  return raw.replace(/^mixamorig:?/, '');
}

export function shortAngle(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// 空间哈希：人群邻居查询
export class SpatialHash {
  constructor(cell = 2.5) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  key(x, z) { return ((x / this.cell) | 0) * 73856093 ^ ((z / this.cell) | 0) * 19349663; }
  insert(o, x, z) {
    const k = this.key(x, z);
    let b = this.map.get(k);
    if (!b) { b = []; this.map.set(k, b); }
    b.push(o);
  }
  query(x, z, r, out) {
    out.length = 0;
    const c = Math.ceil(r / this.cell);
    const ci = (x / this.cell) | 0, cj = (z / this.cell) | 0;
    for (let i = -c; i <= c; i++)
      for (let j = -c; j <= c; j++) {
        const b = this.map.get((ci + i) * 73856093 ^ (cj + j) * 19349663);
        if (b) for (let n = 0; n < b.length; n++) out.push(b[n]);
      }
    return out;
  }
}

// 环形对象池
export class Pool {
  constructor(n, make) { this.items = Array.from({ length: n }, make); this.i = 0; }
  next() { const o = this.items[this.i]; this.i = (this.i + 1) % this.items.length; return o; }
}
