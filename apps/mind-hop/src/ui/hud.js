// ═══════════════════════════════════════════════════════════
//  HUD
//
//  两套操作逻辑 —— 本体和宿主能做的事不同，所以控制面板是**上下文相关**的：
//  只列当前这具身体能做的事，切换时整块换掉。玩家不用记哪个键在什么时候有用。
// ═══════════════════════════════════════════════════════════

const CSS = `
#hud{position:fixed;inset:0;pointer-events:none;z-index:10;
  font-family:ui-sans-serif,-apple-system,"PingFang SC","Hiragino Sans GB",sans-serif;
  color:#e9eefa;-webkit-font-smoothing:antialiased;user-select:none;
  text-shadow:0 1px 3px rgba(0,0,0,.55)}
#hud .panel{background:rgba(10,11,17,.62);border:1px solid rgba(155,165,195,.13);
  border-radius:11px;backdrop-filter:blur(9px)}
#hud .lbl{font-size:11px;letter-spacing:.16em;color:#96a0b8;text-transform:uppercase}

/* ── 准星 ── */
#ret{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;
  transition:transform .12s cubic-bezier(.2,1.4,.4,1)}
#ret .dot{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;
  border-radius:50%;background:rgba(235,240,252,.9)}
#ret .ring{position:absolute;inset:0;border:1.5px solid rgba(190,150,250,0);border-radius:50%;
  transition:border-color .1s,transform .12s}
#ret .brk{position:absolute;width:10px;height:10px;border:2.5px solid rgba(190,150,250,0);
  transition:border-color .1s,transform .12s}
#ret .brk.tl{left:1px;top:1px;border-right:0;border-bottom:0}
#ret .brk.tr{right:1px;top:1px;border-left:0;border-bottom:0}
#ret .brk.bl{left:1px;bottom:1px;border-right:0;border-top:0}
#ret .brk.br{right:1px;bottom:1px;border-left:0;border-top:0}
#ret.lock .ring{border-color:rgba(178,138,246,.5);transform:scale(.7)}
#ret.lock .brk{border-color:rgba(202,164,255,.98);transform:scale(.8)}
#ret.know .brk{border-color:rgba(255,196,96,1)}
/* 目标在守卫视野里：跳过去会被看到。红框 + 眼睛数 —— 这是玩家决定
   "先制造骚乱还是直接跳"的唯一依据，必须在准星上，不能埋在侧栏里。 */
#ret.watched .brk{border-color:rgba(255,104,104,1);transform:scale(1)}
#ret.watched .ring{border-color:rgba(255,104,104,.55);transform:scale(.95)}
#eyes{position:absolute;left:50%;top:50%;margin:34px 0 0 -60px;width:120px;text-align:center;
  font-size:14px;font-weight:700;letter-spacing:.06em;color:#ff8a8a;opacity:0;
  text-shadow:0 1px 6px rgba(0,0,0,.85);transition:opacity .12s}
#eyes.on{opacity:1}
#ret.guard .brk{border-color:rgba(118,230,212,1)}

/* ── 左上：控制（随身份变化）── */
#ctrl{position:absolute;left:26px;top:24px;padding:15px 17px 14px;min-width:290px}
#ctrl .who{display:flex;align-items:center;gap:9px;margin-bottom:12px}
#ctrl .tag{padding:5px 13px;border-radius:15px;font-weight:650;font-size:13px;letter-spacing:.03em;
  background:rgba(255,150,80,.17);border:1px solid rgba(255,150,80,.45);color:#ffc79a}
#ctrl .tag.host{background:rgba(163,113,242,.17);border-color:rgba(175,125,252,.5);color:#cfaef2}
#ctrl .tag.fly{background:rgba(120,225,212,.15);border-color:rgba(120,225,212,.4);color:#8fe4d6}
#ctrl .note{font-size:12px;color:#8c96ae;line-height:1.5;flex:1}
#ctrl .note b{color:#c3ccdf;font-weight:600}
#ctrl ul{list-style:none;display:grid;gap:7px}
#ctrl li{display:flex;align-items:baseline;gap:10px;font-size:13.5px;color:#c9d2e4;line-height:1.35}
#ctrl li.dim{opacity:.38}
#ctrl li s{text-decoration:none;font-size:11.5px;color:#7f899f}
kbd{display:inline-block;min-width:22px;text-align:center;
  background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.17);
  border-bottom-width:2px;border-radius:5px;padding:2px 7px;
  font-size:12px;font-weight:600;color:#e2e8f5;font-family:inherit;flex:none}

/* ── 右上：任务 ── */
#obj{position:absolute;right:26px;top:24px;text-align:right;max-width:390px;padding:14px 17px}
#obj .h{font-size:10px;letter-spacing:.26em;color:#8d97b0;text-transform:uppercase}
#obj .m{font-size:19px;font-weight:650;margin-top:6px;color:#f4e9d6;letter-spacing:.01em}
#obj .s{font-size:13px;color:#9aa4bc;margin-top:5px;line-height:1.6}

/* ── 记忆日志 ── */
#log{position:absolute;right:26px;top:148px;max-width:400px;text-align:right;
  display:flex;flex-direction:column;align-items:flex-end;gap:8px}
#log div{font-size:14px;line-height:1.72;color:#d3c6ae;padding:9px 14px;border-radius:10px;
  background:rgba(11,10,16,.66);backdrop-filter:blur(8px);
  border-right:3px solid rgba(255,172,88,.6);text-align:left;max-width:100%}

/* ── 左下：状态 ── */
#vitals{position:absolute;left:26px;bottom:26px;width:270px;padding:14px 17px 12px}
#vitals .row{margin-bottom:12px}
#vitals .row:last-child{margin-bottom:0}
#vitals .top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
#vitals .n{font-size:13px;color:#aeb8cd;font-variant-numeric:tabular-nums;font-weight:600}
#vitals .bar{height:9px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
#vitals .bar i{display:block;height:100%;width:100%;transition:width .09s linear}
#linkF{background:linear-gradient(90deg,#6c3ad0,#c98aff)}
#expoF{background:linear-gradient(90deg,#8a3a34,#e0645a)}
#suspF{background:linear-gradient(90deg,#8a6a22,#ffcc55)}

/* ── 右下：本体监视窗 ── */
#pip{position:absolute;right:26px;bottom:26px;border-radius:11px;
  border:1px solid rgba(255,150,80,.35);box-shadow:0 6px 26px rgba(0,0,0,.5);
  opacity:0;transition:opacity .3s,border-color .25s;overflow:hidden}
#pip.on{opacity:1}
#pip.steer{border-color:rgba(190,150,250,.75);
  box-shadow:0 0 18px rgba(160,110,240,.4),0 6px 26px rgba(0,0,0,.5)}
#pip.alarm{border-color:rgba(255,92,72,.95);
  box-shadow:0 0 22px rgba(255,80,60,.5),0 6px 26px rgba(0,0,0,.5)}
#pip .cap{position:absolute;left:0;right:0;top:0;padding:8px 13px;font-size:13px;letter-spacing:.18em;
  background:linear-gradient(180deg,rgba(8,8,13,.82),transparent);color:#ffc79a;font-weight:600}
#pip.alarm .cap{color:#ff9d8a}
#pip .warn{position:absolute;left:0;right:0;bottom:0;padding:8px 11px;font-size:12.5px;
  font-weight:600;color:#ffb2a2;background:linear-gradient(0deg,rgba(60,10,8,.88),transparent);
  opacity:0;transition:opacity .2s}
#pip.alarm .warn{opacity:1}

/* ── 中央提示 ── */
#echo{position:absolute;left:50%;top:14%;transform:translateX(-50%);text-align:center;
  opacity:0;transition:opacity .3s}
#echo .r{width:180px;height:3px;border-radius:2px;margin:0 auto;
  background:linear-gradient(90deg,transparent,#ffc06a,transparent)}
#echo .t{font-size:12px;letter-spacing:.3em;color:#e8b473;margin-top:8px;font-weight:600}
#read{position:absolute;left:50%;top:59%;transform:translateX(-50%);opacity:0;
  transition:opacity .18s;text-align:center}
#read .b{width:200px;height:4px;background:rgba(255,255,255,.14);border-radius:2px;overflow:hidden}
#read .b i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7b4ad1,#ffb063)}
#read .t{font-size:12px;letter-spacing:.26em;color:#c3b0ea;margin-top:8px;font-weight:600}
#center{position:absolute;left:50%;top:70%;transform:translateX(-50%);text-align:center;
  font-size:16px;font-weight:550;color:#eef2fb;opacity:0;transition:opacity .25s;letter-spacing:.04em;
  background:rgba(9,10,16,.68);padding:11px 24px;border-radius:24px;backdrop-filter:blur(8px);
  border:1px solid rgba(155,165,195,.14);white-space:nowrap}
#center.on{opacity:1}
#center .k{color:#ffbe93;font-weight:700}
#center .bad{color:#ff8a8a;font-weight:700}

/* ── 世界标记 ── */
#marks{position:absolute;inset:0}
.mk{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;transition:opacity .2s}
.mk i{position:absolute;inset:0;border:2px solid rgba(255,255,255,.8);border-radius:50%}
.mk b{position:absolute;top:29px;left:50%;transform:translateX(-50%);font-size:11.5px;
  white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}
.mk.body i{border-color:rgba(255,152,82,.98);border-radius:4px;transform:rotate(45deg);
  box-shadow:0 0 12px rgba(255,140,70,.5)}
.mk.body b{color:rgba(255,186,138,.98)}
.mk.goal i{border-color:rgba(118,230,212,.98);box-shadow:0 0 12px rgba(90,220,200,.45)}
.mk.goal b{color:rgba(146,238,222,.98)}
.mk.echo i{border-color:rgba(255,196,96,.95);border-style:dashed;
  box-shadow:0 0 15px rgba(255,180,70,.55);animation:echoPulse 1.5s ease-in-out infinite}
.mk.echo b{color:rgba(255,208,132,1)}
@keyframes echoPulse{0%,100%{transform:scale(1);opacity:.78}50%{transform:scale(1.2);opacity:1}}

/* ── 全屏状态 ── */
#hurt{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .25s;
  background:radial-gradient(ellipse at center,transparent 40%,rgba(190,40,30,.55) 100%)}
#psi{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .3s;
  background:radial-gradient(ellipse at center,transparent 42%,rgba(120,70,220,.4) 100%)}

/* ── 结束 ── */
#over{position:absolute;inset:0;display:none;place-items:center;text-align:center;
  background:rgba(5,6,10,.9);backdrop-filter:blur(6px)}
#over.on{display:grid}
#over h1{font-size:38px;font-weight:650;letter-spacing:.04em;margin-bottom:18px}
#over p{color:#9aa4bc;font-size:15px;line-height:2.05;max-width:560px}
#over .k{color:#cfaef2;font-weight:600}
`;

// 两套操作逻辑：只列当前这具身体能做的事
const SCHEME = {
  body: {
    tag: '本体', cls: '',
    note: '身体和意识都在这里。<b>安全，但走不远。</b>',
    keys: [
      ['方向键', '走动 —— <b>你自己的身体一直由方向键操控</b>'],
      ['空格', '跑（长按）'],
      ['E', '把意识投射进锁定的人'],
      ['V', '切换第一/第三人称'],
      ['Tab', '音频设置 · <b>M</b> 静音'],
    ],
    dim: [['WASD', '现在没有附身的对象'], ['左键', '这具身体不做这种事'],
          ['F', '读不了自己的记忆']],
  },
  civ: {
    tag: '宿主 · 平民', cls: 'host',
    note: '你穿着一个路人。<b>本体正躺在别处。</b>',
    keys: [
      ['WASD', '走动（操控这具身体）'],
      ['空格', '跑（<b>很显眼</b>）'],
      ['E', '换到下一个人'],
      ['X', '撤回本体'],
      ['左键', '喊叫 —— 把守卫引到这里（换别处清场）'],
      ['F', '读取这个人的记忆（长按）'],
      ['方向键', '<b>挪动本体</b> —— 看着右下角监视窗操舵'],
      ['V', '切换第一/第三人称'],
    ],
    dim: [],
  },
  guard: {
    tag: '宿主 · DODC', cls: 'host',
    note: '你穿着一名守卫。<b>禁区对你开放。</b>',
    keys: [
      ['WASD', '走动（操控这具身体）'],
      ['空格', '跑（<b>很显眼</b>）'],
      ['E', '换到下一个人'],
      ['X', '撤回本体'],
      ['左键', '朝同僚开火'],
      ['F', '读取他的记忆（长按）'],
      ['方向键', '<b>挪动本体</b> —— 看着右下角监视窗操舵'],
      ['V', '切换第一/第三人称'],
    ],
    dim: [],
  },
  fly: {
    tag: '意识飞行', cls: 'fly',
    note: '意识正在两具身体之间穿过。',
    keys: [], dim: [],
  },
};

export class HUD {
  constructor(pip) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'hud';
    d.innerHTML = `
      <div id="psi"></div><div id="hurt"></div>
      <div id="ret"><div class="ring"></div>
        <div class="brk tl"></div><div class="brk tr"></div>
        <div class="brk bl"></div><div class="brk br"></div><div class="dot"></div></div>
      <div id="eyes"></div>
      <div id="echo"><div class="r"></div><div class="t">心灵回响</div></div>
      <div id="read"><div class="b"><i></i></div><div class="t">读取记忆</div></div>

      <div id="ctrl" class="panel">
        <div class="who"><span class="tag" id="cTag">本体</span>
          <span class="note" id="cNote"></span></div>
        <ul id="cList"></ul>
      </div>

      <div id="obj" class="panel"><div class="h">Objective</div>
        <div class="m" id="objM"></div><div class="s" id="objS"></div></div>
      <div id="log"></div>
      <div id="marks"></div>

      <div id="vitals" class="panel">
        <div class="row"><div class="top"><span class="lbl">链条稳定</span>
          <span class="n" id="linkN">100</span></div><div class="bar"><i id="linkF"></i></div></div>
        <div class="row"><div class="top"><span class="lbl">暴露</span>
          <span class="n" id="expoN">0</span></div><div class="bar"><i id="expoF"></i></div></div>
        <div class="row"><div class="top"><span class="lbl">被怀疑</span>
          <span class="n" id="suspN">0</span></div><div class="bar"><i id="suspF"></i></div></div>
      </div>

      <div id="pip">
        <div class="cap"><span id="pipT">本体</span></div>
        <div class="warn" id="pipW">有人在看你的身体</div>
      </div>

      <div id="center"></div>
      <div id="over"><div><h1 id="ovT"></h1><p id="ovB"></p></div></div>`;
    document.body.appendChild(d);

    const q = s => d.querySelector(s);
    this.el = {
      ret: q('#ret'), eyes: q('#eyes'), linkF: q('#linkF'), linkN: q('#linkN'),
      expoF: q('#expoF'), expoN: q('#expoN'), suspF: q('#suspF'), suspN: q('#suspN'),
      cTag: q('#cTag'), cNote: q('#cNote'), cList: q('#cList'),
      objM: q('#objM'), objS: q('#objS'), log: q('#log'),
      echo: q('#echo'), read: q('#read'), readF: q('#read .b i'),
      marks: q('#marks'), center: q('#center'), hurt: q('#hurt'), psi: q('#psi'),
      pip: q('#pip'), pipW: q('#pipW'), pipT: q('#pipT'),
      over: q('#over'), ovT: q('#ovT'), ovB: q('#ovB'),
    };
    // 监视窗尺寸必须和 WebGL 的 scissor 区域完全对齐
    this.el.pip.style.width = pip.w + 'px';
    this.el.pip.style.height = pip.h + 'px';
    this.el.pip.style.right = pip.margin + 'px';
    this.el.pip.style.bottom = pip.margin + 'px';

    this.mkPool = [];
    for (let i = 0; i < 8; i++) {
      const m = document.createElement('div');
      m.className = 'mk'; m.style.opacity = '0'; m.innerHTML = '<i></i><b></b>';
      this.el.marks.appendChild(m);
      this.mkPool.push({ el: m, b: m.querySelector('b') });
    }
    this.scheme = null;
    this.logCache = '';
  }

  #setScheme(key) {
    if (this.scheme === key) return;
    this.scheme = key;
    const s = SCHEME[key];
    this.el.cTag.textContent = s.tag;
    this.el.cTag.className = 'tag ' + s.cls;
    this.el.cNote.innerHTML = s.note;
    this.el.cList.innerHTML =
      s.keys.map(([k, t]) => `<li><kbd>${k}</kbd><span>${t}</span></li>`).join('') +
      s.dim.map(([k, t]) => `<li class="dim"><kbd>${k}</kbd><s>${t}</s></li>`).join('');
  }

  update(dt, s) {
    this.el.linkF.style.width = s.link + '%';
    this.el.linkN.textContent = Math.round(s.link);
    this.el.expoF.style.width = s.expo + '%';
    this.el.expoN.textContent = Math.round(s.expo);
    this.el.suspF.style.width = s.suspect + '%';
    this.el.suspN.textContent = Math.round(s.suspect);

    const watched = s.lockKind && s.lockWatched > 0;
    this.el.ret.className = s.lockKind
      ? ('lock ' + s.lockKind + (watched ? ' watched' : '')) : '';
    this.el.eyes.classList.toggle('on', !!watched);
    if (watched) this.el.eyes.textContent = `${s.lockWatched} 双眼睛看着`;
    this.#setScheme(s.scheme);

    this.el.objM.textContent = s.objMain;
    this.el.objS.textContent = s.objSub;
    if (s.logHtml !== this.logCache) { this.el.log.innerHTML = s.logHtml; this.logCache = s.logHtml; }

    this.el.echo.style.opacity = s.echo;
    this.el.read.style.opacity = s.readK > 0 ? 1 : 0;
    this.el.readF.style.width = (s.readK * 100) + '%';

    this.el.pip.classList.toggle('on', s.pipOn);
    this.el.pip.classList.toggle('alarm', s.pipOn && s.bodySpotted);
    this.el.pip.classList.toggle('steer', s.pipOn && s.steering && !s.bodySpotted);
    if (s.pipOn) {
      if (s.bodySpotted) {
        const d = s.bodyThreat;
        this.el.pipW.textContent = d < 2.5 ? '他们站在你身体旁边了'
          : d < 6 ? `有人正在走向你的身体 · ${d.toFixed(0)} m`
          : '有人在看你的身体';
      }
    }

    this.el.hurt.style.opacity = s.expo > 65 ? (s.expo - 65) / 35 * 0.7 : 0;
    this.el.psi.style.opacity = s.psiFx;

    if (s.center) { this.el.center.innerHTML = s.center; this.el.center.classList.add('on'); }
    else this.el.center.classList.remove('on');
  }

  setMarkers(list) {
    for (let i = 0; i < this.mkPool.length; i++) {
      const m = this.mkPool[i], d = list[i];
      if (!d) { m.el.style.opacity = '0'; continue; }
      m.el.style.opacity = d.alpha ?? 0.9;
      m.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
      m.el.className = 'mk ' + d.cls;
      m.b.textContent = d.label || '';
    }
  }

  finish(title, body) {
    this.el.ovT.textContent = title;
    this.el.ovB.innerHTML = body;
    this.el.over.classList.add('on');
  }
}
