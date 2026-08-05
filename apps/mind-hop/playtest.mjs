import { chromium } from 'playwright-core';
const OUT='/private/tmp/claude-502/-Users-meshy1/9e6ab3b8-a251-46c2-8796-d94bd9eac97d/scratchpad/';
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal'] });
const p = await b.newPage({ viewport:{width:1440,height:810} });
p.on('pageerror', e=>console.log('❌', e.message));
p.on('console', m=>{ if(m.type()==='error'&&!m.text().includes('404')) console.log('❌', m.text()); });
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game, null, {timeout:40000});
await p.evaluate(()=>{ window.__game.Input.locked = true; });
await p.waitForTimeout(1500);

const S = () => p.evaluate(() => {
  const g = window.__game, P = g.poss, M = g.mission;
  const st = ['本体','飞行','宿主','回体'][P.state];
  return { st, host: P.host ? (P.host.isGuard ? '守卫' : '平民') : '—',
    stumble: +(g.hostAv.stumbleT||0).toFixed(2),
    link: Math.round(P.link), expo: Math.round(M.expo), susp: Math.round(g.guards.peakSuspect()),
    dist: +P.distFromBody().toFixed(0), hops: P.hops, burned: P.burned,
    stage: ['追溯','渗透','撤离','完成'][M.stage], found: M.found,
    invest: g.guards.list.filter(x=>x.state===1).length,
    alert: g.guards.list.filter(x=>x.state>=2).length,
    over: g.G.over, fail: M.failed,
    camY: +g.tpcam.cam.position.y.toFixed(1),
  };
});
const line = (t,s)=>console.log(
 `${t.padEnd(20)} ${s.st}/${s.host.padEnd(3)} 踉跄${String(s.stumble).padStart(4)} 链${String(s.link).padStart(3)} `+
 `离体${String(s.dist).padStart(3)}m 附身${String(s.hops).padStart(2)} 暴露${String(s.expo).padStart(2)} `+
 `怀疑${String(s.susp).padStart(3)} 查${s.invest} 警${s.alert} [${s.stage} ${s.found}/3]`);

const key=async(k,ms=90)=>{await p.keyboard.down(k);await p.waitForTimeout(ms);await p.keyboard.up(k);};

console.log('═══ 附身玩法测试 ═══');
let s=await S(); line('初始', s);

// 1) 附身
await key('e',40); await p.waitForTimeout(120);
s=await S(); line('E 附身（飞行中）', s);
await p.waitForTimeout(350);
s=await S(); line('落入宿主·踉跄', s);
await p.screenshot({path:OUT+'n_stumble.png'});
await p.waitForTimeout(700);
s=await S(); line('踉跄结束', s);

// 2) 走两步（验证宿主可操控）
const before=await p.evaluate(()=>{const h=window.__game.poss.host;return h?[+h.x.toFixed(1),+h.z.toFixed(1)]:null;});
await key('w',1200);
const after=await p.evaluate(()=>{const h=window.__game.poss.host;return h?[+h.x.toFixed(1),+h.z.toFixed(1)]:null;});
console.log(`宿主行走 1.2s: ${JSON.stringify(before)} → ${JSON.stringify(after)}  位移 ${before&&after?Math.hypot(after[0]-before[0],after[1]-before[1]).toFixed(1):'?'}m`);

// 3) 读记忆
await key('f',2200);
s=await S(); line('F 读取记忆', s);
console.log('  日志:', await p.evaluate(()=>window.__game.mission.log[0]?.t||'(空)'));

// 4) 连续换宿主，看链条随距离衰减
for(let i=0;i<8;i++){ await key('e',40); await p.waitForTimeout(420); }
s=await S(); line('连换宿主 ×8', s);
await p.screenshot({path:OUT+'n_host.png'});

// 5) 第一人称
await key('v',60); await p.waitForTimeout(500);
await p.screenshot({path:OUT+'n_fp.png'});
console.log('  第一人称相机高度:', (await S()).camY);
await key('v',60); await p.waitForTimeout(300);

// 6) 制造骚乱
await p.evaluate(()=>{ const g=window.__game, gu=g.guards.list[0];
  if(g.poss.host){ g.poss.host.x=gu.x+14; g.poss.host.z=gu.z+14; } });
await p.waitForTimeout(300);
await p.evaluate(()=>{ window.__game.Input.mousePressed[0]=true; });
await p.waitForTimeout(700);
s=await S(); line('左键 制造骚乱', s);

// 7) 撤回本体
await key('x',60); await p.waitForTimeout(1400);
s=await S(); line('X 撤回本体', s);

// 8) 链条断裂：把宿主拉到很远
await key('e',40); await p.waitForTimeout(500);
await p.evaluate(()=>{ const g=window.__game; if(g.poss.host){ g.poss.host.x+=150; g.poss.host.z+=150; } });
await p.waitForTimeout(4000);
s=await S(); line('远距离→链断弹回', s);

// 9) 全流程：读满 3 个线索
await p.evaluate(()=>{ const g=window.__game;
  for(const a of g.mission.informants){ if(!a.knows.read){ a.knows.read=true; g.mission.found++; g.mission.clues.push(a.knows);} }
  if(g.mission.found>=3) g.mission.stage=1; });
await p.waitForTimeout(400);
s=await S(); line('线索集齐→渗透', s);

// 10) 附身守卫走到闸口
await p.evaluate(()=>{ const g=window.__game;
  const gu=g.guards.list.find(x=>!x.host);
  // 玩家的正常打法：本体藏在禁区外，附身外围守卫再走进去
  const cx=g.mission.facility.x, cz=g.mission.facility.z;
  const ux=(g.mission.gate.x-cx), uz=(g.mission.gate.z-cz);
  const l=Math.hypot(ux,uz)||1;
  g.jean.teleport(cx+ux/l*34, 0, cz+uz/l*34);          // 禁区(22m)外
  gu.x=cx+ux/l*28; gu.z=cz+uz/l*28; gu.suspect=0;      // 外围守卫，视线通畅
  g.poss.recall(); });
await p.waitForTimeout(1800);
// 让相机朝向守卫，并等相机矩阵更新
await p.evaluate(()=>{ const g=window.__game;
  const gu=g.guards.list.find(x=>!x.host);
  g.tpcam.yaw=Math.atan2(g.jean.pos.x-gu.x, g.jean.pos.z-gu.z); });
await p.waitForTimeout(400);
await key('e',40); await p.waitForTimeout(1000);
s=await S(); line('附身守卫', s);
if(s.host!=='守卫'){ console.log('  ⚠ 没锁到守卫，改为直接注入'); 
  await p.evaluate(()=>{ const g=window.__game; const gu=g.guards.list.find(x=>!x.host);
    g.poss.target={obj:gu,kind:'guard',x:gu.x,y:1.1,z:gu.z,d:3}; g.poss.hop(g.tpcam); });
  await p.waitForTimeout(1000); s=await S(); line('  注入后', s); }
await p.evaluate(()=>{ const g=window.__game; if(g.poss.host&&g.poss.host.isGuard){
  g.poss.host.x=g.mission.gate.x; g.poss.host.z=g.mission.gate.z; } });
await p.waitForTimeout(700);
s=await S(); line('走到 B 区闸口', s);
console.log('  日志:', await p.evaluate(()=>window.__game.mission.log.slice(0,2).map(l=>l.t).join(' | ')));
await p.screenshot({path:OUT+'n_gate.png'});

// 11) 回体通关
await key('x',60); await p.waitForTimeout(2500);
s=await S(); line('撤回本体→通关', s);
console.log('结局:', await p.evaluate(()=>({shown:document.getElementById('over').classList.contains('on'),
  t:document.getElementById('ovT').textContent})));
console.log('\n性能:', await p.evaluate(()=>document.getElementById('stats').textContent));
await b.close();
