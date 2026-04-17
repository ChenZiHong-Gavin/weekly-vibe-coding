/**
 * Sound effects using Web Audio API — no external files needed.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Resume AudioContext (must be called from a user gesture) */
export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

/** Short "tick" for normal comparison — subtle click */
export function playCompare() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = 600;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

/** "Safe" pass — gentle ascending ding */
export function playSafe() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

/** BEHEAD! — dramatic slash + thud */
export function playBehead() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // 1. Metallic slash — noise burst with bandpass
  const noiseLen = 0.2;
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 3000;
  bandpass.Q.value = 2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  noiseSrc.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(now);
  noiseSrc.stop(now + noiseLen);

  // 2. Low thud — the head dropping
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(150, now + 0.05);
  thud.frequency.exponentialRampToValueAtTime(40, now + 0.3);
  thudGain.gain.setValueAtTime(0.3, now + 0.05);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now + 0.05);
  thud.stop(now + 0.35);

  // 3. Quick descending tone — dramatic swoosh
  const swoosh = ctx.createOscillator();
  const swooshGain = ctx.createGain();
  swoosh.type = "sawtooth";
  swoosh.frequency.setValueAtTime(800, now);
  swoosh.frequency.exponentialRampToValueAtTime(100, now + 0.15);
  swooshGain.gain.setValueAtTime(0.12, now);
  swooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  swoosh.connect(swooshGain);
  swooshGain.connect(ctx.destination);
  swoosh.start(now);
  swoosh.stop(now + 0.15);
}

/** Sort complete — triumphant fanfare */
export function playComplete() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;

    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}
