// ═══════════════════════════════════════════════════════════
//  音频设置面板（Tab 开关）
//  四条总线各自可调、可静音，设置持久化在 localStorage。
// ═══════════════════════════════════════════════════════════

const CSS = `
#aset{position:fixed;inset:0;display:none;place-items:center;z-index:40;
  background:rgba(5,6,10,.72);backdrop-filter:blur(7px);
  font-family:ui-sans-serif,-apple-system,"PingFang SC","Hiragino Sans GB",sans-serif}
#aset.on{display:grid}
#aset .box{width:440px;padding:26px 30px 24px;border-radius:15px;
  background:rgba(13,14,21,.94);border:1px solid rgba(160,170,200,.16);
  box-shadow:0 20px 60px rgba(0,0,0,.55);pointer-events:auto}
#aset h2{font-size:20px;font-weight:650;color:#f0e9dd;letter-spacing:.02em;margin-bottom:4px}
#aset .sub{font-size:12.5px;color:#8b95ad;margin-bottom:20px}
#aset .row{display:grid;grid-template-columns:76px 1fr 44px;align-items:center;
  gap:14px;margin-bottom:15px}
#aset .row label{font-size:14px;color:#cbd4e6}
#aset .row .v{font-size:13px;color:#98a2ba;text-align:right;font-variant-numeric:tabular-nums}
#aset input[type=range]{-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;
  background:rgba(255,255,255,.13);outline:none;cursor:pointer}
#aset input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;
  border-radius:50%;background:linear-gradient(180deg,#d9b0ff,#9a6ae8);cursor:pointer;
  box-shadow:0 1px 5px rgba(0,0,0,.5)}
#aset .mute{display:flex;align-items:center;gap:11px;margin:20px 0 4px;
  padding:11px 14px;border-radius:9px;background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.08);cursor:pointer;pointer-events:auto}
#aset .mute:hover{background:rgba(255,255,255,.08)}
#aset .mute .dot{width:11px;height:11px;border-radius:50%;background:#4ad48a;flex:none;
  box-shadow:0 0 9px rgba(74,212,138,.6)}
#aset .mute.off .dot{background:#e0645a;box-shadow:0 0 9px rgba(224,100,90,.6)}
#aset .mute span{font-size:13.5px;color:#cbd4e6}
#aset .hint{font-size:12px;color:#7d879e;margin-top:16px;line-height:1.75}
#aset .hint b{color:#a9b3c9}
#aset kbd{background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.17);
  border-bottom-width:2px;border-radius:5px;padding:1px 6px;font-size:11.5px;
  color:#e2e8f5;font-family:inherit;font-weight:600}
#ahint{position:fixed;left:26px;bottom:172px;z-index:11;font-size:12px;color:#7d879e;
  pointer-events:none;transition:opacity .6s;text-shadow:0 1px 3px rgba(0,0,0,.6)}
`;

const ROWS = [
  ['master', '总音量'],
  ['sfx', '音效'],
  ['amb', '环境'],
  ['music', '音乐'],
  ['ui', '界面'],
];

export class AudioSettings {
  constructor(audio) {
    this.audio = audio;
    const st = document.createElement('style'); st.textContent = CSS;
    document.head.appendChild(st);

    const d = document.createElement('div');
    d.id = 'aset';
    d.innerHTML = `<div class="box">
      <h2>音频</h2>
      <div class="sub">全部音效都是程序化合成的，没有外部音频文件。</div>
      ${ROWS.map(([k, n]) => `<div class="row">
        <label for="a_${k}">${n}</label>
        <input id="a_${k}" type="range" min="0" max="100" step="1">
        <span class="v" id="v_${k}">0%</span></div>`).join('')}
      <div class="mute" id="a_mute"><span class="dot"></span><span id="muteT">声音已开启</span></div>
      <div class="hint">
        <b>听觉是情报。</b> 靴子声比便鞋更重更闷 —— 你能靠声音分辨谁在靠近。<br>
        附身在外时，<b>本体附近的声音也听得见</b>，那一路会闷一些。<br>
        <kbd>Tab</kbd> 开关此面板 &nbsp; <kbd>M</kbd> 静音
      </div></div>`;
    document.body.appendChild(d);

    const h = document.createElement('div');
    h.id = 'ahint';
    h.innerHTML = '<kbd>Tab</kbd> 音频设置';
    document.body.appendChild(h);
    this.hintEl = h;
    this.hintT = 9;

    this.el = d;
    this.rows = {};
    for (const [k] of ROWS) {
      const input = d.querySelector('#a_' + k);
      const val = d.querySelector('#v_' + k);
      input.value = Math.round((audio.settings[k] ?? 0.8) * 100);
      val.textContent = input.value + '%';
      input.addEventListener('input', () => {
        val.textContent = input.value + '%';
        audio.set(k, +input.value / 100);
      });
      input.addEventListener('change', () => audio.play('uiClick', { vol: 0.5 }));
      this.rows[k] = { input, val };
    }
    this.muteEl = d.querySelector('#a_mute');
    this.muteT = d.querySelector('#muteT');
    this.muteEl.addEventListener('click', () => this.setMuted(audio.toggleMute()));
    this.setMuted(audio.settings.muted);
  }

  setMuted(m) {
    this.muteEl.classList.toggle('off', m);
    this.muteT.textContent = m ? '声音已静音' : '声音已开启';
  }

  get open() { return this.el.classList.contains('on'); }
  toggle() {
    const on = this.el.classList.toggle('on');
    this.audio.play('uiToggle', { vol: 0.55 });
    // 打开面板时把滑块同步到当前值（可能被 M 键改过）
    if (on) for (const [k] of ROWS) {
      const r = this.rows[k];
      r.input.value = Math.round((this.audio.settings[k] ?? 0) * 100);
      r.val.textContent = r.input.value + '%';
    }
    return on;
  }

  update(dt) {
    if (this.hintT > 0) {
      this.hintT -= dt;
      if (this.hintT <= 0) this.hintEl.style.opacity = '0';
    }
  }
}
