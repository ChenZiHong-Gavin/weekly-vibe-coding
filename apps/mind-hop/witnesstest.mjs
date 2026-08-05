import { chromium } from 'playwright-core';
// 目击回归：附身是"看得见"的，这是"制造骚乱"这个功能存在的唯一理由。
// 没有这一层，附身零代价 → 从来不需要把守卫引开 → 喊叫就是个多余按钮。
// 最关键的是第 7 条：喊叫之后，原本被盯着的目标真的变干净了。
//
// 写这个测试时踩的坑：一开始直接把目标传送到守卫正前方 8m，结果全是 0 目击。
// 因为那个点可能正好在楼里 —— 视线被墙挡住，witnessHop 判"看不见"是对的，
// 是测试摆错了位置。摆人之前必须挑一个视线通畅的方向。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.waitForTimeout(1500);

const r = JSON.parse(await p.evaluate(async () => {
  const g = window.__game;
  const out = {};

  const blocked = (x, z) => {
    for (const bx of g.city.boxes) {
      if (bx.low) continue;
      if (Math.abs(x - bx.x) < bx.hw + 0.4 && Math.abs(z - bx.z) < bx.hd + 0.4) return true;
    }
    return false;
  };
  const clearLine = (ax, az, bx2, bz2) => {
    const dx = bx2 - ax, dz = bz2 - az;
    for (let i = 1; i <= 10; i++) if (blocked(ax + dx * i / 10, az + dz * i / 10)) return false;
    return true;
  };
  /** 让守卫转向一个视线通畅的方向，返回该方向上 dist 米处的坐标 */
  const clearDir = (gu, dist) => {
    for (let k = 0; k < 24; k++) {
      const yaw = gu.yaw + k * (Math.PI * 2 / 24);
      const x = gu.x + Math.sin(yaw) * dist, z = gu.z + Math.cos(yaw) * dist;
      if (!blocked(x, z) && clearLine(gu.x, gu.z, x, z)) { gu.yaw = yaw; return { x, z }; }
    }
    return null;
  };
  const lone = () => {                     // 周围没有其它守卫，便于把怀疑度归因到他一个人
    for (const gu of g.guards.list) {
      if (!gu.alive || gu.host) continue;
      const near = g.guards.list.filter(o => o !== gu && o.alive &&
        Math.hypot(o.x - gu.x, o.z - gu.z) < 40).length;
      if (near === 0) return gu;
    }
    return g.guards.list.find(x => x.alive && !x.host);
  };
  const civ = () => g.crowd.a.find(a => a.alive && !a.host);

  // 1) 正前方 8m 视线通畅处被附身 → 该守卫怀疑度大幅跳升
  {
    const gu = lone(), a = civ(), at = clearDir(gu, 8);
    out.placed = !!at;
    gu.suspect = 0; a.x = at.x; a.z = at.z;
    out.seenN = g.guards.witnessHop(a.x, a.z, false, false);
    out.seenSuspect = +gu.suspect.toFixed(1);
  }
  // 2) 视野外（120m）→ 完全没人察觉
  {
    const gu = lone(), a = civ();
    gu.suspect = 0; a.x = gu.x + 120; a.z = gu.z + 120;
    out.farN = g.guards.witnessHop(a.x, a.z, false, false);
    out.farSuspect = +gu.suspect.toFixed(1);
  }
  // 3) 背对着 → 看不见（同一个通畅方向，只把守卫转过身）
  {
    const gu = lone(), a = civ(), at = clearDir(gu, 8);
    gu.suspect = 0; a.x = at.x; a.z = at.z;
    gu.yaw += Math.PI;
    out.backN = g.guards.witnessHop(a.x, a.z, false, false);
    out.backSuspect = +gu.suspect.toFixed(1);
  }
  // 4) 隔着建筑 → 看不见。
  //    坑：第一版随便挑了一栋楼，两点隔着它相距 50 多米 —— 直接被 34m 视野
  //    距离过滤掉了，根本没走到视线判断。把 #los 注释掉这条依然通过（没牙齿）。
  //    所以要挑最薄的那一栋、沿薄的那条轴跨过去，并断言距离确实在视野内。
  {
    const gu = lone(), a = civ();
    let best = null, bh = Infinity;
    for (const bx of g.city.boxes) {
      if (bx.low) continue;
      const h = Math.min(bx.hw, bx.hd);
      if (h < bh) { bh = h; best = bx; }
    }
    const alongX = best.hw <= best.hd;      // 沿较薄的轴穿过去
    const off = bh + 4;
    if (alongX) { gu.x = best.x - off; gu.z = best.z; a.x = best.x + off; a.z = best.z; }
    else        { gu.z = best.z - off; gu.x = best.x; a.z = best.z + off; a.x = best.x; }
    gu.yaw = Math.atan2(a.x - gu.x, a.z - gu.z);
    gu.suspect = 0;
    out.wallDist = +Math.hypot(a.x - gu.x, a.z - gu.z).toFixed(1);
    out.wallN = g.guards.witnessHop(a.x, a.z, false, false);
  }
  // 5) 跳进同僚比跳进平民严重
  {
    const gu = lone();
    const other = g.guards.list.find(x => x.alive && !x.host && x !== gu);
    const at = clearDir(gu, 8);
    other.x = at.x; other.z = at.z;
    gu.suspect = 0;
    g.guards.witnessHop(other.x, other.z, true, false);
    out.guardHostSuspect = +gu.suspect.toFixed(1);
  }
  // 6) 准星预览必须和实际一致 —— HUD 说"没人看着"就不能真有人看着。
  //    这里刻意混入被墙挡住/超距的摆位，让两边都有 0 和非 0。
  {
    let mismatch = 0, checked = 0, nonZero = 0;
    for (const gu of g.guards.list.slice(0, 10)) {
      if (!gu.alive || gu.host) continue;
      for (const d of [6, 18, 30, 50]) {
        const a = civ();
        a.x = gu.x + Math.sin(gu.yaw) * d;
        a.z = gu.z + Math.cos(gu.yaw) * d;
        const pre = g.guards.wouldWitness(a.x, a.z);
        const act = g.guards.witnessHop(a.x, a.z, false, false);
        checked++; if (pre !== act) mismatch++; if (act > 0) nonZero++;
      }
    }
    out.previewChecked = checked; out.previewMismatch = mismatch; out.previewNonZero = nonZero;
  }
  // 7) 完整回路：被盯着的目标 → 喊叫把守卫引开 → 同一个目标变干净
  {
    for (const gu of g.guards.list) {
      gu.suspect = 0; gu.state = 0; gu.investigate = 0; gu.bodyLock = 0;
    }
    g.guards.lure = null;
    const gu = lone();
    const at = clearDir(gu, 10);
    out.loopWatchedBefore = g.guards.wouldWitness(at.x, at.z);
    const gx0 = gu.x, gz0 = gu.z;
    // 在守卫背后 34m 处喊一声（骚乱半径 42m 之内）
    const sx = gu.x - Math.sin(gu.yaw) * 34, sz = gu.z - Math.cos(gu.yaw) * 34;
    out.loopPulled = g.guards.attract(sx, sz);
    // 让他真的走过去 —— 骚乱的意义在于位移，不只是改个状态位
    for (let i = 0; i < 420; i++) g.guards.update(1 / 60, null, null, null);
    out.loopWatchedAfter = g.guards.wouldWitness(at.x, at.z);
    out.loopGuardMoved = +Math.hypot(gu.x - gx0, gu.z - gz0).toFixed(1);
  }
  return JSON.stringify(out);
}));

const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };

chk('测试摆位有效（目标不在墙里）', r.placed === true);
chk('当众附身会被看到', r.seenN >= 1 && r.seenSuspect > 12, `${r.seenN} 人目击, 怀疑度 ${r.seenSuspect}`);
chk('视野外附身没人察觉', r.farN === 0 && r.farSuspect === 0, `n=${r.farN} 怀疑度=${r.farSuspect}`);
chk('背对着的守卫看不见', r.backN === 0 && r.backSuspect === 0, `n=${r.backN}`);
chk('隔着建筑看不见（且距离在视野内，确保真的考的是视线）',
    r.wallN === 0 && r.wallDist < 34, `n=${r.wallN} 距离=${r.wallDist}m`);
chk('附身同僚比附身平民严重', r.guardHostSuspect > r.seenSuspect * 1.5,
    `同僚 ${r.guardHostSuspect} vs 平民 ${r.seenSuspect}`);
chk('准星预览与实际一致', r.previewMismatch === 0 && r.previewNonZero > 0,
    `${r.previewChecked} 组（${r.previewNonZero} 组有人看到）, ${r.previewMismatch} 组不符`);
chk('喊叫真的能把目标"洗干净"',
    r.loopWatchedBefore >= 1 && r.loopWatchedAfter === 0 && r.loopGuardMoved > 8,
    `骚乱前 ${r.loopWatchedBefore} 双眼睛 → 引开 ${r.loopPulled} 名（走了 ${r.loopGuardMoved}m）→ 之后 ${r.loopWatchedAfter} 双`);

console.log(fails.length ? `\n✗ ${fails.length} 项失败` : '\n✓ 目击机制成立，制造骚乱有了用处');
await b.close();
process.exit(fails.length ? 1 : 0);
