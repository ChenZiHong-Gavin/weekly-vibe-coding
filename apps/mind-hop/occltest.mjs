import { chromium } from 'playwright-core';
// 遮挡：隔着建筑的声音必须更闷、更小 —— 这是"听见拐角后的脚步"的基础。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.mouse.click(640,360);
await p.waitForTimeout(1000);

const r = await p.evaluate(() => {
  const g = window.__game, a = g.audio;
  // 找一栋楼，把琴放在一侧、声源放在正对面（隔着整栋楼）
  let box = null;
  for (const bx of g.city.boxes) { if (!bx.low && bx.h > 12) { box = bx; break; } }
  const D = Math.max(box.hw, box.hd) + 7;
  g.jean.teleport(box.x - D, 0, box.z);
  g.tpcam.pivot.set(box.x - D, 1.4, box.z);
  g.tpcam.cam.position.set(box.x - D, 1.6, box.z);
  g.tpcam.cam.updateMatrixWorld(true);
  a.setListener(g.tpcam.cam, null);
  const probe = (x, z) => {
    const v = a.at('boot', x, z, { vol: 1, maxD: 80 });
    return v ? { gain: +v.gain.gain.value.toFixed(4), cut: Math.round(v.filt.frequency.value) } : null;
  };
  const occl = a.occluder(box.x - D, box.z, box.x + D, box.z);
  return {
    楼: [box.x | 0, box.z | 0, +box.hw.toFixed(1), +box.hd.toFixed(1)],
    隔楼: probe(box.x + D, box.z),          // 穿过整栋楼
    同距离通视: probe(box.x - D, box.z + 2 * D),   // 同样距离但不隔楼
    遮挡量: +occl.toFixed(2),
  };
});
console.log(JSON.stringify(r, null, 1));
const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };
chk('检出遮挡', r.遮挡量 > 0.3, '遮挡量=' + r.遮挡量);
chk('隔楼的声音明显更闷',
    !!r.隔楼 && !!r.同距离通视 && r.隔楼.cut < r.同距离通视.cut * 0.55,
    r.隔楼 && r.同距离通视 ? `${r.隔楼.cut}Hz vs 通视 ${r.同距离通视.cut}Hz` : '');
console.log(fails.length ? '\n✗ 遮挡未生效' : '\n✓ 遮挡生效');
await b.close();
process.exit(fails.length?1:0);
