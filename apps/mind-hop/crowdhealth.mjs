import { chromium } from 'playwright-core';
// 人群健康度回归：
//  · 不该有长期站着不动的人（没有寻路，目标在楼对面的 agent 会一直顶墙）
//  · 不该有"走过去却附不了身"的人（那种"不让你做又不说为什么"读作游戏坏了）
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.waitForTimeout(1800);

const r = JSON.parse(await p.evaluate(async () => {
  const g = window.__game;
  const clr = (x, z) => {
    let best = Infinity;
    for (const b of g.city.boxes) {
      if (b.low) continue;
      const dx = Math.abs(x - b.x) - b.hw, dz = Math.abs(z - b.z) - b.hd;
      let d;
      if (dx > 0 && dz > 0) d = Math.hypot(dx, dz);
      else if (dx > 0) d = dx; else if (dz > 0) d = dz;
      else d = Math.max(dx, dz);
      if (d < best) best = d;
    }
    return best;
  };
  const units = [];
  for (const a of g.crowd.a) if (a.alive) units.push({ o: a, kind: 'civ' });
  for (const gu of g.guards.list) if (gu.alive) units.push({ o: gu, kind: 'guard' });
  const rec = new Map(units.map(u => [u.o, { kind: u.kind, run: 0, maxRun: 0,
    moved: 0, last: [u.o.x, u.o.z], minClr: Infinity,
    lastPhase: u.o.phase, crawlRun: 0, crawlMax: 0 }]));
  const t0 = performance.now(), DT = 0.2;
  while (performance.now() - t0 < 16000) {
    for (const u of units) {
      const r = rec.get(u.o), o = u.o;
      const step = Math.hypot(o.x - r.last[0], o.z - r.last[1]);
      r.moved += step; r.last = [o.x, o.z];
      // 判"一动不动"用**连续**的位移增量，不用速度、也不用净位移：
      //  · 速度：原地抖动的 agent 速度不为 0 但一步没走
      //  · 净位移：走出去 8m 再走回来是正常城市行为，不该算卡住
      if (step < 0.03) { r.run += DT; if (r.run > r.maxRun) r.maxRun = r.run; }
      else r.run = 0;
      const c = clr(o.x, o.z);
      if (c < r.minClr) r.minClr = c;
      // 动画可读性：播走路 clip 但相位几乎不前进 = 腿定在半步上，看着像冻住。
      // 位置在动也可能出现这种情况（贴墙缓行），所以必须单独量。
      let dp = o.phase - r.lastPhase;
      if (dp < -0.5) dp += 1;
      r.lastPhase = o.phase;
      const walking = o.clip === 1 || o.clip === 2;
      if (walking && (dp <= 1e-5 || DT / dp > 2.5)) {
        r.crawlRun += DT;
        if (r.crawlRun > r.crawlMax) r.crawlMax = r.crawlRun;
      } else r.crawlRun = 0;
    }
    await new Promise(r => setTimeout(r, DT * 1000));
  }
  const rows = [...rec.entries()].map(([o, r]) => ({ kind: r.kind,
    maxRun: +r.maxRun.toFixed(1), moved: +r.moved.toFixed(1), minClr: +r.minClr.toFixed(2),
    crawlMax: +r.crawlMax.toFixed(1),
    immune: !!o.immune,
    postInside: r.kind === 'guard' ? !!g.city.isBlocked(o.postX, o.postZ, 1.1) : false }));
  return JSON.stringify({
    total: rows.length,
    inWall: rows.filter(r => r.minClr < 0).length,
    worstClr: Math.min(...rows.map(r => r.minClr)),
    postInside: rows.filter(r => r.postInside).length,
    stillOver4s: rows.filter(r => r.maxRun > 4).length,
    stillOver3s: rows.filter(r => r.maxRun > 3).length,
    worstStill: Math.max(...rows.map(r => r.maxRun)),
    civStill: rows.filter(r => r.kind === 'civ' && r.maxRun > 3).length,
    guardStill: rows.filter(r => r.kind === 'guard' && r.maxRun > 3).length,
    minPath: Math.min(...rows.map(r => r.moved)),
    crawlOver2s: rows.filter(r => r.crawlMax > 2).length,
    worstCrawl: Math.max(...rows.map(r => r.crawlMax)),
    unpossessable: rows.filter(r => r.immune).length,
  });
}));
const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };
chk('无人中心在建筑内', r.inWall === 0, `最小墙距 ${r.worstClr}m`);
chk('守卫岗位都在楼外', r.postInside === 0, r.postInside + ' 个在楼内');
chk('无人连续静止超 3 秒', r.stillOver3s === 0,
    `最长 ${r.worstStill}s（平民 ${r.civStill} / 守卫 ${r.guardStill}）`);
chk('每个单位 16 秒内都走过路', r.minPath > 2, `最少 ${r.minPath}m`);
chk('无人腿定在半步上（动画相位不爬行）', r.crawlOver2s === 0,
    `${r.crawlOver2s} 人，最长 ${r.worstCrawl}s`);
chk('每个人都能被附身', r.unpossessable === 0, r.unpossessable + ' 人不可附身');
chk('单位规模正常', r.total > 300, r.total + ' 个');
console.log(fails.length ? '\n✗ 人群有问题' : '\n✓ 人群健康');
await b.close();
process.exit(fails.length?1:0);
