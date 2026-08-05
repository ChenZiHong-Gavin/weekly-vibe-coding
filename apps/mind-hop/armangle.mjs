import { chromium } from 'playwright-core';
// 量「上臂外张角」：上臂方向与竖直向下的夹角。
// 自然走路约 5~18°，T-pose 是 90°。Xbot 是动画源，它的值是基准。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:900,height:600} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/preview.html?m=Michelle.glb');
await p.waitForTimeout(2500);
const rows = await p.evaluate(async () => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { retargetAll } = await import('/src/core/retarget.js');
  const { boneName } = await import('/src/core/utils.js');
  const { adductArms } = await import('/src/core/rig.js');
  const L = new GLTFLoader();
  const xb = await new Promise(r => L.load('/models/opt/Xbot.glb', r));
  const out = [];
  for (const f of ['Xbot.glb','Michelle.glb','readyplayer.me.glb']) {
    for (const cn of ['walk','idle']) {
      const g = await new Promise(r => L.load('/models/opt/' + f, r));
      g.scene.updateMatrixWorld(true);
      const clip = f === 'Xbot.glb'
        ? xb.animations.find(c => c.name === cn)
        : retargetAll(xb.animations, xb.scene, g.scene, [cn])[cn];
      if (!clip) continue;
      const mx = new THREE.AnimationMixer(g.scene);
      const act = mx.clipAction(clip); act.play();
      const find = n => { let b=null; g.scene.traverse(o=>{ if(o.isBone&&boneName(o.name)===n) b=o; }); return b; };
      const A = find('LeftArm'), F = find('LeftForeArm');
      let sum = 0, mx2 = 0, n = 0;
      for (let k = 0; k <= 12; k++) {
        act.time = clip.duration * k / 12;
        mx.update(0);
        g.scene.updateMatrixWorld(true);
        adductArms(g.scene, 14);
        const a = A.getWorldPosition(new THREE.Vector3());
        const fp = F.getWorldPosition(new THREE.Vector3());
        const d = fp.sub(a).normalize();
        const ang = Math.acos(Math.max(-1, Math.min(1, -d.y))) * 180 / Math.PI;
        sum += ang; mx2 = Math.max(mx2, ang); n++;
      }
      out.push({ model: f, clip: cn, avg: +(sum/n).toFixed(1), max: +mx2.toFixed(1) });
    }
  }
  return out;
});
console.log('模型                    片段    上臂外张角(均/最大)   判定');
let bad = 0;
for (const r of rows) {
  const ok = r.avg < 25;
  if (!ok) bad++;
  console.log(`${r.model.padEnd(22)} ${r.clip.padEnd(6)} ${String(r.avg).padStart(6)}° / ${String(r.max).padStart(6)}°   ${ok?'✓ 自然':'✗ 张开'}`);
}
console.log(bad ? `\n✗ ${bad} 项手臂张开` : '\n✓ 手臂自然下垂');
await b.close();
process.exit(bad?1:0);
