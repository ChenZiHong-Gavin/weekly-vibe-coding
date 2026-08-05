import { chromium } from 'playwright-core';
// 分批加载回归：首屏只下 Michelle + Xbot，DODC 与平民B 开局后补。
// 要验证三件事：(1) 首屏真的只下两个 (2) 补齐后外观真的换上去了
// (3) 补齐之前游戏是可玩的，不是白屏或崩溃。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
const errs = [], glb = [];
p.on('pageerror', e=>errs.push(e.message));
p.on('response', r => { const u = new URL(r.url()).pathname;
  if (u.endsWith('.glb')) glb.push([u.split('/').pop(), Date.now()]); });

const t0 = Date.now();
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game, null, {timeout:60000});
const tReady = Date.now() - t0;
const firstBatch = glb.map(g=>g[0]);

// 补齐之前：游戏必须已经在跑
const early = await p.evaluate(()=>({
  运行中: !!window.__game.crowd && window.__game.crowd.a.length > 0,
  守卫仿真数: window.__game.guards.list.length,
  已补齐: !!window.__streamed,
  dodcVat: !!window.__game.dodcVat, suitVat: !!window.__game.suitVat,
}));

await p.waitForFunction(()=>window.__streamed === true, null, {timeout:30000});
const tStream = Date.now() - t0;
await p.waitForTimeout(500);
// DODC 全在设施周围、离出生点 200m 开外，超出 110m 剔除距离 —— 此刻渲染 0 个
// 是**对的**。要验证外观真的用上了，得先把琴挪过去。
const farBefore = await p.evaluate(()=>{
  const g = window.__game;
  let d = Infinity;
  for (const gu of g.guards.list) d = Math.min(d, Math.hypot(gu.x-g.jean.pos.x, gu.z-g.jean.pos.z));
  return +d.toFixed(0);
});
await p.evaluate(()=>{
  const g = window.__game;
  g.jean.teleport(g.mission.gate.x, 0, g.mission.gate.z + 6);
});
await p.waitForTimeout(900);
const late = await p.evaluate(()=>{
  const g = window.__game;
  // 平民B 到货后，那些人必须真的走 suitVat 了
  const drawn = V => V.parts.reduce((n, p) => Math.max(n, p.mesh.count), 0);
  return { dodcVat: !!g.dodcVat, suitVat: !!g.suitVat,
    suit渲染数: drawn(g.suitVat), dodc渲染数: drawn(g.dodcVat),
    宿主外观数: g.hostAv.rigs.filter(Boolean).length,
    意向为平民B的人数: g.crowd.a.filter(a=>a.alive&&a.model===1).length };
});

const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };
chk('首屏只下 2 个模型', firstBatch.length === 2 && firstBatch.every(f=>/Michelle|Xbot/.test(f)),
    firstBatch.join(', ') + `（${tReady}ms 可交互）`);
chk('补齐之前游戏已在运行', early.运行中 && early.守卫仿真数 > 0,
    `人群已生成，守卫仿真 ${early.守卫仿真数} 个（外观未到：dodcVat=${early.dodcVat}）`);
chk('后台补齐完成', late.dodcVat && late.suitVat, `耗时 ${tStream}ms`);
chk('平民B 外观到货后真的被用上', late.suit渲染数 > 0 && late.意向为平民B的人数 > 0,
    `渲染 ${late.suit渲染数} 个 / 意向 ${late.意向为平民B的人数} 个`);
chk('开局时 DODC 本就在剔除距离外', farBefore > 110, `最近的守卫 ${farBefore}m`);
chk('走到设施后 DODC 外观真的被用上', late.dodc渲染数 > 0, `渲染 ${late.dodc渲染数} 个`);
chk('三种宿主外观都已注册', late.宿主外观数 === 3, `${late.宿主外观数} 种`);
chk('全程无 JS 异常', errs.length === 0, errs.slice(0,2).join(' | '));
console.log(fails.length ? `\n✗ ${fails.length} 项失败` : '\n✓ 分批加载正常');
await b.close();
process.exit(fails.length ? 1 : 0);
