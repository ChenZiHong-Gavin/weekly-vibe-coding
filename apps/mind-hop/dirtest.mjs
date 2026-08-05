import { chromium } from 'playwright-core';

// 转向回归 —— 三套参考系都要查：
//   本体（方向键，相对主相机）/ 宿主（WASD，相对主相机）/ 操舵（方向键，相对监视窗）
// 判据不用自己推导的 right 向量（那正是出过错的地方），
// 而是把移动投影到屏幕空间：按右应往画面右边走，按上应往画面深处走。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game, null, {timeout:40000});
await p.evaluate(()=>{ window.__game.Input.locked = true; });
await p.waitForTimeout(1200);

const EXPECT = { arrowup:{ndcY:'+',label:'画面深处（NDC y 升高）'},
                 arrowdown:{ndcY:'-',label:'画面近处（NDC y 降低）'},
                 arrowleft:{ndcX:'-',label:'画面左（NDC x 降低）'},
                 arrowright:{ndcX:'+',label:'画面右（NDC x 升高）'} };
let allOk = true;

// ── 本体：方向键，相对主相机 ──
console.log('本体（方向键，相对主相机）');
console.log('键          屏幕位移Δ(ndcX, ndcY)   世界位移(m)   期望                     结果');
for (const k of ['arrowup','arrowdown','arrowleft','arrowright']) {
  const r = await p.evaluate(async (key) => {
    const g = window.__game, THREE = g.THREE;
    const w = g.city.walkPts.find(w => !g.city.insideBuilding(w.x, w.y, 7));
    g.jean.teleport(w.x, 0, w.y); g.jean.vel.set(0,0,0);
    g.tpcam.yaw = 0.7;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cam = g.tpcam.cam;
    const proj = (x,z) => { const v = new THREE.Vector3(x, 1.0, z).project(cam); return [v.x, v.y]; };
    const p0 = [g.jean.pos.x, g.jean.pos.z];
    g.Input.keys[key] = true;
    await new Promise(r => setTimeout(r, 700));
    g.Input.keys[key] = false;
    const p1 = [g.jean.pos.x, g.jean.pos.z];
    const n1 = proj(p1[0], p1[1]), n0 = proj(p0[0], p0[1]);
    return { dx:+(n1[0]-n0[0]).toFixed(3), dy:+(n1[1]-n0[1]).toFixed(3),
             mv:[+(p1[0]-p0[0]).toFixed(2), +(p1[1]-p0[1]).toFixed(2)] };
  }, k);
  const e = EXPECT[k];
  const ok = e.ndcX ? (e.ndcX === '+' ? r.dx > 0.02 : r.dx < -0.02)
                    : (e.ndcY === '+' ? r.dy > 0.005 : r.dy < -0.005);
  if (!ok) allOk = false;
  console.log(`${k.padEnd(11)} (${String(r.dx).padStart(6)},${String(r.dy).padStart(6)})   `
    + `(${String(r.mv[0]).padStart(5)},${String(r.mv[1]).padStart(5)})   ${e.label.padEnd(22)} ${ok?'✓':'✗ 反了'}`);
}

// ── 宿主：WASD，相对主相机 ──
const W = { w:{ndcY:'+',label:'画面深处'}, s:{ndcY:'-',label:'画面近处'},
            a:{ndcX:'-',label:'画面左'},   d:{ndcX:'+',label:'画面右'} };
console.log('\n宿主（WASD，相对主相机）');
await p.evaluate(async () => {
  const g = window.__game;
  const c = g.crowd.candidates(g.jean.pos.x, g.jean.pos.z, 60, []).filter(a=>a.alive&&!a.immune);
  const t = c[0];
  g.poss.target = { obj:t, kind:'crowd', x:t.x, y:t.y+1, z:t.z, d:5 };
  g.poss.hop();
  await new Promise(r => setTimeout(r, 1600));
});
for (const k of ['w','s','a','d']) {
  const r = await p.evaluate(async (key) => {
    const g = window.__game, THREE = g.THREE;
    const h = g.poss.host; if (!h) return null;
    g.tpcam.yaw = 0.7;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cam = g.tpcam.cam;
    const proj = (x,z) => { const v = new THREE.Vector3(x, 1.0, z).project(cam); return [v.x, v.y]; };
    const p0 = [h.x, h.z];
    g.Input.keys[key] = true;
    await new Promise(r => setTimeout(r, 800));
    g.Input.keys[key] = false;
    const p1 = [h.x, h.z];
    const n1 = proj(p1[0], p1[1]), n0 = proj(p0[0], p0[1]);
    return { dx:+(n1[0]-n0[0]).toFixed(3), dy:+(n1[1]-n0[1]).toFixed(3) };
  }, k);
  if (!r) { console.log(k, '无宿主'); allOk = false; continue; }
  const e = W[k];
  const ok = e.ndcX ? (e.ndcX === '+' ? r.dx > 0.02 : r.dx < -0.02)
                    : (e.ndcY === '+' ? r.dy > 0.004 : r.dy < -0.004);
  if (!ok) allOk = false;
  console.log(`${k.padEnd(11)} (${String(r.dx).padStart(6)},${String(r.dy).padStart(6)})   ${e.label.padEnd(22)} ${ok?'✓':'✗ 反了'}`);
}

// ── 操舵：方向键相对监视窗 ──
console.log('\n操舵（方向键，相对监视窗）');
for (const k of ['arrowup','arrowdown','arrowleft','arrowright']) {
  const r = await p.evaluate(async (key) => {
    const g = window.__game;
    // 判据从**真实的监视相机矩阵**取，不用 G.pipYaw 反推 ——
    // 那正是让 dirtest 自证清白、把反了 180° 的操舵判成正确的原因。
    g.pipCam.updateMatrixWorld(true);
    const e = g.pipCam.matrixWorld.elements;
    let fx = -e[8], fz = -e[10];
    const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    let rx = e[0], rz = e[2];
    const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    const p0 = [g.jean.pos.x, g.jean.pos.z];
    g.Input.keys[key] = true;
    await new Promise(r => setTimeout(r, 1300));
    g.Input.keys[key] = false;
    const mv = [g.jean.pos.x - p0[0], g.jean.pos.z - p0[1]];
    const l = Math.hypot(...mv) || 1;
    return { fwd:+((mv[0]/l)*fx + (mv[1]/l)*fz).toFixed(2),
             right:+((mv[0]/l)*rx + (mv[1]/l)*rz).toFixed(2), d:+l.toFixed(2) };
  }, k);
  const want = { arrowup:['fwd',1], arrowdown:['fwd',-1], arrowleft:['right',-1], arrowright:['right',1] }[k];
  const ok = r.d > 0.4 && r[want[0]] * want[1] > 0.75;
  if (!ok) allOk = false;
  console.log(`${k.padEnd(11)} 前向 ${String(r.fwd).padStart(5)}  右向 ${String(r.right).padStart(5)}  位移 ${String(r.d).padStart(5)}m  ${ok?'✓':'✗'}`);
}

console.log(allOk ? '\n✓ 三套转向全部正确' : '\n✗ 有方向是反的');
await b.close();
process.exit(allOk ? 0 : 1);
