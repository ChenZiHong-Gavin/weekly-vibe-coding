import { AudioUtils } from './AudioUtils';

// Simple sound effects using Web Audio API
class SoundManager {
  private ensureContext() {
    return AudioUtils.getContext();
  }
  
  playDon() {
    this.playDrumSound(120, 0.15, 'sine'); // Deep punchy sine
  }
  
  playKat() {
    this.playDrumSound(400, 0.08, 'square'); // Sharp square click
  }

  playBoom() {
    this.playDrumSound(60, 0.4, 'sine'); // Sub-bass heavy impact
    this.playNoise(0.2, 500); // Add some low-end rumble
  }

  playAir() {
    this.playTone(1200, 0.2, 'triangle'); // Shimmering air sound
    this.playTone(1800, 0.15, 'sine'); // Harmonious high tone
  }
  
  playPerfect() {
    this.playTone(880, 0.05, 'sine');
    setTimeout(() => this.playTone(1100, 0.05, 'sine'), 50);
  }
  
  playGood() {
    this.playTone(660, 0.05, 'sine');
  }
  
  playMiss() {
    this.playTone(200, 0.15, 'sawtooth');
  }
  
  private playDrumSound(frequency: number, duration: number, type: OscillatorType) {
    const ctx = this.ensureContext();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
    
    // Add noise for impact (adjusted frequency based on drum type)
    this.playNoise(duration * 0.4, frequency > 200 ? 2000 : 800);
  }

  private playNoise(duration: number, filterFreq: number = 1000) {
    const ctx = this.ensureContext();
    
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    noise.buffer = buffer;
    filter.type = filterFreq > 1000 ? 'highpass' : 'lowpass';
    filter.frequency.value = filterFreq;
    
    noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    noise.start();
    noise.stop(ctx.currentTime + duration);
  }
  
  private playTone(frequency: number, duration: number, type: OscillatorType) {
    const ctx = this.ensureContext();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

export const soundManager = new SoundManager();
