import * as THREE from 'three';
import { RENDER } from '../config.js';
import { boneName } from '../core/utils.js';
import { adductArms } from '../core/rig.js';

// ═══════════════════════════════════════════════════════════
//  VAT (Vertex Animation Texture) 人群渲染
//
//  骨骼动画在 CPU 上烘焙成纹理，运行时用 InstancedMesh + 自定义顶点
//  着色器采样 —— 数百个带动画角色只要几次 draw call。
//
//  · 分块布局：顶点数超过 TILE_W 时按行折叠，支持任意网格规模
//  · 位置存半浮点、法线存字节归一化 —— 显存与带宽都砍掉一半以上
//  · 逐实例独立相位 / 片段 / 身高 / 色调 / 自发光
// ═══════════════════════════════════════════════════════════

const TILE_W = 2048;
const ARM_ADDUCT = 14;      // 上臂内收角度，和 CharacterRig 保持一致

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _qq = new THREE.Quaternion();
const _ee = new THREE.Euler();
const _pp = new THREE.Vector3();
const _ss = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);

// float32 → float16 位模式
const _fb = new Float32Array(1);
const _ib = new Int32Array(_fb.buffer);
function toHalf(v) {
  _fb[0] = v;
  const x = _ib[0];
  const sign = (x >> 16) & 0x8000;
  const e = ((x >> 23) & 0xff) - 112;      // 127 - 15
  const m = x & 0x007fffff;
  if (e <= 0) return sign;                 // 下溢 → 0
  if (e >= 0x1f) return sign | 0x7bff;     // 上溢 → 最大有限值
  return sign | (e << 10) | (m >> 13);
}

export class VATCrowd {
  /**
   * @param gltf      提供 SkinnedMesh 的 GLTF
   * @param clips     AnimationClip[]（可为重定向后的），顺序即 clipIndex
   * @param maxCount  实例上限
   */
  constructor(gltf, clips, maxCount, opts = {}) {
    this.max = maxCount;
    const minVerts = opts.minVerts ?? 300;
    this.frames = RENDER.crowdFrames;
    this.clips = [];
    this.parts = [];

    const root = gltf.scene;
    root.updateMatrixWorld(true);

    const skinned = [];
    root.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
    if (!skinned.length) throw new Error('VATCrowd: 模型里没有 SkinnedMesh');
    // 眼球/牙齿这类几十个顶点的小件在人群距离上根本看不见，
    // 但每件都要一个 draw call —— 直接丢掉。
    this.skipped = 0;
    if (skinned.length > 2) {
      const keep = skinned.filter(o => o.geometry.attributes.position.count >= minVerts);
      if (keep.length) { this.skipped = skinned.length - keep.length; skinned.length = 0; skinned.push(...keep); }
    }

    let hips = null;
    root.traverse(o => { if (!hips && o.isBone && /hips|pelvis/i.test(o.name)) hips = o; });

    // ── 朝向规范化 ──
    // Mixamo 导出的根节点旋转不统一（Soldier 是 -90°X，Michelle 是 +90°X，
    // 相差 180°）。VAT 把世界空间顶点烘进纹理，这个差异会让一半模型倒着走。
    // 判据用脚掌：脚趾骨(ToeBase)一定在脚跟(Foot)的前方，这比看网格包围盒可靠。
    let faceFlip = 0;
    {
      let foot = null, toe = null;
      root.traverse(o => {
        if (!o.isBone) return;
        const n = boneName(o.name);
        if (n === 'LeftFoot') foot = o;
        if (n === 'LeftToeBase') toe = o;
      });
      if (foot && toe) {
        root.updateMatrixWorld(true);
        const fp = foot.getWorldPosition(new THREE.Vector3());
        const tp = toe.getWorldPosition(new THREE.Vector3());
        if (tp.z - fp.z < 0) faceFlip = Math.PI;   // 脚趾朝 -Z → 模型朝后
      }
    }
    this.faceFlip = faceFlip;
    const flipS = Math.sin(faceFlip), flipC = Math.cos(faceFlip);

    const mixer = new THREE.AnimationMixer(root);
    const actions = clips.map(clip => {
      const a = mixer.clipAction(clip);
      a.play(); a.enabled = false; a.setEffectiveWeight(0);
      return { action: a, clip };
    });

    const F = clips.length * this.frames;
    clips.forEach((c, i) => this.clips.push({ name: c.name, start: i * this.frames, count: this.frames }));

    const baked = [];
    for (const sm of skinned) {
      const V = sm.geometry.attributes.position.count;
      const rows = Math.ceil(V / TILE_W);
      const stride = rows * TILE_W;
      baked.push({
        sm, V, rows, stride,
        pos: new Uint16Array(stride * F * 4),
        nrm: new Uint8Array(stride * F * 4),
      });
    }

    const bp = new THREE.Vector3(), bn = new THREE.Vector3();

    // ── 先量包围盒（第 0 帧）──
    let gMinY = Infinity, gMaxY = -Infinity, gMinX = Infinity, gMaxX = -Infinity,
        gMinZ = Infinity, gMaxZ = -Infinity;
    {
      const { action } = actions[0];
      action.enabled = true; action.setEffectiveWeight(1); action.time = 0;
      mixer.update(0); root.updateMatrixWorld(true);
      adductArms(root, ARM_ADDUCT);
      let rx = 0, rz = 0;
      if (hips) { hips.getWorldPosition(_v); rx = _v.x; rz = _v.z; }
      for (const b of baked) {
        const P = b.sm.geometry.attributes.position;
        b.sm.skeleton.update();
        for (let i = 0; i < b.V; i++) {
          bp.fromBufferAttribute(P, i);
          _v.copy(bp); b.sm.applyBoneTransform(i, _v); _v.applyMatrix4(b.sm.matrixWorld);
          _v.x -= rx; _v.z -= rz;
          if (_v.y < gMinY) gMinY = _v.y; if (_v.y > gMaxY) gMaxY = _v.y;
          if (_v.x < gMinX) gMinX = _v.x; if (_v.x > gMaxX) gMaxX = _v.x;
          if (_v.z < gMinZ) gMinZ = _v.z; if (_v.z > gMaxZ) gMaxZ = _v.z;
        }
      }
    }
    const height = gMaxY - gMinY;
    const sc = 1 / height;
    const cx = (gMinX + gMaxX) / 2, cz = (gMinZ + gMaxZ) / 2;
    this.modelHeight = height;

    // ── 逐帧烘焙位置 + 法线 ──
    for (let ci = 0; ci < actions.length; ci++) {
      const { action, clip } = actions[ci];
      actions.forEach(a => { a.action.enabled = false; a.action.setEffectiveWeight(0); });
      action.enabled = true; action.setEffectiveWeight(1);

      for (let f = 0; f < this.frames; f++) {
        action.time = (f / this.frames) * clip.duration;
        mixer.update(0);
        root.updateMatrixWorld(true);
        // 人群也要收手臂，否则一街摊着手走路的人（见 core/rig.js: adductArms）
        adductArms(root, ARM_ADDUCT);

        let rx = 0, rz = 0;
        if (hips) { hips.getWorldPosition(_v); rx = _v.x; rz = _v.z; }

        const frame = ci * this.frames + f;
        for (const b of baked) {
          const { sm, V, stride, pos, nrm } = b;
          const P = sm.geometry.attributes.position;
          const N = sm.geometry.attributes.normal;
          sm.skeleton.update();
          const world = sm.matrixWorld;
          const dst = frame * stride * 4;
          for (let i = 0; i < V; i++) {
            bp.fromBufferAttribute(P, i);
            bn.fromBufferAttribute(N, i);

            _v.copy(bp);
            sm.applyBoneTransform(i, _v);
            _v.applyMatrix4(world);
            _v.x -= rx; _v.z -= rz;

            _n.copy(bp).addScaledVector(bn, 0.02);
            sm.applyBoneTransform(i, _n);
            _n.applyMatrix4(world);
            _n.x -= rx; _n.z -= rz;
            _n.sub(_v).normalize();

            // 归一化 + 朝向规范化（绕 Y 转 faceFlip）
            let px = (_v.x - cx) * sc, pz = (_v.z - cz) * sc;
            let nx = _n.x, nz = _n.z;
            if (faceFlip) {
              const tx = px * flipC + pz * flipS; pz = -px * flipS + pz * flipC; px = tx;
              const tn = nx * flipC + nz * flipS; nz = -nx * flipS + nz * flipC; nx = tn;
            }
            const o = dst + i * 4;
            pos[o]     = toHalf(px);
            pos[o + 1] = toHalf((_v.y - gMinY) * sc);
            pos[o + 2] = toHalf(pz);
            pos[o + 3] = 15360;                       // 1.0
            nrm[o]     = (nx * 0.5 + 0.5) * 255 | 0;
            nrm[o + 1] = (_n.y * 0.5 + 0.5) * 255 | 0;
            nrm[o + 2] = (nz * 0.5 + 0.5) * 255 | 0;
            nrm[o + 3] = 255;
          }
        }
      }
    }

    // ── 纹理与实例网格 ──
    this.bytes = 0;
    for (const b of baked) {
      const { sm, V, rows, pos, nrm } = b;
      const texH = rows * F;
      const posTex = new THREE.DataTexture(pos, TILE_W, texH, THREE.RGBAFormat, THREE.HalfFloatType);
      const nrmTex = new THREE.DataTexture(nrm, TILE_W, texH, THREE.RGBAFormat, THREE.UnsignedByteType);
      for (const t of [posTex, nrmTex]) {
        t.minFilter = t.magFilter = THREE.NearestFilter;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        t.generateMipmaps = false; t.needsUpdate = true;
      }
      this.bytes += pos.byteLength + nrm.byteLength;

      const geo = new THREE.InstancedBufferGeometry();
      geo.index = sm.geometry.index;
      geo.setAttribute('position', sm.geometry.attributes.position);
      geo.setAttribute('normal', sm.geometry.attributes.normal);
      geo.setAttribute('uv', sm.geometry.attributes.uv ||
        new THREE.BufferAttribute(new Float32Array(V * 2), 2));
      const vid = new Float32Array(V);
      for (let i = 0; i < V; i++) vid[i] = i;
      geo.setAttribute('aVid', new THREE.BufferAttribute(vid, 1));

      const iAnim = new THREE.InstancedBufferAttribute(new Float32Array(this.max * 4), 4);
      const iTint = new THREE.InstancedBufferAttribute(new Float32Array(this.max * 4), 4);
      const iEmis = new THREE.InstancedBufferAttribute(new Float32Array(this.max * 4), 4);
      geo.setAttribute('iAnim', iAnim);
      geo.setAttribute('iTint', iTint);
      geo.setAttribute('iEmis', iEmis);
      geo.instanceCount = 0;

      const src = Array.isArray(sm.material) ? sm.material[0] : sm.material;
      const mat = new THREE.MeshStandardMaterial({
        map: src.map || null,
        color: src.map ? 0xffffff : (src.color ? src.color.clone() : new THREE.Color(0x9aa3b4)),
        roughness: 0.84, metalness: 0.03,
      });
      this.patch(mat, posTex, nrmTex, rows, texH);

      const mesh = new THREE.InstancedMesh(geo, mat, this.max);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (const a of [iAnim, iTint, iEmis]) a.setUsage(THREE.DynamicDrawUsage);

      this.parts.push({ mesh, iAnim, iTint, iEmis, geo, mat });
    }

    mixer.stopAllAction();
    this.count = 0;
  }

  patch(mat, posTex, nrmTex, rows, texH) {
    const key = 'vat-' + posTex.id;
    mat.onBeforeCompile = s => {
      s.uniforms.uPosTex = { value: posTex };
      s.uniforms.uNrmTex = { value: nrmTex };
      s.uniforms.uRows = { value: rows };
      s.uniforms.uTexH = { value: texH };

      s.vertexShader = s.vertexShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uPosTex;
          uniform sampler2D uNrmTex;
          uniform float uRows;
          uniform float uTexH;
          attribute float aVid;
          attribute vec4 iAnim;
          attribute vec4 iTint;
          attribute vec4 iEmis;
          varying vec4 vTint;
          varying vec4 vEmis;

          vec2 vatUV(float frame){
            float localRow = floor(aVid / ${TILE_W}.0);
            float col = aVid - localRow * ${TILE_W}.0;
            float row = frame * uRows + localRow;
            return vec2((col + 0.5) / ${TILE_W}.0, (row + 0.5) / uTexH);
          }`)
        .replace('#include <beginnormal_vertex>', `
          vec3 nA = texture2D(uNrmTex, vatUV(iAnim.x)).xyz * 2.0 - 1.0;
          vec3 nB = texture2D(uNrmTex, vatUV(iAnim.y)).xyz * 2.0 - 1.0;
          vec3 objectNormal = normalize(mix(nA, nB, iAnim.z));`)
        .replace('#include <begin_vertex>', `
          vec3 pA = texture2D(uPosTex, vatUV(iAnim.x)).xyz;
          vec3 pB = texture2D(uPosTex, vatUV(iAnim.y)).xyz;
          vec3 transformed = mix(pA, pB, iAnim.z) * iAnim.w;
          vTint = iTint; vEmis = iEmis;`);

      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\n varying vec4 vTint;\n varying vec4 vEmis;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          // 换装用「色相旋转 + 明度/饱和微调」，不是乘一个色调。
          // 乘色调会连肤色一起染，而且原本浅色的衣服会被洗成一片白；
          // 旋转色相能保留贴图的明暗结构，看起来真的像换了一身衣服。
          {
            vec3 c = diffuseColor.rgb;
            float mx = max(c.r, max(c.g, c.b));
            float mn = min(c.r, min(c.g, c.b));
            float lum = dot(c, vec3(0.299, 0.587, 0.114));
            float sat = mx > 1e-4 ? (mx - mn) / mx : 0.0;
            // vTint.rgb 在这里被复用为 (hueShift, satMul, valMul)
            float hs = vTint.r, sm = vTint.g, vm = vTint.b;
            // 只旋转有彩度的区域：近灰的部分（白衬衫、黑裤）保持原样更自然
            float amt = smoothstep(0.06, 0.30, sat);
            const vec3 kR = vec3(0.57735);
            float ca = cos(hs * amt), sa = sin(hs * amt);
            vec3 rot = c * ca + cross(kR, c) * sa + kR * dot(kR, c) * (1.0 - ca);
            rot = mix(vec3(dot(rot, vec3(0.299,0.587,0.114))), rot, clamp(sm, 0.0, 2.0));
            diffuseColor.rgb = clamp(rot * vm, 0.0, 4.0);
          }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += vEmis.rgb * vEmis.a;`);
    };
    mat.customProgramCacheKey = () => key;
  }

  addTo(scene) { for (const p of this.parts) scene.add(p.mesh); }

  setCount(n) {
    this.count = n;
    for (const p of this.parts) { p.mesh.count = n; p.geo.instanceCount = n; }
  }

  /** @param girth 横向缩放（体型胖瘦），身高走 setAnim 的 heightScale */
  setTransform(i, x, y, z, yaw, tilt = 0, roll = 0, girth = 1) {
    _ss.set(girth, 1, girth);
    if (tilt === 0 && roll === 0) {
      _qq.setFromAxisAngle(_up, yaw);
    } else {
      _ee.set(tilt, yaw, roll, 'YXZ');
      _qq.setFromEuler(_ee);
    }
    _m.compose(_pp.set(x, y, z), _qq, _ss);
    for (const p of this.parts) p.mesh.setMatrixAt(i, _m);
  }

  setAnim(i, fA, fB, mix, heightScale) {
    for (const p of this.parts) {
      const a = p.iAnim.array;
      a[i * 4] = fA; a[i * 4 + 1] = fB; a[i * 4 + 2] = mix; a[i * 4 + 3] = heightScale;
    }
  }

  /**
   * 换装参数。注意这里不是颜色：
   * @param hue  色相旋转弧度
   * @param sat  饱和度倍数
   * @param val  明度倍数
   */
  setLook(i, hue, sat, val) {
    for (const p of this.parts) {
      const a = p.iTint.array;
      a[i * 4] = hue; a[i * 4 + 1] = sat; a[i * 4 + 2] = val; a[i * 4 + 3] = 1;
    }
  }

  setEmissive(i, r, g, b, k) {
    for (const p of this.parts) {
      const a = p.iEmis.array;
      a[i * 4] = r; a[i * 4 + 1] = g; a[i * 4 + 2] = b; a[i * 4 + 3] = k;
    }
  }

  flush() {
    for (const p of this.parts) {
      p.mesh.instanceMatrix.needsUpdate = true;
      p.iAnim.needsUpdate = true;
      p.iTint.needsUpdate = true;
      p.iEmis.needsUpdate = true;
    }
  }

  sample(clipIndex, phase) {
    const c = this.clips[clipIndex] || this.clips[0];
    const f = phase * c.count;
    const fa = Math.floor(f) % c.count;
    const fb = (fa + 1) % c.count;
    return [c.start + fa, c.start + fb, f - Math.floor(f)];
  }
}

// ── 人群 blob 阴影 ──
export class BlobShadows {
  constructor(max) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false, color: 0x000000, opacity: 0.42,
    });
    m.onBeforeCompile = s => {
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\n varying vec2 vBUv;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n vBUv = uv;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\n varying vec2 vBUv;')
        .replace('#include <map_fragment>', `
          float d = length(vBUv - 0.5) * 2.0;
          diffuseColor.a *= pow(smoothstep(1.0, 0.1, d), 1.6);`);
    };
    m.customProgramCacheKey = () => 'blob-shadow';
    this.mesh = new THREE.InstancedMesh(g, m, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this._m = new THREE.Matrix4();
  }
  set(i, x, y, z, r) {
    this._m.makeScale(r, 1, r);
    this._m.setPosition(x, y + 0.035, z);
    this.mesh.setMatrixAt(i, this._m);
  }
  setCount(n) { this.mesh.count = n; }
  flush() { this.mesh.instanceMatrix.needsUpdate = true; }
}
