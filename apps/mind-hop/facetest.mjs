import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:40000});
await p.waitForTimeout(2200);
const r = await p.evaluate(() => ({
  michelle: +(window.__game.civVat.faceFlip || 0).toFixed(3),
  soldier:  +(window.__game.dodcVat.faceFlip || 0).toFixed(3),
}));
console.log('Michelle faceFlip =', r.michelle, '  Soldier faceFlip =', r.soldier);
console.log(r.michelle !== r.soldier ? '✓ 识别为朝向相反，已各自规范化' : '⚠ 两者相同');
await b.close();
