import { chromium } from 'playwright-core';
// 方向键挪本体：验证能动、够慢、转向相对监视窗、操舵时环绕冻结、
// 以及本体状态下方向键等价于 WASD。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.mouse.click(640,360); await p.waitForTimeout(1100);
const fails=[]; const chk=(n,ok,d='')=>{console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok)fails.push(n);};

const bodyPos = () => p.evaluate(()=>[+window.__game.jean.pos.x.toFixed(2), +window.__game.jean.pos.z.toFixed(2)]);
// 强制附身：出生点附近一定有人，但为了稳定直接注入目标
const forcePossess = () => p.evaluate(async ()=>{
  const g = window.__game;
  if (g.poss.state === 2) return true;
  const cand = g.crowd.candidates(g.jean.pos.x, g.jean.pos.z, 60, [])
    .filter(a => a.alive && !a.immune);
  if (!cand.length) return false;
  const t = cand[0];
  g.poss.target = { obj: t, kind: 'crowd', x: t.x, y: t.y + 1, z: t.z, d: 5 };
  g.poss.hop();
  await new Promise(r => setTimeout(r, 1500));
  return g.poss.state === 2;
});

// ── 1. 严格分离：本体状态下方向键能走，WASD 不能 ──
let a0 = await bodyPos();
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1000); await p.keyboard.up('ArrowUp');
let a1 = await bodyPos();
const byArrow = Math.hypot(a1[0]-a0[0], a1[1]-a0[1]);
chk('本体：方向键能走', byArrow > 1.4, byArrow.toFixed(2)+'m / 1s');
await p.waitForTimeout(400);
a0 = await bodyPos();
await p.keyboard.down('w'); await p.waitForTimeout(1200); await p.keyboard.up('w');
a1 = await bodyPos();
const byWasd = Math.hypot(a1[0]-a0[0], a1[1]-a0[1]);
chk('本体：WASD 不驱动本体（严格分离）', byWasd < 0.2, byWasd.toFixed(3)+'m');

// ── 2. 附身后，本体默认不动 ──
const inHost = await forcePossess();
chk('已进入宿主', inHost);
if (!inHost) { console.log('无法附身，后续断言无意义'); await b.close(); process.exit(1); }
a0 = await bodyPos();
await p.waitForTimeout(1200);
a1 = await bodyPos();
chk('不按方向键时本体钉在原地', Math.hypot(a1[0]-a0[0], a1[1]-a0[1]) < 0.1,
    Math.hypot(a1[0]-a0[0], a1[1]-a0[1]).toFixed(3)+'m');

// ── 3. 方向键挪本体，且明显比正常走路慢 ──
a0 = await bodyPos();
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(2000);
const steering = await p.evaluate(()=>window.__game.G.steering);
const pipCls = await p.evaluate(()=>document.getElementById('pip').className);
await p.keyboard.up('ArrowUp');
a1 = await bodyPos();
const dragSpeed = Math.hypot(a1[0]-a0[0], a1[1]-a0[1]) / 2;
chk('方向键能挪动本体', dragSpeed > 0.6, dragSpeed.toFixed(2)+' m/s');
chk('梦游速度明显慢于正常走路(2.4)', dragSpeed < 1.6, dragSpeed.toFixed(2)+' m/s');
chk('操舵状态被标记', steering === true);
chk('监视窗有操舵样式', pipCls.includes('steer'), pipCls);

// ── 3b. 方向键不能驱动宿主 ──
const hh0 = await p.evaluate(()=>[+window.__game.poss.host.x.toFixed(2), +window.__game.poss.host.z.toFixed(2)]);
await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(1400); await p.keyboard.up('ArrowLeft');
const hh1 = await p.evaluate(()=>[+window.__game.poss.host.x.toFixed(2), +window.__game.poss.host.z.toFixed(2)]);
const hostByArrow = Math.hypot(hh1[0]-hh0[0], hh1[1]-hh0[1]);
chk('方向键不驱动宿主（严格分离）', hostByArrow < 0.35, hostByArrow.toFixed(3)+'m');

// ── 4. 宿主同时可动（两套操作并行）──
const h0 = await p.evaluate(()=>[+window.__game.poss.host.x.toFixed(2), +window.__game.poss.host.z.toFixed(2)]);
a0 = await bodyPos();
await p.keyboard.down('w'); await p.keyboard.down('ArrowDown');
await p.waitForTimeout(1600);
await p.keyboard.up('w'); await p.keyboard.up('ArrowDown');
const h1 = await p.evaluate(()=>[+window.__game.poss.host.x.toFixed(2), +window.__game.poss.host.z.toFixed(2)]);
a1 = await bodyPos();
const hostMoved = Math.hypot(h1[0]-h0[0], h1[1]-h0[1]);
const bodyMoved = Math.hypot(a1[0]-a0[0], a1[1]-a0[1]);
chk('宿主与本体可以同时移动', hostMoved > 1.5 && bodyMoved > 0.7,
    `宿主 ${hostMoved.toFixed(2)}m / 本体 ${bodyMoved.toFixed(2)}m`);

// ── 5. 操舵时监视窗环绕冻结 ──
const ang0 = await p.evaluate(()=>window.__game.G.pipAngle);
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1500);
const angHeld = await p.evaluate(()=>window.__game.G.pipAngle);
await p.keyboard.up('ArrowUp'); await p.waitForTimeout(1200);
const angFree = await p.evaluate(()=>window.__game.G.pipAngle);
chk('操舵时环绕角度冻结', Math.abs(angHeld - ang0) < 0.02,
    `Δ=${(angHeld-ang0).toFixed(4)}`);
chk('松手后恢复环绕', angFree - angHeld > 0.1, `Δ=${(angFree-angHeld).toFixed(3)}`);

// ── 6. 转向相对监视窗：按同一个键，本体位移方向应贴合窗口前向 ──
const align = await p.evaluate(async () => {
  const g = window.__game;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  // 从真实监视相机矩阵取前向，不用 G.pipYaw 反推（那会和实现一起错）
  g.pipCam.updateMatrixWorld(true);
  const e = g.pipCam.matrixWorld.elements;
  let fx = -e[8], fz = -e[10];
  const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  const p0 = [g.jean.pos.x, g.jean.pos.z];
  g.Input.keys['arrowup'] = true;
  await new Promise(r=>setTimeout(r, 1400));
  g.Input.keys['arrowup'] = false;
  const p1 = [g.jean.pos.x, g.jean.pos.z];
  const mv = [p1[0]-p0[0], p1[1]-p0[1]];
  const l = Math.hypot(...mv) || 1;
  return { dot: +((mv[0]/l)*fx + (mv[1]/l)*fz).toFixed(2), dist: +l.toFixed(2) };
});
chk('本体前进方向贴合监视窗前向', align.dot > 0.85,
    `点积=${align.dot}（位移 ${align.dist}m）`);

console.log(fails.length ? `\n✗ ${fails.length} 项失败` : '\n✓ 本体操舵完整可用');
await b.close();
process.exit(fails.length?1:0);
