import * as THREE from 'three';
import { boneName } from './utils.js';

// ═══════════════════════════════════════════════════════════
//  骨骼动画重定向（跨绑定姿态 · 跨 T/A-pose）
//
//  目标语义：**让目标骨骼的肢体指向与源骨骼一致**。
//      W_M(b) = W_X(b) · K(b)
//      K(b)   = 把「目标骨在自身绑定局部系里的肢体轴」转到
//               「源骨在自身绑定局部系里的肢体轴」的最短弧
//  展开成局部旋转：
//      q_M(b) = inv(K(par)) · q_X(b) · K(b)
//  根骨额外吸收两副骨架父节点的坐标系差：inv(P_M) · P_X。
//
//  为什么不能保留「相对绑定姿态的形变量」D = W·inv(Bind)：
//  D 保留的是**增量**。Xbot 以 T-pose 绑定，走路时手臂从水平下摆约 75°；
//  readyplayer.me 却是以 **A-pose** 绑定的（上臂本来就朝下），再叠加 75°
//  就甩过身体 —— 这就是"礼帽男两只手反了"的真因。
//  Michelle 也是 T-pose 绑定，所以同一个 bug 在她身上完全看不出来。
//
//  另外两个必须记住的点：
//   · Bind 取自 inverseBindMatrices，**不是**节点的 rest transform，两者可以
//     完全不同（readyplayer.me 保存姿态与绑定姿态都是 A-pose，但很多模型不是）。
//   · 不能直接复制局部旋转：Xbot 与 Michelle 的肩骨局部轴相差 90°，
//     直接复制会把手臂抬到肩膀以上。
//  判据见 armtest.mjs（量左右手世界 X 与手相对肩的高度）。
// ═══════════════════════════════════════════════════════════

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const tmp = new THREE.Quaternion();

/**
 * 采集骨架的**绑定**姿态（来自 inverseBindMatrices）与当前层级。
 * 必须在任何动画播放前调用。
 */
export function captureBind(root) {
  root.updateMatrixWorld(true);

  const bindWorld = new Map();   // 规范化骨名 → 绑定世界旋转
  const bindPos = new Map();     // 规范化骨名 → 绑定世界位置
  const restLocalPos = new Map();// 规范化骨名 → 节点自身的静止局部位移
  const restWorldPos = new Map();// 规范化骨名 → 静止姿态下的世界位置（含量化补偿）
  const parent = new Map();
  const children = new Map();
  const names = new Map();       // 规范化骨名 → 场景里的原始节点名

  // 先从 SkinnedMesh 的 boneInverses 拿绑定世界矩阵
  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    const sk = o.skeleton;
    for (let i = 0; i < sk.bones.length; i++) {
      const b = sk.bones[i];
      const n = boneName(b.name);
      if (bindWorld.has(n)) continue;
      const inv = sk.boneInverses[i];
      if (!inv) continue;
      _m.copy(inv).invert();
      const q = new THREE.Quaternion();
      _m.decompose(_p, q, _s);
      bindWorld.set(n, q);
      bindPos.set(n, _p.clone());
    }
  });

  root.traverse(o => {
    if (!o.isBone) return;
    const n = boneName(o.name);
    names.set(n, o.name);
    restLocalPos.set(n, o.position.clone());
    restWorldPos.set(n, o.getWorldPosition(new THREE.Vector3()));
    const pn = o.parent && o.parent.isBone ? boneName(o.parent.name) : null;
    parent.set(n, pn);
    if (pn) { if (!children.has(pn)) children.set(pn, []); children.get(pn).push(n); }
    // 没有绑定信息的骨骼（末端辅助骨）退回当前世界变换
    if (!bindWorld.has(n)) bindWorld.set(n, o.getWorldQuaternion(new THREE.Quaternion()));
    if (!bindPos.has(n)) bindPos.set(n, o.getWorldPosition(new THREE.Vector3()));
  });

  // 根骨的父世界旋转与世界缩放（通常是 Armature/Character 节点）。
  // 缩放必须记：Mixamo 的 GLB 在 Armature 上挂 0.01（厘米→米），
  // readyplayer.me 没有。位移轨道是**局部单位**，不换算就差 100 倍。
  const rootParentQ = new Map();
  const rootParentS = new Map();
  root.traverse(o => {
    if (!o.isBone) return;
    const n = boneName(o.name);
    if (parent.get(n) === null && o.parent) {
      rootParentQ.set(n, o.parent.getWorldQuaternion(new THREE.Quaternion()));
      rootParentS.set(n, o.parent.getWorldScale(new THREE.Vector3()).x || 1);
    }
  });

  // 绑定局部旋转 = inv(绑定世界(父)) · 绑定世界(自己)
  const bindLocal = new Map();
  const tmp = new THREE.Quaternion();
  for (const [n, bw] of bindWorld) {
    const pn = parent.get(n);
    const pw = pn ? bindWorld.get(pn) : (rootParentQ.get(n) || new THREE.Quaternion());
    bindLocal.set(n, tmp.copy(pw).invert().multiply(bw).clone());
  }

  // 肢体轴：子骨相对自己的方向，表达在**自身绑定局部系**里。
  // 这是跨 T/A-pose 对齐的关键量 —— 它不受绑定姿态的整体朝向影响。
  // 只对**单子骨**（真正的肢体链：上臂→小臂→手、大腿→小腿→脚）定义肢体轴。
  // Hips / Spine 这类多子骨的"肢体轴"是没有意义的：取哪个子骨取决于骨架，
  // 两副骨架很可能选到不同的骨，算出来的修正是垃圾（会把整个身体拧歪）。
  // 躯干本来就不存在 T/A-pose 差异，那里退回绑定差即可。
  const limbAxis = new Map();
  const d = new THREE.Vector3();
  for (const [n, bp] of bindPos) {
    const kids = children.get(n);
    if (!kids || kids.length !== 1) continue;
    const kp = bindPos.get(kids[0]);
    if (!kp || kp.distanceTo(bp) < 1e-5) continue;
    d.copy(kp).sub(bp).normalize().applyQuaternion(tmp.copy(bindWorld.get(n)).invert());
    limbAxis.set(n, d.clone());
  }

  return { bindWorld, bindLocal, bindPos, restLocalPos, restWorldPos, limbAxis, parent, children,
           rootParentQ, rootParentS, names };
}

function parentBindWorld(rig, bone) {
  const p = rig.parent.get(bone);
  if (p) return rig.bindWorld.get(p);
  return rig.rootParentQ.get(bone) || new THREE.Quaternion();
}

/**
 * @param clip  源片段
 * @param src   captureBind(源骨架)
 * @param dst   captureBind(目标骨架)
 */
/** K(b)：把目标骨的肢体轴转到源骨的肢体轴（最短弧）。
 *  末端骨没有肢体轴，退回绑定差 inv(bindWorldX)·bindWorldM。 */
function limbCorrection(src, dst, bone) {
  const aX = src.limbAxis.get(bone), aM = dst.limbAxis.get(bone);
  if (aX && aM) return new THREE.Quaternion().setFromUnitVectors(aM, aX);
  return new THREE.Quaternion().copy(src.bindWorld.get(bone)).invert()
    .multiply(dst.bindWorld.get(bone));
}

/**
 * 搬运根骨（Hips）的位移轨道 —— 走路的上下起伏与左右重心转移。
 *
 * 早先这条整个丢掉了（"位移 = 根动画 = 会让角色飘走"）。但 Xbot 的走路是
 * **原地循环**：前后分量恒为 0，只有 4.4cm 上下 + 4.8cm 左右。丢掉的结果是
 * 胯高幅度恒为 0 —— 人是"滑"过去的，而且 Mixamo 的腿部角度本来就是和胯部
 * 起伏一起编的，抽掉起伏，支撑脚就踩不住地。（Soldier 用自带动画，有 7.9cm
 * 起伏，所以只有重定向来的两个模型看着怪。）
 *
 * 判据：周期性分量（首尾接近）保留，单调漂移的分量（真正的根动画）丢弃。
 * 数值按两副骨架的**胯高比**缩放，并在世界系里换算，跨骨架父节点朝向。
 */
function retargetRootPosition(t, src, dst, bone) {
  const v = t.values, n = v.length / 3;
  if (n < 2) return null;

  const comp = [[], [], []];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) comp[k].push(v[i * 3 + k]);
  const mean = comp.map(c => c.reduce((s, q) => s + q, 0) / c.length);
  const keep = comp.map(c => {
    const amp = Math.max(...c) - Math.min(...c);
    if (amp < 1e-6) return false;
    return Math.abs(c[n - 1] - c[0]) <= 0.5 * amp;   // 首尾接近 → 周期性，不是漂移
  });
  if (!keep.some(Boolean)) return null;

  // 缩放比 = 单位换算 × 身材比例。
  //   单位换算：源/目标根骨父节点的世界缩放之比（Mixamo 0.01，readyplayer.me 1）
  //   身材比例：两者绑定世界胯高之比
  //
  // 两个都踩过：
  //  · 只用绑定世界胯高之比 → 三副骨架胯高都 ≈1m，比值 ≈1，于是 4.4 个"厘米"
  //    被当成 4.4 米加上去，礼帽男直接起飞（胯高幅度 3.897m，脚在 ±2m 乱飞）。
  //  · 改用"Hips 静止局部高度之比" → 对 Michelle 是垃圾：她的 Armature 带
  //    90°X 旋转，Hips 局部 Y = -0.52，那根本不是身高方向。
  // 世界缩放不受骨架朝向影响，是这里唯一可靠的量。
  // 身材比例取**静止世界胯高**，不能取 bindPos。
  // bindPos 来自 inverseBindMatrices，而 gltf-transform 的 quantize() 会把
  // POSITION 压进整数区间、再用节点变换和绑定矩阵补偿 —— 绑定世界胯高于是
  // 从 1.03 变成 0.24（Soldier 更夸张，1.15 → 0.0155）。骨骼层级本身没变，
  // 所以 getWorldPosition() 给的才是真实高度。（限位轴仍然用 bindPos：
  // 量化对同一模型是等比的，方向不受影响。）
  const srcBindY = src.restWorldPos.get(bone)?.y || 0;
  const dstBindY = dst.restWorldPos.get(bone)?.y || 0;
  if (Math.abs(srcBindY) < 1e-6 || Math.abs(dstBindY) < 1e-6) return null;
  const srcS = src.rootParentS.get(bone) || 1;
  const dstS = dst.rootParentS.get(bone) || 1;
  const scale = (srcS / dstS) * (dstBindY / srcBindY);

  const PX = src.rootParentQ.get(bone) || new THREE.Quaternion();
  const PMinv = (dst.rootParentQ.get(bone) || new THREE.Quaternion()).clone().invert();
  const rest = dst.restLocalPos.get(bone) || new THREE.Vector3();

  const d = new THREE.Vector3();
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    d.set(keep[0] ? v[i * 3]     - mean[0] : 0,
          keep[1] ? v[i * 3 + 1] - mean[1] : 0,
          keep[2] ? v[i * 3 + 2] - mean[2] : 0);
    d.applyQuaternion(PX).multiplyScalar(scale).applyQuaternion(PMinv);
    out[i * 3]     = rest.x + d.x;
    out[i * 3 + 1] = rest.y + d.y;
    out[i * 3 + 2] = rest.z + d.z;
  }
  const outName = dst.names.get(bone) || bone;
  return new THREE.VectorKeyframeTrack(outName + '.position',
    Array.from(t.times), Array.from(out));
}

export function retargetClip(clip, src, dst) {
  const tracks = [];
  const q = new THREE.Quaternion();
  const K = new Map();
  const getK = b => {
    if (!K.has(b)) K.set(b, limbCorrection(src, dst, b));
    return K.get(b);
  };

  for (const t of clip.tracks) {
    const dotAt = t.name.lastIndexOf('.');
    const bone = boneName(t.name.slice(0, dotAt));
    const prop = t.name.slice(dotAt + 1);
    if (!dst.bindWorld.has(bone) || !src.bindWorld.has(bone)) continue;
    if (prop === 'position') {
      // 只有根骨的位移有意义；其余骨骼的位移（骨长）丢弃
      if (src.parent.get(bone) || dst.parent.get(bone)) continue;
      const pt = retargetRootPosition(t, src, dst, bone);
      if (pt) tracks.push(pt);
      continue;
    }
    if (prop !== 'quaternion') continue;   // 缩放丢弃

    const pn = dst.parent.get(bone);
    const Kb = getK(bone);
    let pre;
    if (pn) {
      pre = new THREE.Quaternion().copy(getK(pn)).invert();
    } else {
      // 根骨：额外吸收两副骨架父节点的坐标系差
      const PM = dst.rootParentQ.get(bone) || new THREE.Quaternion();
      const PX = src.rootParentQ.get(bone) || new THREE.Quaternion();
      pre = new THREE.Quaternion().copy(PM).invert().multiply(PX);
    }

    const v = t.values;
    const out = new Float32Array(v.length);
    for (let i = 0; i < v.length; i += 4) {
      q.set(v[i], v[i + 1], v[i + 2], v[i + 3]);
      q.premultiply(pre).multiply(Kb);
      out[i] = q.x; out[i + 1] = q.y; out[i + 2] = q.z; out[i + 3] = q.w;
    }
    const outName = dst.names.get(bone) || bone;
    tracks.push(new THREE.QuaternionKeyframeTrack(outName + '.quaternion',
      Array.from(t.times), Array.from(out)));
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

/** 一次性搬运多个片段 */
export function retargetAll(srcClips, srcRoot, dstRoot, names) {
  const src = captureBind(srcRoot);
  const dst = captureBind(dstRoot);
  const out = {};
  for (const n of names) {
    const c = srcClips.find(x => x.name.toLowerCase() === n.toLowerCase());
    if (!c) continue;
    out[n] = retargetClip(c, src, dst);
    if (out[n].tracks.length === 0)
      console.warn(`retargetAll: 片段 ${n} 重定向出 0 条轨道 —— 骨骼名没对上`);
  }
  return out;
}

export function modelHeight(obj) {
  const b = new THREE.Box3().setFromObject(obj);
  return b.max.y - b.min.y;
}
