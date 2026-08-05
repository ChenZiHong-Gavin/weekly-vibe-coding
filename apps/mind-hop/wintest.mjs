import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game, null, {timeout:40000});
await p.waitForTimeout(1200);

// 1) 连跳宽容度：不动镜头连按 E 十次
const before = await p.evaluate(()=>window.__game.hop.totalHops);
for (let i=0;i<10;i++){ await p.keyboard.press('e'); await p.waitForTimeout(300); }
const after = await p.evaluate(()=>({hops:window.__game.hop.totalHops, chain:window.__game.hop.chain,
  pos:window.__game.jean.pos.toArray().map(v=>+v.toFixed(0))}));
console.log(`连按 E ×10 → 实际跳跃 ${after.hops-before} 次, 连锁 ×${after.chain+1}, 落点 ${JSON.stringify(after.pos)}`);

// 2) 胜利结算
await p.evaluate(()=>{ const g=window.__game; for(const e of g.enemies.list) if(e.alive) g.enemies.takedown(e); });
await p.waitForTimeout(900);
console.log('胜利:', JSON.stringify(await p.evaluate(()=>({
  shown: document.getElementById('over').classList.contains('on'),
  title: document.getElementById('ovT').textContent,
  body: document.getElementById('ovB').textContent.replace(/\s+/g,' ').trim(),
}))));
await p.screenshot({path:'/private/tmp/claude-502/-Users-meshy1/9e6ab3b8-a251-46c2-8796-d94bd9eac97d/scratchpad/win.png'});

// 3) 失败结算
await p.reload(); await p.waitForFunction(()=>!!window.__game,null,{timeout:40000});
await p.waitForTimeout(1000);
await p.evaluate(()=>{ window.__game.jean.hp = 0; });
await p.waitForTimeout(600);
console.log('失败:', JSON.stringify(await p.evaluate(()=>({
  shown: document.getElementById('over').classList.contains('on'),
  title: document.getElementById('ovT').textContent,
}))));
await b.close();
