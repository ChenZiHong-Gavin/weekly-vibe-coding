// ═══════════════════════════════════════════════════════════
//  程序化音效合成
//
//  不依赖任何外部音频资产 —— 全部在初始化时算进 AudioBuffer。
//  和城市窗户、天空一样：一切都是生成的。
//  每个函数返回单声道 Float32Array 的采样，交给 engine 打包成 buffer。
// ═══════════════════════════════════════════════════════════

const TAU = Math.PI * 2;

// ── 基础工具 ──
const env = (t, dur, a = 0.005, r = 0.5) => {
  if (t < a) return t / a;
  const k = (t - a) / Math.max(dur - a, 1e-4);
  return Math.pow(1 - Math.min(k, 1), 1 / r);
};
const noise = () => Math.random() * 2 - 1;

/** 一阶低通，用来把白噪声塑造成"材质" */
function lowpass(buf, cutoff, sr) {
  const rc = 1 / (TAU * cutoff), dt = 1 / sr, a = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; }
  return buf;
}
function highpass(buf, cutoff, sr) {
  const rc = 1 / (TAU * cutoff), dt = 1 / sr, a = rc / (rc + dt);
  let prevIn = buf[0], prevOut = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    prevOut = a * (prevOut + x - prevIn);
    prevIn = x; buf[i] = prevOut;
  }
  return buf;
}

// ── 脚步 ──
// 鞋底拍地 = 一个很短的宽带瞬态 + 一点低频体感。
// 靴子（DODC）比便鞋更重、更闷、尾巴更长 —— 这是玩家分辨"谁在靠近"的依据。
export function footstep(sr, boot = false) {
  const dur = boot ? 0.17 : 0.10;
  const n = (sr * dur) | 0;
  const out = new Float32Array(n);
  const thumpF = boot ? 92 : 150;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const e = env(t, dur, 0.002, boot ? 0.32 : 0.5);
    out[i] = noise() * e * (boot ? 0.55 : 0.42)
           + Math.sin(TAU * thumpF * t) * Math.exp(-t * (boot ? 34 : 52)) * (boot ? 0.7 : 0.4);
  }
  lowpass(out, boot ? 1500 : 3400, sr);
  return out;
}

/** 布料摩擦 —— 走动时的次要层，让脚步不那么"点状" */
export function cloth(sr) {
  const dur = 0.22, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = noise() * env(t, dur, 0.03, 0.8) * 0.20;
  }
  highpass(lowpass(out, 5200, sr), 900, sr);
  return out;
}

// ── 附身 ──
/** 意识飞出去：上行扫频 + 噪声尾迹 */
export function whoosh(sr) {
  const dur = 0.52, n = (sr * dur) | 0, out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = t / dur;
    const f = 180 + Math.pow(k, 1.6) * 1500;
    ph += TAU * f / sr;
    const e = Math.sin(Math.PI * Math.min(k, 1));
    out[i] = (Math.sin(ph) * 0.35 + noise() * 0.5) * e * 0.6;
  }
  lowpass(out, 5000, sr);
  return out;
}

/** 落进一具身体：闷响 + 一层泛音"接通"感 */
export function land(sr) {
  const dur = 0.6, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const thud = Math.sin(TAU * 68 * t) * Math.exp(-t * 16) * 0.75;
    const ring = (Math.sin(TAU * 523 * t) + Math.sin(TAU * 784 * t) * 0.6)
                 * Math.exp(-t * 7) * 0.16;
    out[i] = thud + ring + noise() * Math.exp(-t * 40) * 0.2;
  }
  return out;
}

/** 被弹开（增强人类）：刺耳的反冲 */
export function bounce(sr) {
  const dur = 0.42, n = (sr * dur) | 0, out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = t / dur;
    const f = 1400 * (1 - k * 0.75);
    ph += TAU * f / sr;
    out[i] = (Math.sin(ph) * 0.5 + noise() * 0.45) * Math.exp(-t * 9) * 0.7;
  }
  highpass(out, 400, sr);
  return out;
}

/** 踉跄：两个不齐的落脚 */
export function stumble(sr) {
  const dur = 0.55, n = (sr * dur) | 0, out = new Float32Array(n);
  const hit = (at, amp) => {
    const s = (at * sr) | 0;
    for (let i = 0; i < sr * 0.16 && s + i < n; i++) {
      const t = i / sr;
      out[s + i] += (noise() * 0.5 + Math.sin(TAU * 110 * t) * 0.55)
                    * Math.exp(-t * 26) * amp;
    }
  };
  hit(0, 0.8); hit(0.19, 0.5); hit(0.34, 0.65);
  lowpass(out, 2200, sr);
  return out;
}

// ── 读取记忆 ──
/** 长按时的持续微光（可循环） */
export function psiLoop(sr) {
  const dur = 2.0, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const w = 0.5 + 0.5 * Math.sin(TAU * 0.35 * t);
    out[i] = (Math.sin(TAU * 311 * t) * 0.35 + Math.sin(TAU * 466 * t) * 0.22
            + Math.sin(TAU * 622.5 * t) * 0.12) * (0.35 + w * 0.4) * 0.5;
  }
  // 首尾交叉淡入淡出，循环无缝
  const f = (sr * 0.25) | 0;
  for (let i = 0; i < f; i++) {
    const g = i / f;
    out[i] *= g; out[n - 1 - i] *= g;
  }
  return out;
}

/** 读到普通人的心声：一个短的下行叹息 */
export function memFiller(sr) {
  const dur = 0.7, n = (sr * dur) | 0, out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = t / dur;
    ph += TAU * (420 - k * 130) / sr;
    out[i] = Math.sin(ph) * Math.exp(-t * 3.6) * 0.3;
  }
  return out;
}

/** 读到线索：明确的、上行的揭示音 */
export function memClue(sr) {
  const dur = 1.5, n = (sr * dur) | 0, out = new Float32Array(n);
  const notes = [329.6, 493.9, 659.3, 987.8];
  notes.forEach((f, k) => {
    const at = k * 0.11, s = (at * sr) | 0;
    for (let i = 0; s + i < n; i++) {
      const t = i / sr;
      out[s + i] += Math.sin(TAU * f * t) * Math.exp(-t * 3.2) * 0.20;
    }
  });
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] += Math.sin(TAU * 82.4 * t) * Math.exp(-t * 2.2) * 0.16;
  }
  return out;
}

// ── 守卫 ──
/** 喝止 —— 没有语音素材，用带通噪声做出一声"喊"的轮廓 */
export function bark(sr) {
  const dur = 0.42, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = t / dur;
    // 两段：短促起音 + 收尾，像 "Hey—!"
    const e = k < 0.18 ? k / 0.18 : Math.exp(-(k - 0.18) * 4.5);
    const f = 210 + Math.sin(k * 7) * 40 - k * 60;
    out[i] = (Math.sin(TAU * f * t) * 0.5 + noise() * 0.5) * e * 0.55;
  }
  lowpass(highpass(out, 260, sr), 2600, sr);
  return out;
}

/** 警报：两声一循环 */
export function alarmLoop(sr) {
  const dur = 1.6, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const seg = t % 0.8;
    const f = seg < 0.4 ? 620 : 460;
    const g = seg < 0.36 || (seg > 0.4 && seg < 0.76) ? 1 : 0;
    const soft = Math.min(1, Math.min(seg, 0.4 - (seg % 0.4)) * 40);
    out[i] = (Math.sin(TAU * f * t) * 0.5 + Math.sin(TAU * f * 2 * t) * 0.12)
             * g * soft * 0.42;
  }
  return out;
}

/** 枪响 */
export function gunshot(sr) {
  const dur = 0.75, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const crack = noise() * Math.exp(-t * 90) * 1.0;
    const body = Math.sin(TAU * 78 * t) * Math.exp(-t * 22) * 0.55;
    const tail = noise() * Math.exp(-t * 5.5) * 0.22;      // 街道回响
    out[i] = crack + body + tail;
  }
  return out;
}

// ── 环境 ──
/** 人群低语（可循环）—— 密度由播放增益控制 */
export function crowdMurmur(sr) {
  const dur = 4.0, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const m = 0.55 + 0.45 * Math.sin(TAU * 0.13 * t) * Math.sin(TAU * 0.31 * t + 1.1);
    out[i] = noise() * m;
  }
  lowpass(highpass(out, 240, sr), 1100, sr);
  for (let i = 0; i < n; i++) out[i] *= 0.5;
  const f = (sr * 0.5) | 0;
  for (let i = 0; i < f; i++) { const g = i / f; out[i] *= g; out[n - 1 - i] *= g; }
  return out;
}

/** 夜风 / 城市底噪（可循环） */
export function cityAir(sr) {
  const dur = 6.0, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = noise() * (0.6 + 0.4 * Math.sin(TAU * 0.07 * t + 0.6));
  }
  lowpass(out, 420, sr);
  for (let i = 0; i < n; i++) out[i] *= 0.6;
  const f = (sr * 0.8) | 0;
  for (let i = 0; i < f; i++) { const g = i / f; out[i] *= g; out[n - 1 - i] *= g; }
  return out;
}

/** 恐慌骤起 */
export function panicSwell(sr) {
  const dur = 1.4, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = t / dur;
    out[i] = noise() * Math.sin(Math.PI * k) * 0.5;
  }
  lowpass(highpass(out, 500, sr), 2600, sr);
  return out;
}

// ── 紧张度 ──
/** 心跳（两下） */
export function heartbeat(sr) {
  const dur = 1.0, n = (sr * dur) | 0, out = new Float32Array(n);
  const beat = (at, amp) => {
    const s = (at * sr) | 0;
    for (let i = 0; i < sr * 0.3 && s + i < n; i++) {
      const t = i / sr;
      out[s + i] += Math.sin(TAU * 48 * t) * Math.exp(-t * 13) * amp;
    }
  };
  beat(0, 0.85); beat(0.28, 0.55);
  return out;
}

/** 链条快断的告警脉冲 */
export function linkWarn(sr) {
  const dur = 0.5, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = (Math.sin(TAU * 146.8 * t) * 0.5 + Math.sin(TAU * 220 * t) * 0.25)
             * Math.exp(-t * 5) * 0.5;
  }
  return out;
}

/** 链条断裂 / 被弹回本体 */
export function snapback(sr) {
  const dur = 1.1, n = (sr * dur) | 0, out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = t / dur;
    ph += TAU * (900 * (1 - k) + 60) / sr;
    out[i] = (Math.sin(ph) * 0.45 + noise() * 0.35) * Math.exp(-t * 3.4) * 0.7;
  }
  lowpass(out, 3000, sr);
  return out;
}

// ── UI ──
export function uiClick(sr) {
  const dur = 0.09, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = Math.sin(TAU * 1100 * t) * Math.exp(-t * 60) * 0.3;
  }
  return out;
}

export function uiToggle(sr) {
  const dur = 0.2, n = (sr * dur) | 0, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = (Math.sin(TAU * 660 * t) + Math.sin(TAU * 880 * t) * 0.5)
             * Math.exp(-t * 18) * 0.22;
  }
  return out;
}

/** 阶段推进 / 通关 / 失败的乐句 */
export function stinger(sr, kind) {
  const dur = kind === 'lose' ? 3.2 : 2.6;
  const n = (sr * dur) | 0, out = new Float32Array(n);
  const chords = {
    stage: [220, 277.2, 329.6],
    win:   [174.6, 261.6, 329.6, 392],
    lose:  [110, 138.6, 164.8],
  }[kind] || [220, 330];
  chords.forEach((f, k) => {
    const s = ((kind === 'lose' ? k * 0.28 : k * 0.14) * sr) | 0;
    for (let i = 0; s + i < n; i++) {
      const t = i / sr;
      const vib = 1 + Math.sin(TAU * 4.5 * t) * 0.004;
      out[s + i] += Math.sin(TAU * f * vib * t) * Math.exp(-t * (kind === 'lose' ? 0.9 : 1.4)) * 0.16;
    }
  });
  return out;
}
