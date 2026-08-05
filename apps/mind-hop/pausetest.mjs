import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.mouse.click(640,360); await p.waitForTimeout(1000);
const fails=[]; const chk=(n,ok,d='')=>{console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok)fails.push(n);};

const pos = () => p.evaluate(()=>[+window.__game.jean.pos.x.toFixed(2), +window.__game.jean.pos.z.toFixed(2)]);
// 面板关：能走（本体走方向键 —— WASD 是给宿主的）
let a = await pos();
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(900); await p.keyboard.up('ArrowUp');
let bpos = await pos();
const moved = Math.hypot(bpos[0]-a[0], bpos[1]-a[1]);
chk('面板关闭时可以移动', moved > 1, moved.toFixed(2)+'m');

// 面板开：不能走
await p.keyboard.press('Tab'); await p.waitForTimeout(400);
chk('面板已打开', await p.evaluate(()=>window.__game.aset.open));
a = await pos();
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1200); await p.keyboard.up('ArrowUp');
bpos = await pos();
const frozen = Math.hypot(bpos[0]-a[0], bpos[1]-a[1]);
chk('面板打开时移动被冻结', frozen < 0.35, frozen.toFixed(2)+'m');

// 关掉后恢复
await p.keyboard.press('Tab'); await p.waitForTimeout(400);
a = await pos();
await p.keyboard.down('ArrowUp'); await p.waitForTimeout(900); await p.keyboard.up('ArrowUp');
bpos = await pos();
const again = Math.hypot(bpos[0]-a[0], bpos[1]-a[1]);
chk('关闭后恢复移动', again > 1, again.toFixed(2)+'m');

console.log(fails.length ? '\n✗ 有问题' : '\n✓ 面板输入冻结正常');
await b.close();
process.exit(fails.length?1:0);
