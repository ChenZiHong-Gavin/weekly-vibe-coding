import { chromium } from 'playwright-core';

const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type()==='error' && !m.text().includes('404')) errs.push('CONSOLE: ' + m.text()); });
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game, null, {timeout:40000});
await p.evaluate(()=>{ window.__game.Input.locked = true; });
await p.waitForTimeout(1200);

const fails = [];
const check = (name, ok, detail='') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails.push(name + (detail ? ': ' + detail : ''));
};

// ─────────── 1. 知情者在全城恐慌下是否还找得到 ───────────
{
  const r = await p.evaluate(async () => {
    const g = window.__game;
    // 让整座城陷入恐慌
    for (const a of g.crowd.a) if (a.alive && !a.host) a.state = 2;
    await new Promise(r => setTimeout(r, 9000));
    const inf = g.mission.informants;
    return { total: inf.length,
      alive: inf.filter(a=>a.alive).length,
      inCity: inf.filter(a=>Math.abs(a.x)<g.THREE.MathUtils.clamp(999,0,999) && Math.abs(a.x)<200 && Math.abs(a.z)<200).length,
      reachable: inf.filter(a=>a.alive && !a.knows.read).length,
      crowdAlive: g.crowd.a.filter(a=>a.alive).length };
  });
  check('全城恐慌 9 秒后知情者仍存活', r.alive === r.total, `${r.alive}/${r.total} 存活, 人群剩 ${r.crowdAlive}`);
  check('知情者仍在城内', r.inCity === r.total, `${r.inCity}/${r.total}`);
}
await p.evaluate(()=>location.reload());
await p.waitForFunction(()=>!!window.__game, null, {timeout:40000});
await p.evaluate(()=>{ window.__game.Input.locked = true; });
await p.waitForTimeout(1200);

// ─────────── 2. 输入乱按 25 秒：看异常 / NaN / 越界 ───────────
{
  await p.evaluate(async () => {
    const g = window.__game;
    const keys = ['w','a','s','d','e','x','f','v',' '];
    const t0 = performance.now();
    while (performance.now() - t0 < 25000) {
      const k = keys[(Math.random()*keys.length)|0];
      g.Input.keys[k] = true; g.Input.pressed[k] = true;
      if (Math.random() < 0.15) g.Input.mousePressed[0] = true;   // 左键：用这具身体做事
      g.Input.dx = (Math.random()-0.5) * 0.15;
      g.Input.dy = (Math.random()-0.5) * 0.08;
      await new Promise(r => setTimeout(r, 40 + Math.random()*120));
      g.Input.keys[k] = false;
    }
  });
  const r = await p.evaluate(() => {
    const g = window.__game, fin = v => Number.isFinite(v);
    const bad = [];
    if (!fin(g.jean.pos.x)||!fin(g.jean.pos.y)||!fin(g.jean.pos.z)) bad.push('jean.pos NaN');
    if (!fin(g.poss.link)) bad.push('link NaN');
    if (!fin(g.mission.expo)) bad.push('expo NaN');
    if (!fin(g.tpcam.cam.position.x)) bad.push('cam NaN');
    for (const a of g.crowd.a) if (a.alive && (!fin(a.x)||!fin(a.z))) { bad.push('crowd NaN'); break; }
    for (const gu of g.guards.list) if (!fin(gu.x)||!fin(gu.z)) { bad.push('guard NaN'); break; }
    const oob = g.crowd.a.filter(a=>a.alive && (Math.abs(a.x)>300||Math.abs(a.z)>300)).length;
    return { bad, oob, link:+g.poss.link.toFixed(1), expo:+g.mission.expo.toFixed(1),
      state:g.poss.state, jean:[+g.jean.pos.x.toFixed(1),+g.jean.pos.y.toFixed(2),+g.jean.pos.z.toFixed(1)],
      camY:+g.tpcam.cam.position.y.toFixed(2), over:g.G.over, stage:g.mission.stage,
      hops:g.poss.hops };
  });
  check('乱按 25 秒无 JS 异常', errs.length === 0, errs.slice(0,3).join(' | '));
  check('无 NaN', r.bad.length === 0, r.bad.join(','));
  check('链条在 [0,100]', r.link >= 0 && r.link <= 100, 'link=' + r.link);
  check('暴露在 [0,100]', r.expo >= 0 && r.expo <= 100, 'expo=' + r.expo);
  check('琴没掉出世界', Math.abs(r.jean[0])<200 && Math.abs(r.jean[2])<200 && r.jean[1] > -1, JSON.stringify(r.jean));
  check('相机没钻到地下', r.camY > 0.15, 'camY=' + r.camY);
  check('无 agent 越界', r.oob === 0, r.oob + ' 个越界');
  console.log(`   （乱按后：附身 ${r.hops} 次，状态 ${['本体','飞行','宿主','回体'][r.state]}，阶段 ${r.stage}，结局 ${r.over||'进行中'}）`);
}

// ─────────── 3. 附身状态机边界 ───────────
{
  const r = await p.evaluate(async () => {
    const g = window.__game, P = g.poss, out = {};
    // 3a 飞行途中再按 E / X 应该被忽略
    g.jean.teleport(g.jean.pos.x, 0, g.jean.pos.z);
    P.recall(); await new Promise(r=>setTimeout(r,50));
    const cand = g.crowd.candidates(g.jean.pos.x, g.jean.pos.z, 40, []).filter(a=>a.alive&&!a.immune);
    if (cand.length) {
      const t = cand[0];
      P.target = {obj:t,kind:'crowd',x:t.x,y:t.y+1,z:t.z,d:5};
      P.hop();
      const s1 = P.state;
      const okHop = P.hop() === false;           // 飞行中不该再触发
      const okRec = P.recall() === false;
      out.travelGuard = okHop && okRec && s1 === 1;
      await new Promise(r=>setTimeout(r,1200));
      out.landed = P.state === 2;
      // 3b 目标飞行途中失效
      // 两个坑都踩过：半径 40m 时宿主周围偶尔一个候选都没有（断言被跳过，
      // out.invalidState 为 undefined）；放宽到 120m 后飞行时长变成 2.1s，
      // 又超过了等待时间（状态还停在 P_TRAVEL）。所以：优先挑近的，等待按距离算。
      // 第三个坑：直接写 P.host.x —— 上一步偶尔没落入宿主（P.host 为 null），
      // 整个 evaluate 抛 TypeError，测试连结果都拿不到。锚点要能退回本体位置。
      const ax = P.host ? P.host.x : g.jean.pos.x, az = P.host ? P.host.z : g.jean.pos.z;
      let c2 = g.crowd.candidates(ax, az, 30, []).filter(a=>a.alive&&a!==P.host);
      if (!c2.length) c2 = g.crowd.a.filter(a=>a.alive&&!a.host&&a!==P.host)
        .sort((x,y)=>Math.hypot(x.x-ax,x.z-az)-Math.hypot(y.x-ax,y.z-az))
        .slice(0,1);
      if (c2.length) {
        const t2 = c2[0];
        const dist = Math.hypot(t2.x-ax, t2.z-az);
        P.target = {obj:t2,kind:'crowd',x:t2.x,y:t2.y+1,z:t2.z,d:5};
        P.hop();
        t2.alive = false;                        // 半空中把目标弄没
        // 飞行 0.2+dist*0.016 秒，回程再最多 1.1 秒 —— 留足余量
        await new Promise(r=>setTimeout(r, 1400 + dist*20 + 1200));
        out.invalidTarget = P.state === 0 || P.state === 3;   // 应该回体，不该卡住
        out.invalidState = P.state;
      }
    }
    // 3c 眩晕期间不能附身
    P.stunT = 1.0;
    out.stunGuard = P.canHop() === false;
    P.stunT = 0;
    // 3d 任何人都能被附身（"增强人类"那层已经去掉 —— 见 crowdhealth.mjs）
    const anyone = g.crowd.a.filter(a => a.alive && !a.host).slice(0, 12);
    out.allPossessable = anyone.every(a => !a.immune);
    return out;
  });
  check('飞行中忽略重复 E/X', r.travelGuard === true);
  check('飞行结束正确落入宿主', r.landed === true);
  check('目标半空失效时回体不卡死', r.invalidTarget === true, '状态=' + r.invalidState);
  check('眩晕期间禁止附身', r.stunGuard === true);
  check('任何人都能被附身（无隐形的抗附身者）', r.allPossessable === true);
}

// ─────────── 4. 任务阶段门禁（本体放在禁区外，合法场景）───────────
{
  const r = await p.evaluate(async () => {
    const g = window.__game, out = {};
    g.poss.recall(); await new Promise(r=>setTimeout(r,1400));
    g.mission.stage = 1; g.mission.expo = 0; g.G.over = null; g.mission.failed = null;
    const cx = g.mission.facility.x, cz = g.mission.facility.z;
    const ux = g.mission.gate.x - cx, uz = g.mission.gate.z - cz;
    const l = Math.hypot(ux, uz) || 1;
    // 本体藏在禁区(22m)外
    g.jean.teleport(cx + ux/l*36, 0, cz + uz/l*36);
    for (const gu of g.guards.list) { gu.suspect = 0; gu.state = 0; }

    // 4a 平民走到闸口不该过关
    const c = g.crowd.candidates(g.jean.pos.x, g.jean.pos.z, 40, []).filter(a=>a.alive&&!a.immune);
    if (c.length) {
      const t = c[0];
      t.x = g.jean.pos.x + 3; t.z = g.jean.pos.z;
      g.poss.target = {obj:t,kind:'crowd',x:t.x,y:t.y+1,z:t.z,d:3};
      g.poss.hop();
      await new Promise(r=>setTimeout(r,1400));
      out.civIn = g.poss.state === 2 && !g.poss.host?.isGuard;
      if (g.poss.host) { g.poss.host.x = g.mission.gate.x; g.poss.host.z = g.mission.gate.z; }
      await new Promise(r=>setTimeout(r,600));
      out.civilianBlocked = g.mission.stage === 1;
      g.poss.recall(); await new Promise(r=>setTimeout(r,1400));
    }

    // 4b 守卫走到闸口应过关
    for (const gu of g.guards.list) { gu.suspect = 0; gu.state = 0; }
    const gu = g.guards.list.find(x=>x.alive && !x.host);
    gu.x = g.jean.pos.x + 4; gu.z = g.jean.pos.z; gu.suspect = 0;
    g.poss.target = {obj:gu,kind:'guard',x:gu.x,y:1.1,z:gu.z,d:4};
    g.poss.hop();
    await new Promise(r=>setTimeout(r,1400));
    out.guardIn = g.poss.state === 2 && !!g.poss.host?.isGuard;
    if (g.poss.host?.isGuard) { g.poss.host.x = g.mission.gate.x; g.poss.host.z = g.mission.gate.z; }
    await new Promise(r=>setTimeout(r,600));
    out.guardPasses = g.mission.stage === 2;
    out.notDoneInHost = g.mission.stage === 2 && g.poss.state === 2;
    // 4c 回体才算完成
    g.poss.recall();
    await new Promise(r=>setTimeout(r,1600));
    out.doneOnRecall = g.mission.stage === 3;
    out.diag = { stage:g.mission.stage, expo:+g.mission.expo.toFixed(1), over:g.G.over };
    return out;
  });
  check('平民能被附身', r.civIn === true);
  check('平民走到闸口不算渗透成功', r.civilianBlocked === true);
  check('守卫能被附身', r.guardIn === true);
  check('守卫走到闸口才推进阶段', r.guardPasses === true, JSON.stringify(r.diag));
  check('撤离阶段留在宿主里不算完成', r.notDoneInHost === true);
  check('回到本体才算通关', r.doneOnRecall === true, JSON.stringify(r.diag));
}

// ─────────── 5. 其它容易翻车的地方 ───────────
{
  await p.evaluate(()=>location.reload());
  await p.waitForFunction(()=>!!window.__game, null, {timeout:40000});
  await p.evaluate(()=>{ window.__game.Input.locked = true; });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const g = window.__game, out = {};
    // 5a 被击倒的守卫不能被附身
    const gu = g.guards.list[0];
    gu.alive = false;
    const cands = [];
    g.poss.guards = g.guards;
    g.jean.teleport(gu.x + 3, 0, gu.z);
    await new Promise(r=>requestAnimationFrame(r));
    const cd = new g.THREE.Vector3(); g.tpcam.cam.getWorldDirection(cd);
    // 直接朝守卫方向
    g.tpcam.yaw = Math.atan2(g.jean.pos.x - gu.x, g.jean.pos.z - gu.z);
    await new Promise(r=>setTimeout(r,300));
    g.tpcam.cam.getWorldDirection(cd);
    const t = g.poss.acquire(cd);
    out.deadGuardNotTargetable = !(t && t.obj === gu);
    gu.alive = true;

    // 5b 读守卫的记忆不该崩
    const g2 = g.guards.list.find(x=>x.alive);
    g.poss.target = {obj:g2,kind:'guard',x:g2.x,y:1.1,z:g2.z,d:3};
    g2.x = g.jean.pos.x + 3; g2.z = g.jean.pos.z;
    g.poss.hop();
    await new Promise(r=>setTimeout(r,1400));
    let readOk = true;
    try { for (let i=0;i<40;i++) g.mission.read(g.poss.host, 0.05); } catch(e) { readOk = false; out.readErr = e.message; }
    out.readGuardOk = readOk;

    // 5c 守卫宿主孤身时开火不该崩
    let fireOk = true;
    try {
      for (const o of g.guards.list) if (o !== g.poss.host) o.alive = false;
      const v = g.guards.hostFires(g.poss.host);
      out.lonelyFireReturnsNull = v === null;
    } catch(e) { fireOk = false; out.fireErr = e.message; }
    out.fireOk = fireOk;
    return out;
  });
  check('被击倒的守卫不能被锁定', r.deadGuardNotTargetable === true);
  check('读守卫记忆不崩', r.readGuardOk === true, r.readErr || '');
  check('孤身守卫开火安全返回', r.fireOk === true && r.lonelyFireReturnsNull === true, r.fireErr || '');
}

// ─────────── 6. 长时间稳定性 ───────────
{
  await p.evaluate(()=>location.reload());
  await p.waitForFunction(()=>!!window.__game, null, {timeout:40000});
  await p.evaluate(()=>{ window.__game.Input.locked = true; });
  await p.waitForTimeout(1500);
  const s0 = await p.evaluate(()=>document.getElementById('stats').textContent);
  await p.evaluate(async () => {
    const g = window.__game;
    const t0 = performance.now();
    while (performance.now() - t0 < 40000) {
      g.Input.keys['w'] = true;
      g.Input.dx = 0.01;
      if (Math.random() < 0.25) g.Input.pressed['e'] = true;
      if (Math.random() < 0.06) g.Input.pressed['x'] = true;
      await new Promise(r=>setTimeout(r,120));
    }
    g.Input.keys['w'] = false;
  });
  const s1 = await p.evaluate(()=>document.getElementById('stats').textContent);
  const fps0 = +s0.match(/(\d+) fps/)[1], fps1 = +s1.match(/(\d+) fps/)[1];
  const dc0 = +s0.match(/draw (\d+)/)[1], dc1 = +s1.match(/draw (\d+)/)[1];
  check('40 秒连续操作后帧率未崩', fps1 > fps0 * 0.6, `${fps0} → ${fps1} fps`);
  check('draw call 未泄漏', dc1 < dc0 * 2.2, `${dc0} → ${dc1}`);
  console.log('   ' + s1);
}

console.log('\n' + (fails.length ? `✗ ${fails.length} 项失败:\n  ` + fails.join('\n  ') : '✓ 全部通过'));
if (errs.length) console.log('\n运行期错误:\n  ' + errs.slice(0,6).join('\n  '));
await b.close();
process.exit(fails.length || errs.length ? 1 : 0);
