// ============================
// Sound Engine — Web Audio API 合成音效
// ============================
// 不加载外部音频文件，全部用 Web Audio API 实时合成。

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** 播放一个短促的音调 */
function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** 播放噪音（用于错误音效） */
function playNoise(duration: number, volume: number = 0.08) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// ---- 公开的音效 API ----

export const Sound = {
  /** 有效移动（轻柔 tick） */
  move() {
    playTone(800, 0.05, 'sine', 0.06);
  },

  /** 到达目标（清脆 ding） */
  hit() {
    playTone(880, 0.1, 'sine', 0.15);
    setTimeout(() => playTone(1320, 0.15, 'sine', 0.12), 50);
  },

  /** 连击 */
  combo(comboCount: number) {
    const baseFreq = 600 + comboCount * 100;
    playTone(baseFreq, 0.08, 'triangle', 0.12);
    setTimeout(() => playTone(baseFreq * 1.5, 0.1, 'triangle', 0.10), 40);
  },

  /** PERFECT */
  perfect() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, 'sine', 0.12), i * 80);
    });
  },

  /** 错误/撞墙 */
  error() {
    playNoise(0.1, 0.06);
    playTone(200, 0.1, 'sawtooth', 0.05);
  },

  /** 关卡完成 */
  levelComplete() {
    const melody = [523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.12), i * 100);
    });
  },

  /** 进入新模式 */
  modeChange() {
    playTone(440, 0.06, 'triangle', 0.08);
  },

  /** 按钮点击 */
  click() {
    playTone(600, 0.03, 'sine', 0.05);
  },

  /** 倒计时警告 */
  warning() {
    playTone(300, 0.15, 'square', 0.06);
  },

  /** ON FIRE! */
  onFire() {
    playTone(440, 0.05, 'sawtooth', 0.1);
    setTimeout(() => playTone(660, 0.05, 'sawtooth', 0.1), 50);
    setTimeout(() => playTone(880, 0.08, 'sawtooth', 0.12), 100);
  },
};
