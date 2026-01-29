import type { Note, HandGesture, Judgment, GameConfig } from '@/types/game';
import { DEFAULT_CONFIG } from '@/types/game';
import { AudioUtils } from './AudioUtils';

export class GameEngine {
  private config: GameConfig;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  
  private onNoteHit: ((noteId: string, judgment: Judgment) => void) | null = null;
  private onNoteMiss: ((noteId: string) => void) | null = null;
  
  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
  }
  
  setCallbacks(
    onHit: (noteId: string, judgment: Judgment) => void,
    onMiss: (noteId: string) => void
  ): void {
    this.onNoteHit = onHit;
    this.onNoteMiss = onMiss;
  }
  
  setAudioBuffer(buffer: AudioBuffer): void {
    this.audioBuffer = buffer;
  }
  
  async loadAudio(file: File): Promise<void> {
    const ctx = AudioUtils.getContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  }

  async loadAudioFromUrl(url: string): Promise<void> {
    const ctx = AudioUtils.getContext();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  }
  
  start(): void {
    const ctx = AudioUtils.getContext();
    if (!this.audioBuffer) {
      console.warn('No audio loaded, starting without audio');
      this.startTime = performance.now();
      this.isPlaying = true;
      return;
    }
    
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(ctx.destination);
    this.sourceNode.start(0);
    
    this.startTime = performance.now();
    this.isPlaying = true;
  }
  
  pause(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
    }
    this.pauseTime = this.getCurrentTime();
    this.isPlaying = false;
  }
  
  resume(): void {
    const ctx = AudioUtils.getContext();
    if (!this.audioBuffer) {
      this.startTime = performance.now() - this.pauseTime;
      this.isPlaying = true;
      return;
    }
    
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(ctx.destination);
    this.sourceNode.start(0, this.pauseTime / 1000);
    
    this.startTime = performance.now() - this.pauseTime;
    this.isPlaying = true;
  }
  
  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
  }
  
  getCurrentTime(): number {
    if (!this.isPlaying) return this.pauseTime;
    return performance.now() - this.startTime;
  }
  
  isGamePlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Presence-based hit check:
   * - 'none' -> hits 'air'
   * - 'left_only' -> hits 'kat'
   * - 'right_only' -> hits 'don'
   * - 'both' -> hits 'boom'
   * Removes gesture motion dependency; relies purely on timing window (hit zone).
   */
  checkHitByPresence(
    notes: Note[],
    presence: 'none' | 'left_only' | 'right_only' | 'both',
    calibrationOffset: number = 0
  ): { noteId: string; judgment: 'perfect' | 'good' } | null {
    const currentTime = this.getCurrentTime() + calibrationOffset;
    
    let validTypes: Array<Note['type']>;
    switch (presence) {
      case 'none':
        validTypes = ['air'];
        break;
      case 'left_only':
        validTypes = ['kat'];
        break;
      case 'right_only':
        validTypes = ['don'];
        break;
      case 'both':
        validTypes = ['boom'];
        break;
    }
    
    let closestNote: Note | null = null;
    let closestDiff = Infinity;
    
    for (const note of notes) {
      if (note.hit) continue;
      if (!validTypes.includes(note.type)) continue;
      
      const timeDiff = Math.abs(note.time - currentTime);
      if (timeDiff <= this.config.goodWindow && timeDiff < closestDiff) {
        closestNote = note;
        closestDiff = timeDiff;
      }
    }
    
    if (!closestNote) return null;
    
    const judgment: 'perfect' | 'good' =
      closestDiff <= this.config.perfectWindow ? 'perfect' : 'good';
    
    return { noteId: closestNote.id, judgment };
  }
  
  checkMissedNotes(notes: Note[], calibrationOffset: number = 0): string[] {
    const currentTime = this.getCurrentTime() + calibrationOffset;
    const missedIds: string[] = [];
    
    for (const note of notes) {
      if (note.hit) continue;
      
      const timeDiff = currentTime - note.time;
      
      if (timeDiff > this.config.goodWindow) {
        missedIds.push(note.id);
      }
    }
    
    return missedIds;
  }
  
  getNotePosition(note: Note, calibrationOffset: number = 0): number {
    const currentTime = this.getCurrentTime() + calibrationOffset;
    const timeUntilHit = note.time - currentTime;
    
    // Position from 0 (at hit zone) to 1 (at spawn)
    // Increased travel time to make notes move slower
    const travelTime = 7000; 
    return Math.max(0, Math.min(1, timeUntilHit / travelTime));
  }
  
  reset(): void {
    this.stop();
  }
  
  getVisibleNotes(notes: Note[], calibrationOffset: number = 0): Note[] {
    const currentTime = this.getCurrentTime() + calibrationOffset;
    const lookAhead = 3000; // Show notes 3 seconds before they need to be hit
    const lookBehind = 500; // Keep notes visible briefly after miss window
    
    return notes.filter(note => {
      const timeDiff = note.time - currentTime;
      // Only filter by time - let the caller handle the hit check
      return timeDiff >= -lookBehind && timeDiff <= lookAhead;
    });
  }
}

export const gameEngine = new GameEngine();
