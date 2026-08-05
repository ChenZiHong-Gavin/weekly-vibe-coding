import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1440,height:810} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.waitForTimeout(1600);
const cls = () => p.evaluate(()=>document.getElementById('pip').className);
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); return ok; };
let all = true;

all &= chk('本体状态下监视窗隐藏', !(await cls()).includes('on'), await cls());

await p.keyboard.press('e'); await p.waitForTimeout(1400);
all &= chk('附身后监视窗出现', (await cls()).includes('on'), await cls());

// 守卫站到本体旁边并朝向它。宿主必须支开 —— 否则守卫会去盘查宿主，
// 转头面对宿主，就测不到"直视本体"这条路径了。
await p.evaluate(()=>{ const g=window.__game;
  const gu=g.guards.list.find(x=>x.alive && !x.host);
  gu.x=g.jean.pos.x+5; gu.z=g.jean.pos.z;
  gu.homeX=gu.x; gu.homeZ=gu.z;
  gu.scanYaw=Math.atan2(g.jean.pos.x-gu.x, g.jean.pos.z-gu.z);
  gu.scanT=999; gu.suspect=0; gu.state=0;
  // 把宿主挪到远处（链条会掉，但足够测完）
  g.poss.host.x = g.jean.pos.x + 60; g.poss.host.z = g.jean.pos.z + 60;
  g.poss.link = 100;
});
await p.waitForTimeout(2600);
await p.evaluate(()=>{ window.__game.poss.link = 100; });
const spotted = await p.evaluate(()=>window.__game.guards.list.filter(g=>g.spotsBody).length);
all &= chk('守卫直视本体被检出', spotted > 0, spotted + ' 名');
all &= chk('监视窗变红告警', (await cls()).includes('alarm'), await cls());
// 测增量而不是绝对值：守卫需要时间转头，一开始还没开始计
const e0 = await p.evaluate(()=>window.__game.mission.expo);
await p.waitForTimeout(2500);
const e1 = await p.evaluate(()=>window.__game.mission.expo);
all &= chk('被盯着时暴露度持续上升', e1 - e0 > 1.5,
  `${e0.toFixed(1)} → ${e1.toFixed(1)}（+${(e1-e0).toFixed(1)}）`);
await p.screenshot({ path:'/private/tmp/claude-502/-Users-meshy1/9e6ab3b8-a251-46c2-8796-d94bd9eac97d/scratchpad/h_alarm.png' });

// 撤回后应恢复
await p.keyboard.press('x'); await p.waitForTimeout(2000);
all &= chk('撤回本体后监视窗关闭', !(await cls()).includes('on'), await cls());

console.log(all ? '\n✓ 监视窗全部正常' : '\n✗ 有问题');
await b.close();
process.exit(all?0:1);
