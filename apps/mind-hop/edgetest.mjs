import { chromium } from 'playwright-core';
// 找"隐藏问题"：极端状态、状态机边界、资源泄漏、UI 一致性。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
const errs=[];
p.on('pageerror', e=>errs.push('PAGEERROR: '+e.message));
p.on('console', m=>{ if(m.type()==='error'&&!m.text().includes('404')) errs.push(m.text()); });
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.mouse.click(640,360); await p.waitForTimeout(1100);
const fails=[]; const chk=(n,ok,d='')=>{console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok)fails.push(n);};

// 1. 操舵时被链条弹回 —— 状态是否干净
let r = await p.evaluate(async () => {
  const g = window.__game;
  const c = g.crowd.candidates(g.jean.pos.x, g.jean.pos.z, 60, []).filter(a=>a.alive&&!a.immune);
  const t = c[0];
  g.poss.target = {obj:t,kind:'crowd',x:t.x,y:t.y+1,z:t.z,d:5};
  g.poss.hop();
  await new Promise(r=>setTimeout(r,1500));
  g.poss.host.x += 150; g.poss.host.z += 150;      // 拉断链条
  g.Input.keys['arrowup'] = true;                   // 同时还在操舵
  await new Promise(r=>setTimeout(r,7000));
  g.Input.keys['arrowup'] = false;
  await new Promise(r=>setTimeout(r,1600));
  return { state:g.poss.state, host:!!g.poss.host, steering:!!g.G.steering,
    pip:document.getElementById('pip').className,
    dragging:!!g.jean.dragging,
    posOk:Number.isFinite(g.jean.pos.x) && Math.abs(g.jean.pos.x) < 200 };
});
chk('链断弹回后状态干净', r.state === 0 && !r.host, JSON.stringify(r));
chk('弹回后监视窗关闭', !r.pip.includes('on'), r.pip);
chk('弹回后位置正常', r.posOk);

// 2. 操舵把本体推向世界边界
r = await p.evaluate(async () => {
  const g = window.__game;
  const c = g.crowd.candidates(g.jean.pos.x, g.jean.pos.z, 60, []).filter(a=>a.alive&&!a.immune);
  if (c.length) { const t=c[0]; g.poss.target={obj:t,kind:'crowd',x:t.x,y:t.y+1,z:t.z,d:5}; g.poss.hop(); }
  await new Promise(r=>setTimeout(r,1500));
  // 把本体放到城市边缘再一直往外推
  const lim = 130;
  g.jean.teleport(lim, 0, lim);
  g.poss.link = 100;
  for (let i=0;i<40;i++){ g.poss.link = 100; g.Input.keys['arrowup']=true;
    await new Promise(r=>setTimeout(r,50)); }
  g.Input.keys['arrowup']=false;
  return { x:+g.jean.pos.x.toFixed(1), z:+g.jean.pos.z.toFixed(1), y:+g.jean.pos.y.toFixed(2),
    inside:!!g.city.insideBuilding(g.jean.pos.x, g.jean.pos.z, 0) };
});
chk('操舵不会把本体推出世界', Math.abs(r.x) < 200 && Math.abs(r.z) < 200 && r.y > -1, JSON.stringify(r));
chk('操舵不会把本体推进建筑', !r.inside, JSON.stringify(r));

// 3. 面板开着时按各种键
await p.keyboard.press('Tab'); await p.waitForTimeout(300);
for (const k of ['e','x','f','v','ArrowUp','w',' ']) { await p.keyboard.press(k); await p.waitForTimeout(80); }
await p.waitForTimeout(300);
r = await p.evaluate(()=>({ open:window.__game.aset.open, over:window.__game.G.over,
  state:window.__game.poss.state }));
chk('面板开着时按键不会误触发', r.open === true, JSON.stringify(r));
await p.keyboard.press('Tab'); await p.waitForTimeout(300);

// 4. 结局画面后继续操作
r = await p.evaluate(async () => {
  const g = window.__game;
  g.mission.expo = 100;                              // 触发失败
  await new Promise(r=>setTimeout(r,900));
  const before = { over:g.G.over, shown:document.getElementById('over').classList.contains('on') };
  g.Input.keys['arrowup']=true; g.Input.keys['w']=true;
  const p0=[g.jean.pos.x,g.jean.pos.z];
  await new Promise(r=>setTimeout(r,1200));
  g.Input.keys['arrowup']=false; g.Input.keys['w']=false;
  const moved = Math.hypot(g.jean.pos.x-p0[0], g.jean.pos.z-p0[1]);
  return { ...before, moved:+moved.toFixed(2), pip:document.getElementById('pip').className };
});
chk('触发失败结局', r.over === 'lose' && r.shown, JSON.stringify(r));
chk('结局后不再响应移动', r.moved < 0.3, 'moved=' + r.moved);

// 5. 长时间运行的声音节点是否泄漏
await p.reload();
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.mouse.click(640,360); await p.waitForTimeout(1000);
const v0 = await p.evaluate(()=>window.__game.audio.voices.length);
const fpsBase = +(await p.evaluate(()=>document.getElementById('stats').textContent)).match(/(\d+) fps/)[1];
await p.evaluate(async () => {
  const g = window.__game;
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) {
    g.Input.keys['arrowup'] = Math.random() < 0.5;
    g.Input.keys['w'] = Math.random() < 0.5;
    g.Input.keys[' '] = Math.random() < 0.4;
    if (Math.random() < 0.2) g.Input.pressed['e'] = true;
    if (Math.random() < 0.08) g.Input.pressed['x'] = true;
    await new Promise(r=>setTimeout(r,90));
  }
  g.Input.keys = {};
});
const after = await p.evaluate(()=>({ voices:window.__game.audio.voices.length,
  loops:window.__game.audio.loops.size,
  fps:document.getElementById('stats').textContent }));
chk('声音节点池未泄漏', after.voices <= 32, `池 ${v0} → ${after.voices}`);
chk('循环层未重复创建', after.loops === 4, '共 ' + after.loops + ' 层');
const fps = +after.fps.match(/(\d+) fps/)[1];
// 判据是"有没有变慢"，不是"够不够快"。绝对阈值在被限帧的机器上必然误报：
// 电量低时 macOS 把 rAF 压到 30Hz，三种负载完全不同的场景都报 30 fps。
// 跟本次运行开始时的基线比 —— 泄漏导致的退化在任何刷新率下都看得见。
chk('25 秒随机操作后帧率没有退化',
    fps >= fpsBase * 0.8, `${fpsBase} → ${fps} fps`);
chk('无 JS 异常', errs.length === 0, errs.slice(0,2).join(' | '));

console.log(fails.length ? `\n✗ ${fails.length} 项失败` : '\n✓ 边界全部通过');
await b.close();
process.exit(fails.length?1:0);
