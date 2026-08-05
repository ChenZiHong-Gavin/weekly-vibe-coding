import { chromium } from 'playwright-core';
// 无头环境听不到声音，所以断言的是「音频图是否正确搭起来、事件是否真的触发了播放」：
// 在 AudioContext 上打桩计数 createBufferSource，并检查总线增益、持久化、面板。
const b = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
const errs=[];
p.on('pageerror', e=>errs.push('PAGEERROR: '+e.message));
p.on('console', m=>{ if(m.type()==='error'&&!m.text().includes('404')) errs.push(m.text()); });
await p.goto('http://localhost:5178/');
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});

// 打桩：统计每次 buffer 播放
await p.evaluate(()=>{
  window.__snd = { plays: 0, byLen: {} };
  const AC = window.AudioContext.prototype;
  const orig = AC.createBufferSource;
  AC.createBufferSource = function(...a){
    const src = orig.apply(this, a);
    const st = src.start.bind(src);
    src.start = function(...b){ window.__snd.plays++; return st(...b); };
    return src;
  };
});
await p.evaluate(()=>{ window.__game.Input.locked=true; });
// 触发音频初始化（需要手势）
await p.mouse.click(640, 360);
await p.waitForTimeout(1200);

const A = () => p.evaluate(()=>{
  const a = window.__game.audio;
  return a ? { ok:a.ok, state:a.ctx?.state, buffers:Object.keys(a.buffers).length,
    loops:[...a.loops.keys()], master:+a.master.gain.value.toFixed(2),
    bus:Object.fromEntries(Object.entries(a.bus).map(([k,v])=>[k,+v.gain.value.toFixed(2)])),
    settings:a.settings, plays:window.__snd.plays } : null;
});
const fails=[];
const chk=(n,ok,d='')=>{ console.log(`${ok?'✓':'✗'} ${n}${d?'  — '+d:''}`); if(!ok) fails.push(n); };

let a = await A();
if (!a || !a.ok) { console.log('引擎未启动，后续断言无意义'); }
chk('音频引擎启动', !!a && a.ok, a ? `state=${a.state}` : 'null');
chk('AudioContext 已 running', a?.state === 'running', a?.state);
chk('全部音效已合成', a?.buffers >= 24, a?.buffers + ' 个 buffer');
chk('循环层已建立', !!a && ['air','murmur','psi','alarm'].every(k=>a.loops.includes(k)), a?.loops?.join(','));
chk('四条总线接好', !!a && Object.keys(a.bus).length === 4, JSON.stringify(a?.bus));

// 事件音：附身
let p0 = (await A()).plays;
await p.keyboard.press('e');
await p.waitForTimeout(1600);
let p1 = (await A()).plays;
chk('附身触发播放', p1 > p0, `${p0} → ${p1}`);

// 走动 → 脚步
p0 = p1;
await p.keyboard.down('w'); await p.keyboard.down(' ');
await p.waitForTimeout(2500);
await p.keyboard.up('w'); await p.keyboard.up(' ');
p1 = (await A()).plays;
chk('走动产生脚步声', p1 - p0 > 8, `新增 ${p1-p0} 次`);

// 左键喊叫
p0 = p1;
await p.evaluate(()=>{ window.__game.Input.mousePressed[0]=true; });
await p.waitForTimeout(700);
p1 = (await A()).plays;
chk('喊叫触发播放', p1 > p0, `新增 ${p1-p0}`);

// 读记忆循环层增益
await p.evaluate(()=>{ window.__game.Input.keys['f']=true; });
await p.waitForTimeout(900);
const psiOn = await p.evaluate(()=>+window.__game.audio.loops.get('psi').gain.gain.value.toFixed(3));
await p.evaluate(()=>{ window.__game.Input.keys['f']=false; });
await p.waitForTimeout(900);
const psiOff = await p.evaluate(()=>+window.__game.audio.loops.get('psi').gain.gain.value.toFixed(3));
chk('读记忆时念力层淡入/淡出', psiOn > 0.1 && psiOff < psiOn * 0.5, `${psiOn} → ${psiOff}`);

// 环境层跟人群密度
const murmur = await p.evaluate(()=>+window.__game.audio.loops.get('murmur').gain.gain.value.toFixed(3));
chk('人群低语有音量', murmur > 0.02, 'gain=' + murmur);

// 音量设置 + 持久化
await p.evaluate(()=>{ window.__game.audio.set('sfx', 0.33); });
a = await A();
chk('设置音量生效', Math.abs(a.bus.sfx - 0.33) < 0.02, 'sfx=' + a.bus.sfx);
const stored = await p.evaluate(()=>JSON.parse(localStorage.getItem('phoenix.audio.v1')||'{}'));
chk('设置写入 localStorage', Math.abs((stored.sfx??0) - 0.33) < 0.02, JSON.stringify(stored));

// 静音
await p.evaluate(()=>{ window.__game.audio.toggleMute(); });
a = await A();
chk('静音把主总线归零', a.master === 0, 'master=' + a.master);
await p.evaluate(()=>{ window.__game.audio.toggleMute(); });
a = await A();
chk('取消静音恢复', a.master > 0, 'master=' + a.master);

// 面板
await p.keyboard.press('Tab'); await p.waitForTimeout(400);
const open = await p.evaluate(()=>document.getElementById('aset').classList.contains('on'));
chk('Tab 打开音频面板', open);
await p.keyboard.press('Tab'); await p.waitForTimeout(300);
const closed = await p.evaluate(()=>!document.getElementById('aset').classList.contains('on'));
chk('Tab 关闭面板', closed);
await p.screenshot({ path:'/private/tmp/claude-502/-Users-meshy1/9e6ab3b8-a251-46c2-8796-d94bd9eac97d/scratchpad/a_panel.png' });

// 重载后设置保留
await p.evaluate(()=>{ window.__game.audio.set('music', 0.21); });
await p.reload();
await p.waitForFunction(()=>!!window.__game,null,{timeout:45000});
await p.mouse.click(640,360); await p.waitForTimeout(900);
const kept = await p.evaluate(()=>+window.__game.audio.settings.music.toFixed(2));
chk('重载后设置保留', Math.abs(kept - 0.21) < 0.02, 'music=' + kept);

chk('无 JS 异常', errs.length === 0, errs.slice(0,2).join(' | '));
console.log(fails.length ? `\n✗ ${fails.length} 项失败: ${fails.join(', ')}` : '\n✓ 全部通过');
await b.close();
process.exit(fails.length?1:0);
