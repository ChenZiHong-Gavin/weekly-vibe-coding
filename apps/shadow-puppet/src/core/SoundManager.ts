export class SoundManager {
  private audioCtx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmPlaying = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  init(): void {
    this.audioCtx = new AudioContext();
    this.bgmGain = this.audioCtx.createGain();
    this.bgmGain.gain.value = 0.3;
    this.bgmGain.connect(this.audioCtx.destination);

    this.sfxGain = this.audioCtx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.audioCtx.destination);
  }

  private ensureCtx(): void {
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playGong(): void {
    this.ensureCtx();
    if (!this.audioCtx || !this.sfxGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 1.5);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 2);

    const osc2 = this.audioCtx.createOscillator();
    const gain2 = this.audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(360, now);
    osc2.frequency.exponentialRampToValueAtTime(160, now + 1);
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 1.5);
  }

  playDrum(): void {
    this.ensureCtx();
    if (!this.audioCtx || !this.sfxGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playWoodblock(): void {
    this.ensureCtx();
    if (!this.audioCtx || !this.sfxGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playCymbal(): void {
    this.ensureCtx();
    if (!this.audioCtx || !this.sfxGain) return;

    const bufferSize = this.audioCtx.sampleRate * 0.3;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.audioCtx.sampleRate * 0.08));
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  startBGM(): void {
    this.ensureCtx();
    if (!this.audioCtx || !this.bgmGain || this.bgmPlaying) return;

    this.bgmPlaying = true;
    this.scheduleBGMMeasure();
    this.bgmTimer = setInterval(() => this.scheduleBGMMeasure(), 4000);
  }

  private scheduleBGMMeasure(): void {
    if (!this.audioCtx || !this.bgmGain || !this.bgmPlaying) return;

    // Clean up finished nodes from previous measure
    this.activeNodes = this.activeNodes.filter(({ osc }) => {
      try { osc.stop; return true; } catch { return false; }
    });

    const now = this.audioCtx.currentTime;
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    const measureDuration = 4;
    const noteDuration = 0.8;

    for (let i = 0; i < 8; i++) {
      const noteIdx = Math.floor(Math.random() * pentatonic.length);
      const freq = pentatonic[noteIdx];
      const startTime = now + i * (measureDuration / 8);

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(startTime);
      osc.stop(startTime + noteDuration);

      // Cleanup after note finishes
      const cleanupTime = (startTime + noteDuration - now) * 1000 + 50;
      setTimeout(() => {
        try { osc.stop(); } catch {}
        osc.disconnect();
        gain.disconnect();
      }, Math.max(cleanupTime, noteDuration * 1000 + 100));

      this.activeNodes.push({ osc, gain });
    }
  }

  stopBGM(): void {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    for (const { osc, gain } of this.activeNodes) {
      try { osc.stop(); } catch {}
      osc.disconnect();
      gain.disconnect();
    }
    this.activeNodes = [];
  }

  setBGMVolume(v: number): void {
    if (this.bgmGain) {
      this.bgmGain.gain.value = v;
    }
  }

  setSFXVolume(v: number): void {
    if (this.sfxGain) {
      this.sfxGain.gain.value = v;
    }
  }

  destroy(): void {
    this.stopBGM();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
