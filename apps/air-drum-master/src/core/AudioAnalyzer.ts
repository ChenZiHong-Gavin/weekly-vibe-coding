import type { BeatMap, Note, NoteType, Difficulty } from '@/types/game';
import { AudioUtils } from './AudioUtils';

export class AudioAnalyzer {
  private audioBuffer: AudioBuffer | null = null;
  
  async loadAudio(file: File): Promise<AudioBuffer> {
    const ctx = AudioUtils.getContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  async loadAudioFromUrl(url: string): Promise<AudioBuffer> {
    const ctx = AudioUtils.getContext();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }
  
  detectBPM(audioBuffer: AudioBuffer): number {
    // Simplified BPM detection using peak analysis
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Downsample for analysis
    const downsampleFactor = 4;
    const downsampledData: number[] = [];
    
    for (let i = 0; i < channelData.length; i += downsampleFactor) {
      let sum = 0;
      for (let j = 0; j < downsampleFactor && i + j < channelData.length; j++) {
        sum += Math.abs(channelData[i + j]);
      }
      downsampledData.push(sum / downsampleFactor);
    }
    
    // Find peaks
    const threshold = 0.3;
    const peaks: number[] = [];
    const minPeakDistance = Math.floor(sampleRate / downsampleFactor * 0.2); // 200ms minimum
    
    for (let i = 1; i < downsampledData.length - 1; i++) {
      if (downsampledData[i] > threshold &&
          downsampledData[i] > downsampledData[i - 1] &&
          downsampledData[i] > downsampledData[i + 1]) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
          peaks.push(i);
        }
      }
    }
    
    // Calculate average interval
    if (peaks.length < 2) return 120; // Default BPM
    
    let totalInterval = 0;
    let validIntervals = 0;
    for (let i = 1; i < peaks.length; i++) {
      const interval = peaks[i] - peaks[i - 1];
      if (interval > 0) {
        totalInterval += interval;
        validIntervals++;
      }
    }
    
    if (validIntervals === 0) return 120;
    
    const avgInterval = totalInterval / validIntervals;
    const intervalInSeconds = (avgInterval * downsampleFactor) / sampleRate;
    
    if (intervalInSeconds <= 0) return 120;
    
    const bpm = Math.round(60 / intervalInSeconds);
    
    // Clamp to reasonable BPM range
    return Math.max(60, Math.min(200, bpm));
  }
  
  generateBeatMap(
    audioBuffer: AudioBuffer,
    title: string,
    artist: string,
    difficulty: Difficulty
  ): BeatMap {
    const bpm = this.detectBPM(audioBuffer);
    const duration = audioBuffer.duration * 1000; // Convert to ms
    const beatInterval = 60000 / (bpm || 120); // ms per beat
    
    console.log(`Generating BeatMap: ${title}, BPM: ${bpm}, Duration: ${duration}ms`);
    
    const notes: Note[] = [];
    const difficultyMultiplier = {
      easy: 0.35,  // Approx one note every 3 beats
      normal: 0.7, // Approx one note every 1.5 beats
      hard: 1.1,   // Approx one note per beat
    };
    
    // Analyze audio for note placement
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // First pass: Calculate average energy to set a relative threshold
    let totalEnergy = 0;
    let energySamples = 0;
    const step = Math.floor(sampleRate * 0.5); // Sample every 0.5s
    for (let i = 0; i < channelData.length; i += step) {
      let sampleEnergy = 0;
      const window = Math.min(1000, channelData.length - i);
      if (window > 0) {
        for (let j = 0; j < window; j++) {
          sampleEnergy += Math.abs(channelData[i + j]);
        }
        totalEnergy += sampleEnergy / window;
        energySamples++;
      }
    }
    const avgEnergy = energySamples > 0 ? totalEnergy / energySamples : 0;
    // Slightly raised threshold (from 0.4 to 0.55)
    const relativeThreshold = Math.max(0.03, avgEnergy * 0.55);
    
    console.log(`Average Energy: ${avgEnergy.toFixed(4)}, Relative Threshold: ${relativeThreshold.toFixed(4)}`);
    
    // Generate notes based on beats
    let noteId = 0;
    const notesPerBeat = difficultyMultiplier[difficulty] || 0.7;
    const noteInterval = beatInterval / notesPerBeat;
    
    // Start after 2 seconds, end 1 second before end
    const startTime = 2000;
    const endTime = duration - 1000;
    
    if (endTime > startTime) {
      for (let time = startTime; time < endTime; time += noteInterval) {
        // Determine note type based on position and audio analysis
        const sampleIndex = Math.floor((time / 1000) * sampleRate);
        const windowSize = Math.floor(sampleRate * 0.1); // 100ms window for better averaging
        
        let energy = 0;
        if (sampleIndex < channelData.length) {
          const actualWindow = Math.min(windowSize, channelData.length - sampleIndex);
          if (actualWindow > 0) {
            for (let i = 0; i < actualWindow; i++) {
              energy += Math.abs(channelData[sampleIndex + i]);
            }
            energy /= actualWindow;
          }
        }
        
        // Slightly increased random skip (from 0.1 to 0.15)
        if (energy < relativeThreshold || Math.random() < 0.15) continue;
        
        // Determine note type
        let noteType: NoteType;
        const beatPosition = (time - startTime) / beatInterval;
        
        // Adjust ratios: Don/Kat are primary (85%), Boom/Air are accents (15%)
        const rand = Math.random();
        if (rand < 0.07) {
          noteType = 'boom';
        } else if (rand < 0.15) {
          noteType = 'air';
        } else {
          // Alternate between don and kat based on pattern
          const patternIndex = Math.floor(beatPosition * 2) % 4;
          noteType = patternIndex < 2 ? 'don' : 'kat';
        }
        
        notes.push({
          id: `note-${noteId++}`,
          type: noteType,
          time: time,
        });
      }
    }

    // Fallback: If still no notes generated (very quiet track), generate based on rhythm
    if (notes.length === 0) {
      console.log('No notes generated by analysis, using fallback rhythm generator');
      const patterns: NoteType[][] = [
        ['don', 'kat', 'don', 'kat'],
        ['don', 'don', 'kat', 'kat'],
        ['boom', 'don', 'air', 'kat'],
      ];
      let patternIndex = 0;
      for (let time = startTime; time < endTime; time += beatInterval * 2) {
        if (Math.random() > notesPerBeat) continue;
        const pattern = patterns[patternIndex % patterns.length];
        notes.push({
          id: `note-fb-${noteId++}`,
          type: pattern[Math.floor(Math.random() * pattern.length)],
          time: time,
        });
        patternIndex++;
      }
    }
    
    console.log(`Generated ${notes.length} notes`);
    
    return {
      id: `beatmap-${Date.now()}`,
      title,
      artist,
      bpm,
      duration,
      difficulty,
      notes,
    };
  }
  
  createDemoBeatMap(difficulty: Difficulty): BeatMap {
    // Reduced BPM for easier gameplay
    const bpm = 80;
    const duration = 60000; // 1 minute
    const beatInterval = 60000 / bpm;
    
    const notes: Note[] = [];
    let noteId = 0;
    
    const patterns: NoteType[][] = [
      ['don', 'kat', 'don', 'kat'],
      ['don', 'don', 'kat', 'kat'],
      ['don', 'kat', 'boom', 'don'],
      ['don', 'kat', 'air', 'kat'],
      ['don', 'don', 'don', 'don'],
      ['kat', 'kat', 'kat', 'kat'],
      ['boom', 'don', 'air', 'kat'],
    ];
    
    // Reduced density: Easy = 0.2, Normal = 0.4, Hard = 0.6
    const difficultyMultiplier = { easy: 0.2, normal: 0.4, hard: 0.6 };
    const notesPerBeat = difficultyMultiplier[difficulty];
    
    let patternIndex = 0;
    // Generate notes for almost the full duration (leave 4 beats buffer at start/end)
    const endBeat = (duration / beatInterval) - 4;
    
    for (let beat = 4; beat < endBeat; beat++) { 
      // Only add notes on some beats based on density
      if (Math.random() > notesPerBeat) continue;

      const pattern = patterns[patternIndex % patterns.length];
      const subIndex = Math.floor(Math.random() * pattern.length);
      
      notes.push({
        id: `note-${noteId++}`,
        type: pattern[subIndex],
        time: beat * beatInterval,
      });
      
      patternIndex++;
    }
    
    return {
      id: 'demo-beatmap',
      title: 'Demo Song',
      artist: 'Taiko Master',
      bpm,
      duration,
      difficulty,
      notes,
    };
  }
  
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export const audioAnalyzer = new AudioAnalyzer();
