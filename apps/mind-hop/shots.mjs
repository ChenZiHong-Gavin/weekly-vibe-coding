import { chromium } from 'playwright-core';
const OUT='/private/tmp/claude-502/-Users-meshy1/9e6ab3b8-a251-46c2-8796-d94bd9eac97d/scratchpad/';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1440,height:810} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.waitForTimeout(2200);
const key=async(k,ms=80)=>{await p.keyboard.down(k);await p.waitForTimeout(ms);await p.keyboard.up(k);};

// 站到广场看人群多样性 + 士兵走向
await p.evaluate(()=>{ const g=window.__game;
  if(g.city.plazaCenter) g.jean.teleport(g.city.plazaCenter.x, 0, g.city.plazaCenter.z+8);
  g.tpcam.yaw=Math.PI; g.tpcam.distWant=6.5; });
await p.waitForTimeout(1600);
await p.screenshot({path:OUT+'z_crowd.png'});

// 附身后的宿主 + 踉跄
await key('e',40); await p.waitForTimeout(300);
await p.screenshot({path:OUT+'z_stumble.png'});
await p.waitForTimeout(900);
await key('w',1200);
await p.screenshot({path:OUT+'z_host.png'});

// 守卫附近：看 DODC 走向是否正常
await p.evaluate(()=>{ const g=window.__game;
  const gu=g.guards.list.find(x=>x.alive);
  g.poss.recall();
  setTimeout(()=>{ g.jean.teleport(gu.x+9,0,gu.z+9);
    g.tpcam.yaw=Math.atan2(g.jean.pos.x-gu.x, g.jean.pos.z-gu.z); },150);
});
await p.waitForTimeout(2400);
await p.screenshot({path:OUT+'z_guard.png'});
console.log(await p.evaluate(()=>document.getElementById('stats').textContent));
await b.close();
