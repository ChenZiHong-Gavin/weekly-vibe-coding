import * as THREE from 'three';
import { clamp, damp, shortAngle, boneName } from './utils.js';

// ═══════════════════════════════════════════════════════════
//  角色骨架 —— 琴本体与"被附身者化身"共用
//  身高归一化 / idle-walk-run 混合 / 程序化骨骼叠加（踉跄·投射姿态）
// ═══════════════════════════════════════════════════════════

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _pv = new THREE.Vector3();
const _d1 = new THREE.Vector3();
const _d2 = new THREE.Vector3();
const _qc = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tgt = new THREE.Vector3();

const ARM_CHAIN = [['LeftArm', 'LeftForeArm'], ['RightArm', 'RightForeArm']];

/**
 * 把上臂往身侧收一点 —— **只收侧向张开，不动前后摆动**。
 *
 * Xbot 的走路动画本身手臂就外张 26~34°（那是个机器人模特的步态），
 * 重定向是忠实的，所以三个模型都一样张着 —— 看起来像"摊着手走路"。
 *
 * 第一版是"把上臂的世界指向朝正下方转 deg 度"，那是错的：
 * 它不区分冠状面的外张和矢状面的摆臂。手臂前摆 30° 时，与"正下"的夹角
 * 也是 30°，于是同样被往回压 14° —— 摆臂幅度被吃掉一大半，
 * 走起来两只手像钉在胯上（"礼帽男走路奇怪"就是这个）。
 *
 * 现在按身体坐标系分解：
 *   right = 左肩→右肩（跨骨架都可靠，不依赖任何局部轴约定）
 *   fwd   = up × right
 * 只把手臂方向在 (right, down) 冠状面内的夹角往 0 收，
 * 沿 fwd 的分量（也就是前后摆）原样保留。
 * 判据见 armangle.mjs（外张角）与 armswing.mjs（摆臂幅度）。
 */
export function adductArms(root, deg = 14) {
  if (deg <= 0.01) return;
  const rad = deg * Math.PI / 180;
  root.updateMatrixWorld(true);
  const bones = {};
  root.traverse(o => { if (o.isBone) bones[boneNameLocal(o.name)] = o; });

  const la = bones['LeftArm'], ra = bones['RightArm'];
  if (!la || !ra) return;
  // 身体的"右"轴：从左肩指向右肩
  la.getWorldPosition(_d1); ra.getWorldPosition(_d2);
  _right.copy(_d2).sub(_d1);
  if (_right.lengthSq() < 1e-8) return;
  _right.normalize();
  _fwd.set(0, 1, 0).cross(_right);
  if (_fwd.lengthSq() < 1e-8) return;
  _fwd.normalize();

  for (const [upper, lower] of ARM_CHAIN) {
    const a = bones[upper], f = bones[lower];
    if (!a || !f) continue;
    a.getWorldPosition(_d1);
    f.getWorldPosition(_d2);
    _dir.copy(_d2).sub(_d1);
    if (_dir.lengthSq() < 1e-8) continue;
    _dir.normalize();

    const sag = _dir.dot(_fwd);                 // 前后分量 —— 保持不变
    const lat = _dir.dot(_right);               // 左右分量
    const vert = _dir.y;
    const coronal = Math.hypot(lat, vert);      // 冠状面内的长度 —— 保持不变
    if (coronal < 1e-6) continue;
    const ang = Math.atan2(lat, -vert);         // 冠状面内与"正下"的夹角（带符号）
    const turn = Math.min(rad, Math.abs(ang) * 0.92);   // 别收过头变成穿模
    if (turn < 1e-4) continue;
    const want = ang - Math.sign(ang) * turn;

    _tgt.copy(_fwd).multiplyScalar(sag)
      .addScaledVector(_right, Math.sin(want) * coronal)
      .addScaledVector(UP, -Math.cos(want) * coronal)
      .normalize();
    _qc.setFromUnitVectors(_dir, _tgt);

    // 局部旋转 = inv(W_parent) · q_corr · W_parent · q_local
    a.parent.getWorldQuaternion(_qp);
    a.quaternion.premultiply(_qp).premultiply(_qc)
      .premultiply(_qp.clone().invert());
    a.updateMatrixWorld(true);
  }
}
function boneNameLocal(raw) { return raw.replace(/^mixamorig:?/, ''); }

/** 量蒙皮后的真实身高。
 *  绝不能用 Box3.setFromObject —— Mixamo 模型根节点常带 ±90°X 旋转，
 *  而该旋转在蒙皮时被绑定矩阵抵消，那样量出来的是厚度不是身高。 */
export function measureSkinned(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  model.traverse(o => {
    if (o.isSkinnedMesh) {
      const P = o.geometry.attributes.position;
      o.skeleton.update();
      for (let i = 0; i < P.count; i += 7) {
        _pv.fromBufferAttribute(P, i);
        o.applyBoneTransform(i, _pv);
        _pv.applyMatrix4(o.matrixWorld);
        box.expandByPoint(_pv);
      }
    } else if (o.isMesh) {
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      box.union(g.boundingBox.clone().applyMatrix4(o.matrixWorld));
    }
  });
  return box;
}

const TRACKED = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm',
  'LeftForeArm', 'RightForeArm', 'LeftUpLeg', 'RightUpLeg'];

export class CharacterRig {
  /**
   * @param model   已克隆的角色 Object3D
   * @param clips   {idle, walk, run}
   * @param height  归一化目标身高（m）
   */
  constructor(model, clips, height = 1.72) {
    this.root = new THREE.Group();
    this.model = model;
    this.height = height;

    const box = measureSkinned(model);
    let h = box.max.y - box.min.y;
    if (!(h > 0.2 && h < 6)) h = height;
    const s = height / h;
    model.scale.multiplyScalar(s);
    model.position.y = -box.min.y * s;
    this.root.add(model);

    this.meshes = [];
    model.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        this.meshes.push(o);
      }
    });

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    this.w = { idle: 1, walk: 0, run: 0 };
    for (const k of ['idle', 'walk', 'run']) {
      if (!clips[k]) continue;
      const a = this.mixer.clipAction(clips[k]);
      a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      this.actions[k] = a;
    }

    this.bones = {};
    this.rest = {};
    model.traverse(o => {
      if (!o.isBone) return;
      const n = boneName(o.name);
      if (TRACKED.includes(n)) { this.bones[n] = o; this.rest[n] = o.quaternion.clone(); }
    });

    if (Object.keys(this.bones).length === 0)
      console.warn('CharacterRig: 没有匹配到任何骨骼，程序化姿态会失效');

    this.armAdduct = 14;
    this.t = 0;
    this.lean = 0;
    this.tilt = 0;      // 前后倾（踉跄）
    this.roll = 0;      // 左右倾
    this.bob = 0;
  }

  get visible() { return this.root.visible; }
  set visible(v) { this.root.visible = v; }

  setMaterial(fn) { for (const m of this.meshes) fn(m); }

  /** 相机贴太近时淡出自己，别挡住玩家要看的东西 */
  setFade(k) {
    if (this._fade === k) return;
    this._fade = k;
    for (const o of this.meshes) {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m) continue;
      if (k >= 0.999) { m.transparent = false; m.opacity = 1; o.visible = true; }
      else { m.transparent = true; m.opacity = k; o.visible = k > 0.02; }
      m.depthWrite = k > 0.9;
    }
  }

  /** @param speed 水平速度 m/s */
  animate(dt, speed) {
    this.t += dt;
    const t = { idle: 0, walk: 0, run: 0 };
    if (speed < 0.25) t.idle = 1;
    else if (speed < 3.0) { const k = (speed - 0.25) / 2.75; t.walk = 1 - k * 0.15; t.run = k * 0.15; }
    else { const k = clamp((speed - 3.0) / 4.0, 0, 1); t.walk = 1 - k; t.run = k; }

    for (const k in this.w) {
      this.w[k] = damp(this.w[k], t[k], 11, dt);
      this.actions[k]?.setEffectiveWeight(this.w[k]);
    }
    this.actions.walk?.setEffectiveTimeScale(clamp(speed / 1.5, 0.6, 1.9));
    this.actions.run?.setEffectiveTimeScale(clamp(speed / 5.2, 0.7, 1.5));
    this.mixer.update(dt);
    adductArms(this.model, this.armAdduct ?? 14);
  }

  /** 在动画之后叠加程序化姿态。pose = {bone:[x,y,z]} 弧度，w 为权重 */
  overlay(pose, w = 1) {
    if (w <= 0.001) return;
    for (const name in pose) {
      const b = this.bones[name];
      if (!b) continue;
      const [x, y, z] = pose[name];
      _q.setFromEuler(_e.set(x * w, y * w, z * w));
      b.quaternion.copy(this.rest[name]).multiply(_q);
    }
  }

  applyTransform(x, y, z, yaw) {
    this.root.position.set(x, y + this.bob, z);
    this.root.rotation.set(0, yaw, 0);
    this.model.rotation.set(this.tilt, 0, this.roll + this.lean);
  }
}

// ── 常用程序化姿态 ──

/** 附身瞬间/脱离瞬间的踉跄：上身失衡 + 手臂外张 */
export function stumblePose(k, dir = 1) {
  const s = Math.sin(k * Math.PI);            // 0→1→0
  return {
    Spine:        [-0.30 * s * dir, 0.16 * s * dir, 0.10 * s],
    Spine1:       [-0.22 * s * dir, 0.12 * s * dir, 0],
    Neck:         [0.34 * s * dir, 0, 0],
    Head:         [0.20 * s * dir, -0.14 * s * dir, 0],
    LeftArm:      [0, 0, -0.85 * s],
    RightArm:     [0, 0, 0.85 * s],
    LeftForeArm:  [0, -0.55 * s, 0],
    RightForeArm: [0, 0.55 * s, 0],
    LeftUpLeg:    [0.18 * s, 0, 0],
    RightUpLeg:   [-0.12 * s, 0, 0],
  };
}

/**
 * 制造骚乱：仰头喊，上身猛地后仰。
 *
 * ★ 同样不碰手臂。overlay 是「rest × 偏移」而 rest 就是 T-pose，
 * 手臂那几根骨的局部轴又不是外张轴 —— 实测给 -1.25 得 76°、给 +1.30 得 96.8°，
 * 大部分旋转变成了扭转，怎么调都不对。要动手臂就必须像 adductArms 那样
 * 在世界空间算；对一个 0.9 秒的姿态不值得。手臂交给动画，喊的力度由
 * 上身后仰 + 音效 + 守卫反应来传达。
 */
export function shoutPose(k) {
  const s = Math.sin(clamp01(k) * Math.PI);
  return {
    Spine:  [-0.26 * s, 0, 0],
    Spine1: [-0.18 * s, 0, 0],
    Neck:   [-0.44 * s, 0, 0],
    Head:   [-0.34 * s, 0, 0],
  };
}
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/**
 * 琴投射意识时的姿态：失神地站着，头微微后仰。
 *
 * ★ 只动脊椎/颈/头，**绝不碰手臂**。
 * `overlay()` 把骨骼旋转设成「rest × 偏移」，而这些 Mixamo 骨架的 rest 姿态
 * 本身就是 T-pose —— 哪怕偏移是 0，手臂也会弹回平举（实测 92.4°，正好 T-pose）。
 * 手臂交给待机动画（那一层已经过 adductArms 内收），身体就自然地垂着手站着，
 * 比"张开双臂"更像一具没人在家的身体。
 * 脊椎/颈/头的 rest 接近单位四元数，所以这几根用 rest 基准是安全的。
 * 判据见 posetest.mjs（在真实游戏里量四种状态）。
 */
export function projectPose(t) {
  const b = Math.sin(t * 1.5) * 0.03;
  return {
    Spine:  [-0.06, 0, 0],
    Spine1: [-0.05, 0, 0],
    Neck:   [-0.20 + b, 0, 0],
    Head:   [-0.15 + b, 0, 0],
  };
}
