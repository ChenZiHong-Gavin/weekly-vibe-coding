import { chromium } from 'playwright-core';
// 手臂回归：动画播放中，左右手必须始终在身体正确的一侧。
// 判据用世界 X 坐标（面朝 +Z 时 right = Z×Y = -X，所以左手在 +X），
// 并在 rest 与多个动画时刻都检查 —— 之前只在单一状态测，两个判据互相矛盾时无法定位。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:900,height:600} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/preview.html?m=Michelle.glb');
await p.waitForTimeout(2200);
const res = await p.evaluate(async () => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { retargetAll } = await import('/src/core/retarget.js');
  const { boneName } = await import('/src/core/utils.js');
  const L = new GLTFLoader();
  const xb = await new Promise(r => L.load('/models/opt/Xbot.glb', r));
  const rows = [];
  for (const f of ['Michelle.glb','readyplayer.me.glb']) {
    for (const cname of ['walk','run','idle']) {
      const g = await new Promise(r => L.load('/models/opt/' + f, r));
      g.scene.updateMatrixWorld(true);
      const rc = retargetAll(xb.animations, xb.scene, g.scene, [cname]);
      const clip = rc[cname]; if (!clip) continue;
      const mx = new THREE.AnimationMixer(g.scene);
      const act = mx.clipAction(clip); act.play();
      const find = n => { let b=null; g.scene.traverse(o=>{ if(o.isBone && boneName(o.name)===n) b=o; }); return b; };
      const LH = find('LeftHand'), RH = find('RightHand');
      const LFt = find('LeftFoot'), RFt = find('RightFoot');
      let bad = 0, worst = 0, samples = [], footBad = 0, footWorst = 9;
      for (let k = 0; k <= 10; k++) {
        act.time = clip.duration * k / 10;
        mx.update(0);
        g.scene.updateMatrixWorld(true);
        const lx = LH.getWorldPosition(new THREE.Vector3()).x;
        const rx = RH.getWorldPosition(new THREE.Vector3()).x;
        const d = lx - rx;                     // 应恒为正
        if (d <= 0) bad++;
        worst = Math.min(worst === 0 ? d : worst, d);
        if (samples.length < 4) samples.push(+d.toFixed(3));
        // 脚：站立时双脚几乎并在一起，只要不明显交叉就算过
        const lf = LFt.getWorldPosition(new THREE.Vector3()).x;
        const rf = RFt.getWorldPosition(new THREE.Vector3()).x;
        if (lf - rf < -0.06) { bad++; footBad++; }
        footWorst = Math.min(footWorst, +(lf - rf).toFixed(3));
        // 手臂不能被摊成 T-pose：1.7m 身高的人，手间距超过 1.25m 就不正常
        if (d > 1.25) bad++;
      }
      // 顺带记录手的高度：手臂正常下垂时手应明显低于肩
      act.time = 0; mx.update(0); g.scene.updateMatrixWorld(true);
      const hy = LH.getWorldPosition(new THREE.Vector3()).y;
      const sy = find('LeftShoulder').getWorldPosition(new THREE.Vector3()).y;
      rows.push({ model: f, clip: cname, bad, footBad, footWorst, worst: +worst.toFixed(3), samples,
                  手低于肩: +(sy - hy).toFixed(2) });
    }
  }
  return rows;
});
let ok = true;
console.log('模型                    片段    手错  脚错  手间距  脚间距  手低于肩');
for (const r of res) {
  if (r.bad > 0) ok = false;
  const handBad = r.bad - r.footBad;
  console.log(`${r.model.padEnd(22)} ${r.clip.padEnd(6)} ${String(handBad).padStart(4)}  ${String(r.footBad).padStart(4)}  ${String(r.worst).padStart(6)}  ${String(r.footWorst).padStart(6)}  ${String(r.手低于肩).padStart(8)}  ${r.bad?'✗':'✓'}`);
}
console.log(ok ? '\n✓ 所有模型的左右肢体始终在正确一侧' : '\n✗ 有模型的左右肢体交叉');
await b.close();
process.exit(ok?0:1);
