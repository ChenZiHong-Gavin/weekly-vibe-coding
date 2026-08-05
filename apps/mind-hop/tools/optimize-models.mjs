// 模型瘦身：只保留游戏真正用到的东西。
//
// 实测下载的 9.7MB 里有一半以上是死数据：
//   · Xbot 只被当作**动画源**（idle/walk/run 重定向到别的骨架），
//     它 1.8MB 的网格从来没有渲染过，另外 4 个片段也没人用。
//   · Michelle 带着 SambaDance + TPose 共 1.36MB，代码一次都没碰。
//   · Soldier 的 TPose 同理。
// 懒加载不会让死数据变便宜，所以先剥再谈按需下载。
//
// 用法：node tools/optimize-models.mjs
// 产物写到 public/models/opt/，原文件不动。
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, textureCompress, weld, reorder, quantize, simplify }
  from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync, statSync } from 'fs';
import sharp from 'sharp';

const IN = 'public/models', OUT = 'public/models/opt';
mkdirSync(OUT, { recursive: true });
// 必须注册全部扩展，否则 KHR_materials_specular / ior 这类材质属性会在
// 写回时被静默丢弃（第一版就报了 "extensions will not be written"）。
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const MB = n => (n / 1048576).toFixed(2) + 'MB';

// 每个模型：保留哪些动画片段；是否需要网格
const PLAN = {
  // Xbot 的网格从来不渲染 —— 它只是重定向的**动画源**。但不能直接删：
  // captureBind 要从 SkinnedMesh.boneInverses 读绑定姿态，而绑定姿态和节点
  // 静止姿态可以完全不同。删掉 mesh+skin 之后 prune 又把骨骼当空叶子清了，
  // 结果 Michelle 整个僵在 T-pose（膝角 0°、步幅 0.006m）。
  // 所以：把网格简化到接近于零，但保住 skin 和骨架。
  'Xbot':           { clips: ['idle', 'walk', 'run'], keepMesh: 'minimal', tex: 0 },
  'Michelle':       { clips: [],                      keepMesh: true,  tex: 1024 },
  'Soldier':        { clips: ['Idle', 'Walk', 'Run'], keepMesh: true,  tex: 1024 },
  'readyplayer.me': { clips: [],                      keepMesh: true,  tex: 512  },
};

let before = 0, after = 0;
for (const [name, plan] of Object.entries(PLAN)) {
  const src = `${IN}/${name}.glb`, dst = `${OUT}/${name}.glb`;
  const doc = await io.read(src);
  const root = doc.getRoot();

  // 1) 只留需要的动画。
  //    坑：光 a.dispose() 不够 —— prune() 并不会回收采样器指向的 accessor，
  //    结果 Michelle 丢掉了 2 条动画、accessor 却还是 399 个，
  //    1.37MB 的 SambaDance 数据继续躺在文件里（只瘦了 22%）。
  //    要显式回收，同时避开被保留片段共用的那些。
  const keep = new Set(plan.clips.map(c => c.toLowerCase()));
  const kept = root.listAnimations().filter(a => keep.has(a.getName().toLowerCase()));
  const inUse = new Set();
  for (const a of kept) for (const s of a.listSamplers()) {
    if (s.getInput()) inUse.add(s.getInput());
    if (s.getOutput()) inUse.add(s.getOutput());
  }
  for (const a of root.listAnimations()) {
    if (keep.has(a.getName().toLowerCase())) continue;
    const doomed = [];
    for (const s of a.listSamplers()) {
      const i = s.getInput(), o = s.getOutput();
      if (i && !inUse.has(i)) doomed.push(i);
      if (o && !inUse.has(o)) doomed.push(o);
    }
    a.dispose();
    for (const acc of doomed) acc.dispose();
  }

  // 2) 只当动画源的模型：网格砍到最简，纹理全丢，但 skin / 骨架必须留
  if (plan.keepMesh === 'minimal') {
    for (const t of root.listTextures()) t.dispose();
    await doc.transform(weld(), simplify({
      simplifier: MeshoptSimplifier, ratio: 0.01, error: 1, lockBorder: false,
    }));
  }

  // 3) 关键帧重采样（去掉数值上冗余的关键帧）+ 清理孤儿 + 合并重复
  await doc.transform(
    resample(),
    dedup(),
    prune({ keepAttributes: false, keepLeaves: plan.keepMesh === 'minimal' }),
  );

  // 4) 几何量化 —— 位置/法线/UV 从 float32 降到整数。
  //    顶点缓存重排要在量化之前做，否则重排的收益被量化后的索引吃掉。
  if (plan.keepMesh === true) {
    await doc.transform(
      weld(),
      reorder({ encoder: MeshoptEncoder, target: 'size' }),
      quantize({ pattern: /^(POSITION|NORMAL|TEXCOORD|TANGENT|COLOR)/ }),
    );
  }

  // 收尾再 prune 一次 —— weld/reorder/quantize 会生成新的 accessor 并留下旧的。
  // 少了这一步，被丢弃的动画数据仍然躺在 buffer 里：Michelle 曾经带着
  // 1.36MB "没人引用" 的 SambaDance 出厂，文件只瘦了 22%。
  await doc.transform(prune({ keepAttributes: false, keepLeaves: plan.keepMesh === 'minimal' }));

  // 5) 纹理压成 webp 并限制边长
  if (plan.keepMesh === true && root.listTextures().length) {
    await doc.transform(textureCompress({
      encoder: sharp, targetFormat: 'webp', resize: [plan.tex, plan.tex], quality: 85,
    }));
  }

  await io.write(dst, doc);
  const b = statSync(src).size, a = statSync(dst).size;
  before += b; after += a;
  console.log(`${(name + '.glb').padEnd(20)} ${MB(b).padStart(8)} → ${MB(a).padStart(8)}   ` +
              `(${(100 - a / b * 100).toFixed(0)}% ↓)  动画 ${root.listAnimations().map(x=>x.getName()).join('/')||'无'}`);
}
console.log(`\n合计 ${MB(before)} → ${MB(after)}   省下 ${MB(before - after)}（${(100 - after/before*100).toFixed(0)}%）`);
