import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.waitForTimeout(1500);

const run = async (label, keys, seconds, host) => {
  const r = await p.evaluate(async ({ keys, seconds, host }) => {
    const g = window.__game;
    // 广场中央，四周开阔
    const c = g.city.plazaCenter;
    if (host) {
      if (g.poss.state !== 2) {
        const cand = g.crowd.candidates(c.x, c.z, 40, []).filter(a => a.alive && !a.immune);
        g.jean.teleport(c.x, 0, c.z);
        const t = cand[0]; t.x = c.x + 2; t.z = c.z;
        g.poss.target = { obj: t, kind: 'crowd', x: t.x, y: t.y + 1, z: t.z, d: 2 };
        g.poss.hop();
        await new Promise(r => setTimeout(r, 1500));
      }
      g.poss.host.x = c.x; g.poss.host.z = c.z;
    } else {
      g.jean.teleport(c.x, 0, c.z);
    }
    await new Promise(r => setTimeout(r, 300));
    const pos = () => host ? [g.poss.host.x, g.poss.host.z] : [g.jean.pos.x, g.jean.pos.z];
    for (const k of keys) { g.Input.keys[k] = true; }
    await new Promise(r => setTimeout(r, 400));      // 加速期
    const p0 = pos(); const t0 = performance.now();
    await new Promise(r => setTimeout(r, seconds * 1000));
    const p1 = pos(); const el = (performance.now() - t0) / 1000;
    for (const k of keys) { g.Input.keys[k] = false; }
    return +(Math.hypot(p1[0]-p0[0], p1[1]-p0[1]) / el).toFixed(2);
  }, { keys, seconds, host });
  console.log(`${label.padEnd(22)} ${String(r).padStart(5)} m/s`);
  return r;
};
const cfg = await p.evaluate(() => window.__game.MOVE ?? null);
console.log('实测速度（广场开阔处，2 秒平均）');
// 本体走方向键，宿主走 WASD —— 严格分离
const bw = await run('本体 · 方向键走', ['arrowup'], 2, false);
const br = await run('本体 · 方向键+空格跑', ['arrowup',' '], 2, false);
const hw = await run('宿主 · WASD 走', ['w'], 2, true);
const hr = await run('宿主 · WASD+空格跑', ['w',' '], 2, true);
// 交叉验证：本体不该响应 WASD、宿主不该响应方向键
const bwWrong = await run('本体 · WASD（应为 0）', ['w'], 1.2, false);
const hrWrong = await run('宿主 · 方向键（应为 0）', ['arrowup'], 1.2, true);
console.log(`\n配置目标: 本体 走2.4 跑5.6 / 宿主 走2.3 跑5.2`);
const ok = br > bw * 1.7 && hr > hw * 1.7 && bw > 1.8 && br > 4.2
           && bwWrong < 0.25 && hrWrong < 0.4;
console.log(ok ? '✓ 走跑区分明显、达到配置值、且两套操作互不串台' : '✗ 速度或分离不符');
await b.close();
process.exit(ok?0:1);
