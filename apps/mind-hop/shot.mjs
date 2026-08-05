import { chromium } from 'playwright-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = process.argv[2] || 'shot.png';
const wait = +(process.argv[3] || 9000);
const b = await chromium.launch({ executablePath: CHROME, headless: true,
  args:['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:1440,height:810}, deviceScaleFactor:1 });
const logs=[];
p.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
p.on('pageerror', e => logs.push(`[pageerror] ${e.message}\n${(e.stack||'').split('\n').slice(0,6).join('\n')}`));
p.on('requestfailed', r => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
await p.goto('http://localhost:5178/'+(process.env.Q||''), { waitUntil:'load' });
await p.waitForTimeout(wait);
// 进游戏：点一下拿指针锁，模拟输入
await p.evaluate(() => { const c=document.getElementById('cv'); c && c.click(); });
if (process.env.ACT) { await p.evaluate(new Function(process.env.ACT)); await p.waitForTimeout(+(process.env.ACTWAIT||1200)); }
const diag = await p.evaluate(() => ({
  diag: window.__diag || null,
  boot: document.getElementById('bmsg')?.textContent,
  stats: document.getElementById('stats')?.textContent,
  gone: document.getElementById('boot')?.classList.contains('gone'),
}));
await p.screenshot({ path: out });
console.log('── console ──');
console.log(logs.slice(0,40).join('\n') || '(空)');
console.log('── state ──');
console.log(JSON.stringify(diag, null, 1));
await b.close();
