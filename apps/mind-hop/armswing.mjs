import { chromium } from 'playwright-core';
// 摆臂幅度回归。
// adductArms 的第一版是"把上臂朝正下方转 deg 度"—— 它分不清冠状面的外张
// 和矢状面的摆臂，于是前摆 30° 的手臂也被往回压 14°，走路时两只手像钉在胯上。
// armangle.mjs 只量外张角，对这个 bug 完全无感。这里量的是**前后摆动幅度**，
// 以及左右手必须反相（同手同脚是另一种一眼就不对的走法）。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.waitForTimeout(1500);

const r = JSON.parse(await p.evaluate(async () => {
  const g = window.__game, THREE = g.THREE;
  const NAMES = ['Michelle', 'readyplayer.me', 'Soldier'];
  const out = {};
  const bn = raw => raw.replace('mixamorig:', '').replace('mixamorig', '');

  for (let ri = 0; ri < g.hostAv.rigs.length; ri++) {
    const rig = g.hostAv.rigs[ri];
    const B = {};
    rig.model.traverse(o => { if (o.isBone) B[bn(o.name)] = o; });
    if (!B.LeftArm || !B.RightArm || !B.LeftUpLeg) { out[NAMES[ri]] = { 错误: '缺骨骼' }; continue; }

    for (const k in rig.actions) rig.actions[k].setEffectiveWeight(k === 'walk' ? 1 : 0);
    if (!rig.actions.walk) { out[NAMES[ri]] = { 错误: '没有走路片段' }; continue; }
    rig.actions.walk.setEffectiveTimeScale(1);
    rig.actions.walk.time = 0;
    rig.root.position.set(0,0,0); rig.root.rotation.set(0,0,0);
    rig.model.rotation.set(0,0,0);

    const dur = rig.actions.walk.getClip().duration, N = 36, dt = dur / N;
    const wp = o => o.getWorldPosition(new THREE.Vector3());
    const swingL = [], swingR = [], abdL = [], abdR = [], legL = [];

    for (let i = 0; i < N; i++) {
      rig.mixer.update(i === 0 ? 0 : dt);
      // 与游戏内一致：动画之后叠内收修正
      g.THREE && rig.animate ? null : null;
      window.__adduct(rig.model, rig.armAdduct ?? 14);
      rig.root.updateMatrixWorld(true);

      // 身体坐标系
      const ls = wp(B.LeftArm), rs = wp(B.RightArm);
      const right = rs.clone().sub(ls).normalize();
      const fwd = new THREE.Vector3(0,1,0).cross(right).normalize();

      const armDir = (up, lo) => wp(B[lo]).sub(wp(B[up])).normalize();
      const dl = armDir('LeftArm','LeftForeArm'), dr = armDir('RightArm','RightForeArm');
      // 矢状面：与"正下"的前后夹角（正 = 前摆）
      swingL.push(Math.atan2(dl.dot(fwd), -dl.y) * 180 / Math.PI);
      swingR.push(Math.atan2(dr.dot(fwd), -dr.y) * 180 / Math.PI);
      // 冠状面：外张角（正 = 往外张）
      abdL.push(Math.atan2(-dl.dot(right), -dl.y) * 180 / Math.PI);
      abdR.push(Math.atan2( dr.dot(right), -dr.y) * 180 / Math.PI);
      // 左腿的前后摆，用来验证左手与左腿反相
      const dLeg = wp(B.LeftLeg).sub(wp(B.LeftUpLeg)).normalize();
      legL.push(Math.atan2(dLeg.dot(fwd), -dLeg.y) * 180 / Math.PI);
    }

    const amp = a => +(Math.max(...a) - Math.min(...a)).toFixed(1);
    const mx  = a => +Math.max(...a).toFixed(1);
    // 相关系数：左手摆 vs 左腿摆，应为负（反相）
    const corr = (x, y) => {
      const mean = v => v.reduce((s,q)=>s+q,0)/v.length;
      const mx2 = mean(x), my = mean(y);
      let n=0, dx=0, dy=0;
      for (let i=0;i<x.length;i++){ n+=(x[i]-mx2)*(y[i]-my); dx+=(x[i]-mx2)**2; dy+=(y[i]-my)**2; }
      return +(n/Math.sqrt(dx*dy||1)).toFixed(2);
    };
    out[NAMES[ri]] = {
      左手摆幅: amp(swingL), 右手摆幅: amp(swingR),
      左手外张max: mx(abdL), 右手外张max: mx(abdR),
      左手与左腿相关: corr(swingL, legL),
      左右手相关: corr(swingL, swingR),
    };
  }
  return JSON.stringify(out);
}));

console.log(JSON.stringify(r, null, 1));
const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };
for (const [name, m] of Object.entries(r)) {
  if (m.错误) { chk(`${name} 可测`, false, m.错误); continue; }
  chk(`${name} 摆臂幅度够（>22°）`,
      m.左手摆幅 > 22 && m.右手摆幅 > 22, `左 ${m.左手摆幅}° 右 ${m.右手摆幅}°`);
  chk(`${name} 手臂不外张（<26°）`,
      m.左手外张max < 26 && m.右手外张max < 26, `左 ${m.左手外张max}° 右 ${m.右手外张max}°`);
  chk(`${name} 左手与左腿反相`, m.左手与左腿相关 < -0.5, `r=${m.左手与左腿相关}`);
  chk(`${name} 两手反相`, m.左右手相关 < -0.5, `r=${m.左右手相关}`);
}
console.log(fails.length ? `\n✗ ${fails.length} 项失败` : '\n✓ 三套模型摆臂都正常');
await b.close();
process.exit(fails.length ? 1 : 0);
