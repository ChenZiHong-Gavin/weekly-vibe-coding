import * as THREE from 'three';
import { CITY } from '../config.js';
import { makeRng, clamp } from '../core/utils.js';

// ═══════════════════════════════════════════════════════════
//  程序化城市：街区 / 街道 / 人行道 / 建筑（着色器画窗）/ 屋顶杂物
//  同时产出：AABB 碰撞表、人行道航点、道具生成点
// ═══════════════════════════════════════════════════════════

const BUILDING_VERT = /* glsl */`
  attribute vec3 iSize;
  attribute float iSeed;
  varying vec3 vLocal;
  varying vec3 vSize;
  varying float vSeed;
  varying vec3 vWorldN;
`;

export class City {
  constructor(seed = 20260803) {
    this.rng = makeRng(seed);
    this.group = new THREE.Group();
    this.boxes = [];        // {x,z,hw,hd,h}  AABB 碰撞
    this.walkPts = [];      // 人行道航点
    this.propSpots = [];    // 道具生成点
    this.roofSpots = [];    // 屋顶落点（供悬浮玩法）
    this.build();
  }

  // ── 布局 ──
  build() {
    const { blocks, blockSize, streetW, sidewalk, span, half } = CITY;
    const R = this.rng;

    this.#ground();

    const lots = [];
    for (let i = 0; i < blocks; i++) {
      for (let j = 0; j < blocks; j++) {
        const bx = -half + streetW + i * (blockSize + streetW) + blockSize / 2;
        const bz = -half + streetW + j * (blockSize + streetW) + blockSize / 2;
        lots.push({ i, j, x: bx, z: bz });
        this.#sidewalkRing(bx, bz, blockSize, sidewalk);
      }
    }

    // 中央广场：留一个空街区做开阔战场
    const plaza = lots[Math.floor(blocks * blocks / 2) + 1];

    const inst = [];
    for (const lot of lots) {
      if (lot === plaza) { this.#plaza(lot.x, lot.z, blockSize - sidewalk * 2); continue; }
      const inner = blockSize - sidewalk * 2;
      // 把地块切成 1-4 栋，留巷道
      const cols = R() < 0.42 ? 1 : 2, rows = R() < 0.42 ? 1 : 2;
      const alley = 1.6;
      const cw = (inner - alley * (cols - 1)) / cols;
      const cd = (inner - alley * (rows - 1)) / rows;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (cols * rows > 1 && R() < 0.10) continue;         // 偶尔空地
          const w = cw * (0.9 + R() * 0.1), d = cd * (0.9 + R() * 0.1);
          const x = lot.x - inner / 2 + cw / 2 + c * (cw + alley);
          const z = lot.z - inner / 2 + cd / 2 + r * (cd + alley);
          const h = CITY.minH + Math.pow(R(), 1.7) * (CITY.maxH - CITY.minH);
          inst.push({ x, z, w, d, h, seed: R() * 1000 });
          this.boxes.push({ x, z, hw: w / 2, hd: d / 2, h });
          this.roofSpots.push(new THREE.Vector3(x, h + 0.4, z));
          if (R() < 0.5) this.#roofClutter(x, z, w, d, h);
        }
      }
    }
    this.#buildings(inst);
    this.#streetProps();
    this.#lamps();
  }

  #ground() {
    const { span } = CITY;
    // 沥青
    const g = new THREE.PlaneGeometry(span * 4.0, span * 4.0, 1, 1);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: 0x3d434e, roughness: 0.95, metalness: 0.02 });
    m.onBeforeCompile = s => {
      s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 gp = vWorldPosition.xz;
        float n = fract(sin(dot(floor(gp*0.9), vec2(12.9898,78.233)))*43758.5453);
        diffuseColor.rgb *= 0.86 + n*0.22;
        // 路面湿反光条纹
        float w = smoothstep(0.6,1.0, fract(gp.x*0.014 + sin(gp.y*0.05)*0.3));
        diffuseColor.rgb += vec3(0.02,0.025,0.04)*w;
      `);
      s.vertexShader = 'varying vec3 vWorldPosition;\n' + s.vertexShader.replace(
        '#include <fog_vertex>', '#include <fog_vertex>\n vWorldPosition = (modelMatrix*vec4(position,1.0)).xyz;');
      s.fragmentShader = 'varying vec3 vWorldPosition;\n' + s.fragmentShader;
    };
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    this.group.add(mesh);

    // 路口斑马线 / 中线（用一张 canvas 贴在道路层上会更贵，这里用细长盒子）
    const paint = new THREE.MeshStandardMaterial({ color: 0xa8ac92, roughness: 0.88, emissive: 0x2a2b1c });
    const { blocks, blockSize, streetW, half } = CITY;
    const dash = new THREE.BoxGeometry(2.4, 0.02, 0.22);
    const marks = new THREE.InstancedMesh(dash, paint, blocks * 400);
    let k = 0; const M = new THREE.Matrix4();
    for (let a = 0; a <= blocks; a++) {
      const c = -half + streetW / 2 + a * (blockSize + streetW);
      for (let x = -half + 3; x < half - 3; x += 5.5) {
        if (k >= marks.count) break;
        M.identity(); M.setPosition(x, 0.012, c); marks.setMatrixAt(k++, M);
      }
      for (let z = -half + 3; z < half - 3; z += 5.5) {
        if (k >= marks.count) break;
        M.makeRotationY(Math.PI / 2); M.setPosition(c, 0.012, z); marks.setMatrixAt(k++, M);
      }
    }
    marks.count = k; marks.instanceMatrix.needsUpdate = true;
    marks.receiveShadow = true;
    this.group.add(marks);
  }

  #sidewalkRing(cx, cz, size, w) {
    const h = 0.16;
    const mat = new THREE.MeshStandardMaterial({ color: 0x5b616d, roughness: 0.92 });
    const outer = size, inner = size - w * 2;
    const g = new THREE.BoxGeometry(1, h, 1);
    const parts = [
      [cx, cz - (inner + w) / 2, outer, w], [cx, cz + (inner + w) / 2, outer, w],
      [cx - (inner + w) / 2, cz, w, inner], [cx + (inner + w) / 2, cz, w, inner],
    ];
    for (const [x, z, sw, sd] of parts) {
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, h / 2, z); m.scale.set(sw, 1, sd);
      m.receiveShadow = true; this.group.add(m);
    }
    // 航点：沿人行道中线
    const r = (inner + w) / 2, n = 5;
    for (let s = 0; s < 4; s++) {
      for (let t = 0; t < n; t++) {
        const u = (t + 0.5) / n - 0.5;
        const p = s === 0 ? [cx + u * outer, cz - r] : s === 1 ? [cx + u * outer, cz + r]
                : s === 2 ? [cx - r, cz + u * inner] : [cx + r, cz + u * inner];
        this.walkPts.push(new THREE.Vector2(p[0], p[1]));
        if (this.rng() < 0.35) this.propSpots.push(new THREE.Vector2(p[0], p[1]));
      }
    }
  }

  #plaza(cx, cz, size) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x606774, roughness: 0.88 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(size, 0.14, size), mat);
    m.position.set(cx, 0.07, cz); m.receiveShadow = true; this.group.add(m);
    // 中央水池 + 几根柱子（掩体）
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.5, 40),
      new THREE.MeshStandardMaterial({ color: 0x2d4256, roughness: 0.22, metalness: 0.3 }));
    pool.position.set(cx, 0.25, cz); pool.receiveShadow = true; this.group.add(pool);
    this.boxes.push({ x: cx, z: cz, hw: 5.2, hd: 5.2, h: 0.5, low: true });
    const pmat = new THREE.MeshStandardMaterial({ color: 0x5a606c, roughness: 0.78 });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, r = size * 0.36;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 5.5, 12), pmat);
      p.position.set(x, 2.75, z); p.castShadow = true; p.receiveShadow = true;
      this.group.add(p);
      this.boxes.push({ x, z, hw: 0.65, hd: 0.65, h: 5.5 });
    }
    for (let i = 0; i < 14; i++) {
      const a = this.rng() * Math.PI * 2, r = this.rng() * size * 0.45;
      this.propSpots.push(new THREE.Vector2(cx + Math.cos(a) * r, cz + Math.sin(a) * r));
    }
    this.plazaCenter = new THREE.Vector3(cx, 0, cz);
  }

  // ── 建筑：单 InstancedMesh + 着色器程序化窗户 ──
  #buildings(list) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x565d6b, roughness: 0.84, metalness: 0.05 });

    mat.onBeforeCompile = s => {
      s.vertexShader = s.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 iSize; attribute float iSeed;
          varying vec3 vLocalPos; varying vec3 vISize; varying float vISeed; varying vec3 vObjN;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vLocalPos = position; vISize = iSize; vISeed = iSeed; vObjN = normal;`);

      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vLocalPos; varying vec3 vISize; varying float vISeed; varying vec3 vObjN;
          float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))+vISeed)*43758.5453); }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          vec3 wp = vLocalPos * vISize;              // 物体空间实际尺寸
          if (vObjN.y < 0.5) {
            // 侧面 → 窗格
            vec2 uvw = abs(vObjN.x) > 0.5 ? vec2(wp.z, wp.y) : vec2(wp.x, wp.y);
            vec2 cell = vec2(3.05, 3.55);
            vec2 id = floor(uvw / cell);
            vec2 f  = fract(uvw / cell);
            float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.20, f.y) * step(f.y, 0.80);
            float lit = step(0.62, h21(id));
            float flick = 0.82 + 0.18 * h21(id + 7.3);
            vec3 warm = mix(vec3(1.0,0.72,0.36), vec3(0.62,0.78,1.0), step(0.78, h21(id+31.7)));
            // 底两层是商铺，更亮更暖
            float shop = step(wp.y, 6.6);
            totalEmissiveRadiance += warm * win * lit * flick * (0.55 + shop*0.85);
            // 未点亮的窗是玻璃，不是空洞：给个能吃到环境光的暗蓝
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.055,0.075,0.125), win);
            // 楼层分隔线
            float band = smoothstep(0.94,1.0,f.y) + smoothstep(0.06,0.0,f.y);
            diffuseColor.rgb *= 1.0 - band*0.25;
          } else {
            diffuseColor.rgb *= 0.62;               // 屋顶
          }`);
    };

    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const size = new Float32Array(list.length * 3);
    const seed = new Float32Array(list.length);
    const M = new THREE.Matrix4();
    list.forEach((b, i) => {
      M.makeScale(b.w, b.h, b.d); M.setPosition(b.x, 0, b.z);
      mesh.setMatrixAt(i, M);
      size[i * 3] = b.w; size[i * 3 + 1] = b.h; size[i * 3 + 2] = b.d;
      seed[i] = b.seed;
    });
    geo.setAttribute('iSize', new THREE.InstancedBufferAttribute(size, 3));
    geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seed, 1));
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
    this.buildingMesh = mesh;
  }

  #roofClutter(x, z, w, d, h) {
    const R = this.rng;
    const mat = new THREE.MeshStandardMaterial({ color: 0x4d535f, roughness: 0.83 });
    const n = 1 + (R() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const bw = 1.4 + R() * 2.4, bd = 1.4 + R() * 2.4, bh = 1.0 + R() * 2.2;
      const px = x + (R() - 0.5) * (w - bw - 1), pz = z + (R() - 0.5) * (d - bd - 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      m.position.set(px, h + bh / 2, pz); m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
    }
    if (R() < 0.35) {  // 水塔
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 3.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x6b5b48, roughness: 0.88 }));
      t.position.set(x + (R() - 0.5) * (w - 4), h + 2.4, z + (R() - 0.5) * (d - 4));
      t.castShadow = true; this.group.add(t);
    }
  }

  #lamps() {
    const R = this.rng;
    const poleG = new THREE.CylinderGeometry(0.09, 0.11, 6.2, 6);
    const poleM = new THREE.MeshStandardMaterial({ color: 0x3f4550, roughness: 0.68, metalness: 0.4 });
    const headM = new THREE.MeshStandardMaterial({
      color: 0x101216, emissive: 0xffbb66, emissiveIntensity: 2.4, roughness: 0.4 });
    const spots = this.walkPts.filter((_, i) => i % 7 === 3);
    const poles = new THREE.InstancedMesh(poleG, poleM, spots.length);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 10, 8), headM, spots.length);
    const M = new THREE.Matrix4();
    spots.forEach((p, i) => {
      M.makeTranslation(p.x, 3.1, p.y); poles.setMatrixAt(i, M);
      M.makeTranslation(p.x, 6.25, p.y); heads.setMatrixAt(i, M);
    });
    poles.castShadow = true;
    this.group.add(poles, heads);
    this.lampPositions = spots;
  }

  #streetProps() {
    // 道具由 props.js 生成，这里只是把点位排重
    const seen = new Set(); const out = [];
    for (const p of this.propSpots) {
      const k = `${p.x.toFixed(0)}_${p.y.toFixed(0)}`;
      if (seen.has(k)) continue; seen.add(k); out.push(p);
    }
    this.propSpots = out;
  }

  // ── 查询 ──
  insideBuilding(x, z, pad = 0) {
    for (const b of this.boxes) {
      if (b.low) continue;
      if (Math.abs(x - b.x) < b.hw + pad && Math.abs(z - b.z) < b.hd + pad) return b;
    }
    return null;
  }

  /**
   * 把点推出建筑。
   *
   * 必须迭代：推出一个盒子的同一步很可能把点推进相邻的盒子（街区里的楼是
   * 挨着排的），单趟只能保证"离开了第一个盒子"。早先只跑一趟，结果有 8 个
   * 守卫的岗位落在设施楼内部 —— 他们站在楼里一动不动，读作"卡在墙里"。
   */
  pushOut(v, pad = 0.4, iterations = 8) {
    let moved = false;
    for (let it = 0; it < iterations; it++) {
      let hit = false;
      for (const b of this.boxes) {
        if (b.low) continue;
        const dx = v.x - b.x, dz = v.z - b.z;
        const ox = b.hw + pad - Math.abs(dx), oz = b.hd + pad - Math.abs(dz);
        if (ox > 0 && oz > 0) {
          hit = true; moved = true;
          if (ox < oz) v.x += Math.sign(dx || 1) * ox;
          else v.z += Math.sign(dz || 1) * oz;
        }
      }
      if (!hit) return moved;
    }
    return moved;
  }

  /**
   * 从 (x1,z1) 到 (x2,z2) 的直线在前 maxLen 米内是否通畅。
   * 人群没有寻路，随机选的目标常常在楼后面 —— agent 会一直顶墙，
   * 被 stuck 逻辑救起来后又选到另一个墙后目标，于是来回乒乓：
   * 实测最差的一个 15 秒走了 17m，净位移只有 0.15m（原地绕圈）。
   * 有了这个检查，选目标时至少能保证"朝那边真的走得动"。
   */
  clearPath(x1, z1, x2, z2, maxLen = 25, pad = 0.6) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.min(Math.hypot(dx, dz), maxLen);
    if (len < 0.5) return true;
    const ux = dx / (Math.hypot(dx, dz) || 1), uz = dz / (Math.hypot(dx, dz) || 1);
    const steps = Math.max(2, Math.ceil(len / 3));
    for (let i = 1; i <= steps; i++) {
      const t = len * i / steps;
      if (this.isBlocked(x1 + ux * t, z1 + uz * t, pad)) return false;
    }
    return true;
  }

  /** 点是否在任何建筑内（含边距） */
  isBlocked(x, z, pad = 0) {
    for (const b of this.boxes) {
      if (b.low) continue;
      if (Math.abs(x - b.x) < b.hw + pad && Math.abs(z - b.z) < b.hd + pad) return true;
    }
    return false;
  }

  /** 找一个离目标点最近的可站位置（螺旋外扩），保证不在建筑里 */
  nearestFree(x, z, pad = 1.1, maxR = 40) {
    if (!this.isBlocked(x, z, pad)) return { x, z };
    for (let r = 2; r <= maxR; r += 2) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
        if (!this.isBlocked(nx, nz, pad)) return { x: nx, z: nz };
      }
    }
    return { x, z };
  }

  // 该 xz 上方的实体高度（屋顶）
  heightAt(x, z) {
    let h = 0;
    for (const b of this.boxes) {
      if (Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) h = Math.max(h, b.h);
    }
    return h;
  }

  randomWalkPoint(rng = Math.random) {
    return this.walkPts[(rng() * this.walkPts.length) | 0];
  }
}
