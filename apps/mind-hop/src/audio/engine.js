import * as S from './synth.js';

// ═══════════════════════════════════════════════════════════
//  音频引擎
//
//  · 四条总线（音效 / 环境 / 音乐 / 界面）→ 主总线 → 限幅 → 输出
//  · 音量设置写进 localStorage
//  · 定位声：自己算距离衰减 + 立体声摆位 + 遮挡低通
//    （不用 PannerNode —— 我们需要两个"耳朵"，见下）
//
//  ★ 双耳设计：附身在外时，玩家的耳朵在宿主身上，但**本体那边的声音
//    也必须听得见** —— 靴子正在靠近那具毫无防备的身体，这是最关键的情报。
//    所以每个声音同时按「相机」和「本体」算一次可听度，取更响的那个；
//    走本体耳朵的声音会过一层带通，听起来像隔着另一具身体传来的。
// ═══════════════════════════════════════════════════════════

const LS_KEY = 'phoenix.audio.v1';
const BUSES = ['sfx', 'amb', 'music', 'ui'];

const DEFAULTS = { master: 0.8, sfx: 1.0, amb: 0.7, music: 0.55, ui: 0.8, muted: false };

export class Audio {
  constructor() {
    this.ok = false;
    this.settings = { ...DEFAULTS, ...this.#load() };
    this.buffers = {};
    this.voices = [];
    this.loops = new Map();
    this.listener = { x: 0, y: 0, z: 0, fx: 0, fz: 1, rx: 1, rz: 0 };
    this.bodyEar = null;          // {x,z} 或 null
    this.occluder = null;         // (ax,az,bx,bz) => 0..1 遮挡量
    this.tension = 0;
    this._hbT = 0;
    this._warnT = 0;
  }

  #load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  }
  #save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.settings)); } catch {}
  }

  /** 必须由用户手势触发（浏览器自动播放策略） */
  async init() {
    if (this.ok) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC({ latencyHint: 'interactive' });
    if (this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch {} }

    const ctx = this.ctx;
    // 主总线 → 限幅 → 输出。限幅是必需的：几十个声音叠在一起会削波。
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.18;
    this.master = ctx.createGain();
    this.master.connect(this.limiter).connect(ctx.destination);

    this.bus = {};
    for (const b of BUSES) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.bus[b] = g;
    }
    this.#applyVolumes();

    // 合成所有 buffer
    const sr = ctx.sampleRate;
    const mk = (name, data) => {
      const b = ctx.createBuffer(1, data.length, sr);
      b.copyToChannel(data, 0);
      this.buffers[name] = b;
    };
    mk('step', S.footstep(sr, false));
    mk('boot', S.footstep(sr, true));
    mk('cloth', S.cloth(sr));
    mk('whoosh', S.whoosh(sr));
    mk('land', S.land(sr));
    mk('bounce', S.bounce(sr));
    mk('stumble', S.stumble(sr));
    mk('psiLoop', S.psiLoop(sr));
    mk('memFiller', S.memFiller(sr));
    mk('memClue', S.memClue(sr));
    mk('bark', S.bark(sr));
    mk('alarm', S.alarmLoop(sr));
    mk('gunshot', S.gunshot(sr));
    mk('murmur', S.crowdMurmur(sr));
    mk('air', S.cityAir(sr));
    mk('panic', S.panicSwell(sr));
    mk('heart', S.heartbeat(sr));
    mk('linkWarn', S.linkWarn(sr));
    mk('snapback', S.snapback(sr));
    mk('uiClick', S.uiClick(sr));
    mk('uiToggle', S.uiToggle(sr));
    mk('stStage', S.stinger(sr, 'stage'));
    mk('stWin', S.stinger(sr, 'win'));
    mk('stLose', S.stinger(sr, 'lose'));

    this.#buildMusic();
    this.ok = true;
    return true;
  }

  #applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    const m = s.muted ? 0 : s.master;
    this.master.gain.value = m;
    for (const b of BUSES) this.bus[b].gain.value = s[b];
  }

  set(key, v) {
    this.settings[key] = v;
    this.#applyVolumes();
    this.#save();
  }
  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.#applyVolumes(); this.#save();
    return this.settings.muted;
  }

  // ── 监听者 ──
  /**
   * @param cam    THREE.Camera
   * @param bodyEar {x,z}|null  附身在外时传本体位置，让本体那边的声音也能听见
   */
  setListener(cam, bodyEar) {
    const p = cam.position;
    this.listener.x = p.x; this.listener.y = p.y; this.listener.z = p.z;
    // 相机朝向（-Z 为前）
    const e = cam.matrixWorld.elements;
    this.listener.fx = -e[8]; this.listener.fz = -e[10];
    this.listener.rx = e[0];  this.listener.rz = e[2];
    this.bodyEar = bodyEar;
  }

  /** 距离/方位 → 增益与摆位。返回 null 表示完全听不见 */
  #place(x, z, ref, maxD) {
    const L = this.listener;
    let dx = x - L.x, dz = z - L.z;
    let d = Math.hypot(dx, dz);
    let gain = d < maxD ? Math.pow(1 - d / maxD, 1.7) : 0;
    let pan = d > 0.2 ? Math.max(-1, Math.min(1, (dx * L.rx + dz * L.rz) / d)) : 0;
    let viaBody = false;

    // 本体那只"耳朵"
    if (this.bodyEar) {
      const bx = x - this.bodyEar.x, bz = z - this.bodyEar.z;
      const bd = Math.hypot(bx, bz);
      const bg = bd < maxD ? Math.pow(1 - bd / maxD, 1.7) * 0.85 : 0;
      if (bg > gain) { gain = bg; pan *= 0.35; viaBody = true; d = bd; }
    }
    if (gain < 0.006) return null;

    // 遮挡：隔着建筑的声音变闷
    let occl = 0;
    if (this.occluder) {
      const ex = viaBody ? this.bodyEar.x : L.x;
      const ez = viaBody ? this.bodyEar.z : L.z;
      occl = this.occluder(ex, ez, x, z);
    }
    return { gain, pan, occl, viaBody, dist: d };
  }

  #voice() {
    const ctx = this.ctx;
    if (this.voices.length) return this.voices.pop();
    const src = null;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    const pan = ctx.createStereoPanner();
    const gain = ctx.createGain();
    filt.connect(pan).connect(gain);
    return { filt, pan, gain, busy: false };
  }
  #recycle(v) {
    try { v.gain.disconnect(); } catch {}
    v.busy = false;
    if (this.voices.length < 32) this.voices.push(v);
  }

  /**
   * 播放一个定位声。
   * @param opts.rate  播放速率（音高变化）
   * @param opts.vol   基础音量
   * @param opts.maxD  可听半径
   * @param opts.bus   总线
   */
  at(name, x, z, opts = {}) {
    if (!this.ok || this.settings.muted) return;
    const buf = this.buffers[name];
    if (!buf) return;
    const maxD = opts.maxD ?? 34;
    const P = this.#place(x, z, opts.ref, maxD);
    if (!P) return;

    const ctx = this.ctx;
    const v = this.#voice();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    // 遮挡越重、距离越远，高频丢得越多
    const cut = 20000 * Math.pow(1 - P.occl * 0.92, 2.4) * (1 - Math.min(P.dist / maxD, 1) * 0.45);
    v.filt.frequency.value = Math.max(320, Math.min(20000, P.viaBody ? Math.min(cut, 2600) : cut));
    v.pan.pan.value = P.pan;
    v.gain.gain.value = (opts.vol ?? 1) * P.gain * (P.viaBody ? 0.9 : 1);
    v.gain.connect(this.bus[opts.bus || 'sfx']);
    src.connect(v.filt);
    src.onended = () => { try { src.disconnect(); } catch {} this.#recycle(v); };
    src.start();
    return v;
  }

  /** 无定位（界面 / 全局提示） */
  play(name, opts = {}) {
    if (!this.ok || this.settings.muted) return;
    const buf = this.buffers[name];
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    const g = this.ctx.createGain();
    g.gain.value = opts.vol ?? 1;
    src.connect(g).connect(this.bus[opts.bus || 'ui']);
    src.onended = () => { try { src.disconnect(); g.disconnect(); } catch {} };
    src.start();
  }

  // ── 循环层 ──
  loop(name, key, bus = 'amb') {
    if (!this.ok) return null;
    if (this.loops.has(key)) return this.loops.get(key);
    const buf = this.buffers[name];
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 20000;
    const pan = this.ctx.createStereoPanner();
    const g = this.ctx.createGain();
    g.gain.value = 0;
    src.connect(filt).connect(pan).connect(g).connect(this.bus[bus]);
    src.start();
    const L = { src, gain: g, filt, pan };
    this.loops.set(key, L);
    return L;
  }
  /** 循环层的音量走斜坡，避免咔哒 */
  setLoop(key, vol, ramp = 0.25) {
    const L = this.loops.get(key);
    if (!L) return;
    const t = this.ctx.currentTime;
    L.gain.gain.cancelScheduledValues(t);
    L.gain.gain.setTargetAtTime(Math.max(0, vol), t, ramp);
  }
  setLoopTone(key, cutoff) {
    const L = this.loops.get(key);
    if (!L) return;
    L.filt.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.3);
  }

  // ── 音乐：三层缓慢漂移的持续音 ──
  #buildMusic() {
    const ctx = this.ctx;
    this.mus = { layers: [], out: ctx.createGain() };
    this.mus.out.gain.value = 0;
    this.mus.out.connect(this.bus.music);
    // 小调三音 + 一层高频微光
    const spec = [
      { f: 55.0, type: 'sine', g: 0.5 },
      { f: 82.4, type: 'sine', g: 0.34 },
      { f: 130.8, type: 'triangle', g: 0.14 },
      { f: 415.3, type: 'sine', g: 0.05 },
    ];
    for (const s of spec) {
      const osc = ctx.createOscillator();
      osc.type = s.type; osc.frequency.value = s.f;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lfoG = ctx.createGain();
      lfoG.gain.value = s.g * 0.45;
      const g = ctx.createGain();
      g.gain.value = s.g * 0.55;
      lfo.connect(lfoG).connect(g.gain);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 900;
      osc.connect(filt).connect(g).connect(this.mus.out);
      osc.start(); lfo.start();
      this.mus.layers.push({ osc, g, filt });
    }
  }
  setMusic(vol, brightness = 900) {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    this.mus.out.gain.setTargetAtTime(vol, t, 1.2);
    for (const l of this.mus.layers) l.filt.frequency.setTargetAtTime(brightness, t, 1.5);
  }

  /** 紧张度驱动的心跳 —— 暴露度越高越快 */
  updateTension(dt, tension) {
    if (!this.ok) return;
    this.tension = tension;
    if (tension < 0.35) { this._hbT = 0; return; }
    const period = 1.15 - (tension - 0.35) * 0.9;      // 越紧张越快
    this._hbT -= dt;
    if (this._hbT <= 0) {
      this._hbT = Math.max(0.42, period);
      this.play('heart', { vol: 0.28 + tension * 0.5, bus: 'sfx',
                           rate: 0.94 + tension * 0.22 });
    }
  }

  /** 链条快断的告警脉冲 */
  linkWarning(dt, on) {
    if (!this.ok) return;
    if (!on) { this._warnT = 0; return; }
    this._warnT -= dt;
    if (this._warnT <= 0) { this._warnT = 0.75; this.play('linkWarn', { vol: 0.5, bus: 'sfx' }); }
  }
}
