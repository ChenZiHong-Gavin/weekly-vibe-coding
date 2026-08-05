import { chromium } from 'playwright-core';
// 验证三种模型在游戏里都是朝着移动方向走（不是倒着走）。
// 判据：把 agent 的速度方向投到屏幕，再看模型正面法线朝哪 —— 太绕。
// 改用几何判据：取 agent 的 yaw，算出它"脸"的世界方向，与速度方向做点积。
// VAT 规范化后所有模型的脸都朝 +Z（局部），经 yaw 旋转后应与速度同向。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1100,height:700} });
p.on('pageerror', e=>console.log('ERR',e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.waitForTimeout(2000);
// 守卫默认站岗不动 —— 用骚乱把他们全叫起来跑
await p.evaluate(()=>{ const g=window.__game;
  const gu=g.guards.list[0];
  g.guards.attract(gu.x+55, gu.z+55, 30);
  for(const x of g.guards.list){ x.state=1; x.investigate=30; }
});
await p.waitForTimeout(3500);
const r = await p.evaluate(() => {
  const g = window.__game;
  const test = (list, label) => {
    let ok = 0, bad = 0, samples = [];
    for (const a of list) {
      if (a.host || a.alive === false) continue;
      const sp = Math.hypot(a.vx, a.vz);
      if (sp < 0.7) continue;                       // 只看真在走的
      // 模型脸朝 +Z（局部），yaw 绕 Y 旋转 → 世界脸向
      const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
      const dot = (a.vx / sp) * fx + (a.vz / sp) * fz;
      if (dot > 0.5) ok++; else bad++;
      if (samples.length < 3) samples.push(+dot.toFixed(2));
    }
    return { label, ok, bad, samples };
  };
  return [test(g.crowd.a.filter(a=>a.model===0), '平民A(Michelle)'),
          test(g.crowd.a.filter(a=>a.model===1), '平民B(西装)'),
          test(g.guards.list, 'DODC(Soldier)')];
});
let allOk = true;
for (const t of r) {
  const good = t.bad === 0 && t.ok > 0;
  if (!good && t.ok + t.bad > 0) allOk = false;
  console.log(`${t.label.padEnd(20)} 朝向正确 ${String(t.ok).padStart(3)} / 倒着走 ${String(t.bad).padStart(3)}   ` +
    `点积样本 ${JSON.stringify(t.samples)}  ${t.ok+t.bad===0 ? '(无样本)' : good ? '✓' : '✗'}`);
}
console.log(allOk ? '\n✓ 没有倒着走的' : '\n✗ 仍有模型倒着走');
await b.close();
process.exit(allOk?0:1);
