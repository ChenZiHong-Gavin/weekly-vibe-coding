import { chromium } from 'playwright-core';
// 验证「双耳」：附身在外时，本体附近的靴子声必须听得见 —— 那是最关键的情报。
// 打桩记录每个声音的最终增益/摆位/低通截止，再断言可听度关系。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
await p.mouse.click(640,360);
await p.waitForTimeout(1000);

const probe = async (label, setup) => {
  const r = await p.evaluate(async (setupSrc) => {
    const g = window.__game, a = g.audio;
    eval(setupSrc);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    a.setListener(g.tpcam.cam, g.poss.state !== 0 ? { x:g.jean.pos.x, z:g.jean.pos.z } : null);
    // 直接调 #place 走不通（私有），改为实测 at() 产出的节点
    const cap = [];
    const origVoice = a.at.bind(a);
    const v = origVoice('boot', window.__probeX, window.__probeZ, { vol:1, maxD:40 });
    if (!v) return null;
    return { gain:+v.gain.gain.value.toFixed(4), pan:+v.pan.pan.value.toFixed(2),
             cutoff: Math.round(v.filt.frequency.value) };
  }, setup);
  console.log(`${label.padEnd(30)} ${r ? `增益 ${String(r.gain).padStart(6)}  摆位 ${String(r.pan).padStart(5)}  低通 ${String(r.cutoff).padStart(6)}Hz` : '听不到'}`);
  return r;
};

const fails = [];
const chk = (n, ok, d='') => { console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };

// 场景：附身到一个人身上，然后把宿主挪远，靴子放在本体旁
await p.keyboard.press('e');
await p.waitForTimeout(1500);
await p.evaluate(()=>{
  const g = window.__game;
  g.poss.host.x = g.jean.pos.x + 70; g.poss.host.z = g.jean.pos.z;
  g.poss.link = 100;
});
await p.waitForTimeout(600);

// A：靴子紧贴本体（70m 外的相机根本听不到，只能靠本体那只耳朵）
const near = await probe('靴子在本体旁 2m', `
  window.__probeX = g.jean.pos.x + 2; window.__probeZ = g.jean.pos.z;
`);
// B：靴子离本体和相机都很远
const far = await probe('靴子在两边都很远的地方', `
  window.__probeX = g.jean.pos.x + 200; window.__probeZ = g.jean.pos.z + 200;
`);
// C：靴子紧贴宿主（走相机那只耳朵）
const atHost = await probe('靴子紧贴宿主 2m', `
  window.__probeX = g.poss.host.x + 2; window.__probeZ = g.poss.host.z;
`);

chk('本体旁的靴子听得见（本体耳朵生效）', !!near && near.gain > 0.2,
    near ? 'gain=' + near.gain : '完全听不到 —— 情报丢失');
chk('远处的靴子听不见', !far, far ? 'gain=' + far.gain : '');
chk('宿主旁的靴子也听得见', !!atHost && atHost.gain > 0.2, atHost ? 'gain=' + atHost.gain : '');
chk('走本体耳朵的声音被闷掉（可分辨来源）',
    !!near && near.cutoff <= 2600, near ? near.cutoff + 'Hz' : '');
chk('走相机耳朵的声音更亮', !!atHost && !!near && atHost.cutoff > near.cutoff,
    atHost && near ? `${atHost.cutoff}Hz vs ${near.cutoff}Hz` : '');

// 回到本体后，本体耳朵应关闭
await p.keyboard.press('x');
await p.waitForTimeout(2200);
const back = await p.evaluate(()=>window.__game.audio.bodyEar);
chk('回到本体后不再有第二只耳朵', back === null, JSON.stringify(back));

// 材质区分：靴子比便鞋传得远
const reach = await p.evaluate(()=>{
  const a = window.__game.audio, g = window.__game;
  a.setListener(g.tpcam.cam, null);
  const test = (name, maxD) => {
    for (let d = 4; d < 60; d += 2) {
      const v = a.at(name, g.jean.pos.x + d, g.jean.pos.z, { vol:1, maxD });
      if (!v) return d;
    }
    return 60;
  };
  return { boot: test('boot', 40), step: test('step', 26) };
});
chk('靴子比便鞋传得远（能分辨谁在靠近）', reach.boot > reach.step + 8,
    `靴 ${reach.boot}m vs 便鞋 ${reach.step}m`);

console.log(fails.length ? `\n✗ ${fails.length} 项失败` : '\n✓ 听觉情报链完整');
await b.close();
process.exit(fails.length?1:0);
