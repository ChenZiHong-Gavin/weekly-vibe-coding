import { chromium } from 'playwright-core';
// 在真实游戏里量琴的上臂外张角 —— 四种状态都要自然：
// 本体站立 / 本体走动 / 投射中静止（监视窗里看到的）/ 梦游操舵。
// 之前只量了动画片段，漏掉了 projectPose 这层叠加。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.mouse.click(640,360); await p.waitForTimeout(1000);

await p.evaluate(() => {
  // 量的是**冠状面内的外张角**，不是"与竖直方向的夹角"。
  // 后者把外张和前后摆混为一谈 —— 手臂前摆 36° 会被判成"张开"，
  // 而那正是正常走路。（旧版就是这么量的，它只在 adductArms 连摆臂一起
  // 压死的时候才通过；摆臂修好之后立刻误报。前后摆由 armswing.mjs 单独守。）
  window.__armAngle = () => {
    const g = window.__game, THREE = g.THREE;
    const bn = n => { let b=null; g.jean.rig.model.traverse(o=>{
      if(o.isBone && o.name.replace(/^mixamorig:?/,'')===n) b=o; }); return b; };
    const la = bn('LeftArm'), ra = bn('RightArm');
    if (!la || !ra) return { L:null, R:null };
    const pl = la.getWorldPosition(new THREE.Vector3());
    const pr = ra.getWorldPosition(new THREE.Vector3());
    const right = pr.clone().sub(pl).normalize();
    const out = {};
    for (const [u,l,k,sgn] of [['LeftArm','LeftForeArm','L',-1],['RightArm','RightForeArm','R',1]]) {
      const a = bn(u), f = bn(l);
      if (!a || !f) { out[k] = null; continue; }
      const pa = a.getWorldPosition(new THREE.Vector3());
      const pf = f.getWorldPosition(new THREE.Vector3());
      const d = pf.sub(pa).normalize();
      out[k] = +(Math.atan2(sgn * d.dot(right), -d.y) * 180 / Math.PI).toFixed(1);
    }
    return out;
  };
});
// 走路是周期运动 —— 单帧采样会撞上波峰或波谷，同一个状态能差 20°。
// 取一秒内的**最大值**。
const measure = async (label, setup, hold=1100) => {
  await p.evaluate(setup);
  await p.waitForTimeout(hold);
  let r = { L:-999, R:-999 };
  for (let i = 0; i < 14; i++) {
    const q = await p.evaluate(()=>window.__armAngle());
    if (q.L === null) { r = q; break; }
    r = { L: Math.max(r.L, q.L), R: Math.max(r.R, q.R) };
    await p.waitForTimeout(70);
  }
  const avg = (r.L + r.R) / 2;
  const ok = avg < 25;
  console.log(`${label.padEnd(24)} 左 ${String(r.L).padStart(5)}°  右 ${String(r.R).padStart(5)}°   ${ok?'✓ 自然':'✗ 张开'}`);
  return ok;
};
let all = true;
all &= await measure('本体 · 站立', ()=>{ const g=window.__game; g.Input.keys={}; });
all &= await measure('本体 · 走动', ()=>{ window.__game.Input.keys['arrowup']=true; });
// 附身出去，看监视窗里的本体
await p.evaluate(async ()=>{
  const g = window.__game; g.Input.keys={};
  const c = g.crowd.candidates(g.jean.pos.x, g.jean.pos.z, 60, []).filter(a=>a.alive&&!a.immune);
  const t = c[0];
  g.poss.target = {obj:t,kind:'crowd',x:t.x,y:t.y+1,z:t.z,d:5};
  g.poss.hop();
  await new Promise(r=>setTimeout(r,1600));
});
all &= await measure('投射中 · 本体静止', ()=>{ const g=window.__game; g.Input.keys={}; g.poss.link=100; }, 1400);
all &= await measure('投射中 · 梦游操舵', ()=>{ const g=window.__game;
  g.poss.link=100; g.Input.keys['arrowup']=true; }, 1400);
// 踉跄 / 喊叫也用 overlay，同样要查是否被弹回 T-pose
await p.evaluate(()=>{ window.__game.Input.keys={}; });
await p.evaluate(()=>{ window.__game.hostAv.startStumble(0.62, 1); });
await p.waitForTimeout(280);
let r = await p.evaluate(()=>{
  const g=window.__game, THREE=g.THREE, rig=g.hostAv.rig;
  const bn=n=>{let b=null;rig.model.traverse(o=>{
    if(o.isBone&&o.name.replace(/^mixamorig:?/,'')===n)b=o;});return b;};
  const out={};
  for(const [u,l,k] of [['LeftArm','LeftForeArm','L'],['RightArm','RightForeArm','R']]){
    const a=bn(u),f=bn(l); if(!a||!f){out[k]=null;continue;}
    const pa=a.getWorldPosition(new THREE.Vector3());
    const pf=f.getWorldPosition(new THREE.Vector3());
    const d=pf.sub(pa).normalize();
    out[k]=+(Math.acos(Math.max(-1,Math.min(1,-d.y)))*180/Math.PI).toFixed(1);
  } return out;});
let ok = (r.L+r.R)/2 < 62;      // 踉跄时手臂外张是对的，但不该到 T-pose
console.log(`${'宿主 · 踉跄中'.padEnd(24)} 左 ${String(r.L).padStart(5)}°  右 ${String(r.R).padStart(5)}°   ${ok?'✓ 有幅度但不至 T-pose':'✗ 弹回 T-pose'}`);
all &= ok;

await p.waitForTimeout(900);
await p.evaluate(()=>{ window.__game.hostAv.startShout(); });
await p.waitForTimeout(300);
r = await p.evaluate(()=>{
  const g=window.__game, THREE=g.THREE, rig=g.hostAv.rig;
  const bn=n=>{let b=null;rig.model.traverse(o=>{
    if(o.isBone&&o.name.replace(/^mixamorig:?/,'')===n)b=o;});return b;};
  const out={};
  for(const [u,l,k] of [['LeftArm','LeftForeArm','L'],['RightArm','RightForeArm','R']]){
    const a=bn(u),f=bn(l); if(!a||!f){out[k]=null;continue;}
    const pa=a.getWorldPosition(new THREE.Vector3());
    const pf=f.getWorldPosition(new THREE.Vector3());
    const d=pf.sub(pa).normalize();
    out[k]=+(Math.acos(Math.max(-1,Math.min(1,-d.y)))*180/Math.PI).toFixed(1);
  } return out;});
ok = (r.L+r.R)/2 < 75;
console.log(`${'宿主 · 喊叫中'.padEnd(24)} 左 ${String(r.L).padStart(5)}°  右 ${String(r.R).padStart(5)}°   ${ok?'✓ 有幅度':'✗ 过度张开'}`);
all &= ok;

console.log(all ? '\n✓ 所有姿态手臂都合理' : '\n✗ 有姿态手臂张开');
await b.close();
process.exit(all?0:1);
