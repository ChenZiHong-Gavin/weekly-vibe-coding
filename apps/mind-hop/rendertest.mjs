import { chromium } from 'playwright-core';
// 渲染真实性回归 —— 这一类问题所有"量仿真"的测试都测不到。
// 真实 bug：suitVat.setCount() 漏了一次调用，InstancedMesh 默认 count = max，
// 于是画出 318 个定格在旧位置的幽灵实例（仿真只有 124 个西装男）。
// 玩家看到的就是"有人卡在原地不动"。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1440,height:810} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked = true; });
await p.waitForTimeout(2000);
const out = await p.evaluate(async () => {
  const g = window.__game;
  const out = {};

  // ── A. 帧时间分布：找卡顿 ──
  const ft = [];
  let last = performance.now();
  await new Promise(res => {
    const tick = () => {
      const n = performance.now(); ft.push(n - last); last = n;
      if (ft.length < 600) requestAnimationFrame(tick); else res();
    };
    requestAnimationFrame(tick);
  });
  ft.shift();
  const sorted = [...ft].sort((a,b)=>a-b);
  const q = f => +sorted[Math.floor(sorted.length*f)].toFixed(1);
  out.帧时间ms = { 中位:q(0.5), p90:q(0.9), p99:q(0.99), 最大:+Math.max(...ft).toFixed(1),
                  超33ms的帧:ft.filter(v=>v>33).length, 超50ms的帧:ft.filter(v=>v>50).length };

  // ── B. 渲染矩阵 vs 仿真位置：是否脱节 ──
  // 每帧把"可见 agent 的仿真位置集合"和"实际写进 instanceMatrix 的位置集合"比对
  const readPositions = (vat) => {
    const res = [];
    const arr = vat.parts[0].mesh.instanceMatrix.array;
    for (let i = 0; i < vat.parts[0].mesh.count; i++) {
      res.push([+arr[i*16+12].toFixed(3), +arr[i*16+14].toFixed(3)]);
    }
    return res;
  };
  const snap = () => {
    const civ = readPositions(g.civVat), suit = readPositions(g.suitVat),
          dodc = readPositions(g.dodcVat);
    return { civ, suit, dodc,
      simCiv: g.crowd.a.filter(a=>a.alive&&!a.host&&a.model===0).map(a=>[+a.x.toFixed(3),+a.z.toFixed(3)]),
      simSuit: g.crowd.a.filter(a=>a.alive&&!a.host&&a.model===1).map(a=>[+a.x.toFixed(3),+a.z.toFixed(3)]),
    };
  };
  const s1 = snap();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await new Promise(r=>setTimeout(r,600));
  const s2 = snap();
  // 渲染出来的实例里，有多少个位置在两次采样间完全没变？
  const same = (A, B) => {
    const setB = new Set(B.map(v=>v.join(',')));
    return A.filter(v=>setB.has(v.join(','))).length;
  };
  out.渲染实例数 = { civ:s1.civ.length, suit:s1.suit.length, dodc:s1.dodc.length };
  out.仿真数 = { civ:s1.simCiv.length, suit:s1.simSuit.length };
  out.渲染位置0_6秒未变 = { civ:same(s1.civ, s2.civ), suit:same(s1.suit, s2.suit),
                          dodc:same(s1.dodc, s2.dodc) };
  // 渲染的位置集合是否被仿真集合覆盖（脱节的话会有渲染位置找不到对应仿真体）。
  // 用**就近匹配**而不是精确相等：实例缓冲里是上一帧写入的值，仿真可能已经
  // 又步进了一帧，精确相等本身带竞态（实测偶发 2 个假阳性）。幽灵实例是定格在
  // 几十米外的旧位置，0.5m 容差不会放过它们。
  const orphan = (rend, sim) => {
    let n = 0;
    for (const [x, z] of rend) {
      let ok = false;
      for (const [sx, sz] of sim) {
        const dx = x - sx, dz = z - sz;
        if (dx*dx + dz*dz < 0.25) { ok = true; break; }
      }
      if (!ok) n++;
    }
    return n;
  };
  out.渲染位置对不上仿真的 = { civ:orphan(s2.civ, s2.simCiv), suit:orphan(s2.suit, s2.simSuit) };
  return JSON.stringify(out);
});
console.log(JSON.stringify(JSON.parse(out), null, 1));

const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };
const R = JSON.parse(out);
chk('渲染实例数不超过仿真数（无幽灵实例）',
    R.渲染实例数.civ <= R.仿真数.civ && R.渲染实例数.suit <= R.仿真数.suit,
    `渲染 civ=${R.渲染实例数.civ}/${R.仿真数.civ} suit=${R.渲染实例数.suit}/${R.仿真数.suit}`);
chk('每个渲染实例都对应一个仿真体',
    R.渲染位置对不上仿真的.civ === 0 && R.渲染位置对不上仿真的.suit === 0,
    JSON.stringify(R.渲染位置对不上仿真的));
chk('没有渲染位置长时间纹丝不动',
    R.渲染位置0_6秒未变.civ + R.渲染位置0_6秒未变.suit + R.渲染位置0_6秒未变.dodc < 3,
    JSON.stringify(R.渲染位置0_6秒未变));
// 卡顿的判据必须相对当前节奏，不能用绝对毫秒。
// 这里量的其实是 rAF 间隔：机器插电时是 120Hz（中位 8.3ms），
// 电量低时 macOS 把 rAF 压到 30Hz（中位 33.3ms），那时掉一帧就是 66ms，
// 绝对 50ms 阈值会直接误报。卡顿 = 明显长于当下的常态间隔。
const hitchLimit = Math.max(50, R.帧时间ms.中位 * 2.5);
chk('无明显卡顿帧', R.帧时间ms.最大 <= hitchLimit,
    `中位=${R.帧时间ms.中位}ms p99=${R.帧时间ms.p99}ms 最大=${R.帧时间ms.最大}ms（阈值 ${hitchLimit.toFixed(0)}ms）`);
console.log(fails.length ? '\n✗ 渲染有问题' : '\n✓ 渲染真实，无幽灵实例');
await b.close();
process.exit(fails.length?1:0);
