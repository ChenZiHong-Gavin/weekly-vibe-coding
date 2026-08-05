import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1440,height:810} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.waitForTimeout(2500);
const sample = async (label) => {
  const r = await p.evaluate(async () => {
    let n=0; const t0=performance.now();
    await new Promise(res=>{ const tick=()=>{n++; performance.now()-t0<2500?requestAnimationFrame(tick):res();}; requestAnimationFrame(tick); });
    return { fps:+(n/((performance.now()-t0)/1000)).toFixed(0), stats:document.getElementById('stats').textContent };
  });
  console.log(`${label.padEnd(18)} ${String(r.fps).padStart(3)} fps   ${r.stats}`);
  return r.fps;
};
const a = await sample('街道（默认）');
// 广场开阔处
await p.evaluate(()=>{ const g=window.__game;
  if(g.city.plazaCenter) g.jean.teleport(g.city.plazaCenter.x, 0, g.city.plazaCenter.z); });
await p.waitForTimeout(1200);
const c = await sample('广场（人多）');
// 高处俯瞰：最坏情况
await p.evaluate(()=>{ const g=window.__game; g.tpcam.pitch=-0.9; g.tpcam.distWant=30; });
await p.waitForTimeout(1200);
const d = await sample('高空俯瞰（最坏）');
// 三种负载差很多的场景报出同一个数字 = 被浏览器刷新率限住了，不是瓶颈。
// （实测：电量 12% 时 macOS 把 rAF 压到 30Hz，街道/广场/俯瞰全是 30 fps。）
// 这种情况下这个脚本量不出任何东西，就如实说量不出，不要假装通过或失败。
const lo = Math.min(a, c, d), hi = Math.max(a, c, d);
const capped = hi - lo <= 1 && hi <= 62;
if (capped) {
  console.log(`\n三种场景都是 ${hi} fps —— 负载差这么多却完全一样，说明被浏览器`);
  console.log(`刷新率限住了（低电量下 macOS 会把 rAF 压到 30Hz）。本次量不出真实性能。`);
  process.exit(0);
}
console.log(`\n最低 ${lo} fps  ${lo>=60?'✓ 可玩':'✗ 需继续优化'}`);
process.exit(lo >= 60 ? 0 : 1);
await b.close();
