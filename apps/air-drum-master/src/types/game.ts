export type NoteType = 'don' | 'kat' | 'boom' | 'air';

export type Judgment = 'perfect' | 'good' | 'miss';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type GameState = 'menu' | 'song-select' | 'calibration' | 'countdown' | 'playing' | 'paused' | 'results';

export interface Note {
  id: string;
  type: NoteType;
  time: number; // timestamp in ms when note should be hit
  hit?: boolean;
  judgment?: Judgment;
}

export interface BeatMap {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  difficulty: Difficulty;
  notes: Note[];
  audioUrl?: string;
}

export interface GameScore {
  perfect: number;
  good: number;
  miss: number;
  combo: number;
  maxCombo: number;
  score: number;
  accuracy: number;
}

export interface HandGesture {
  hand: 'left' | 'right';
  isHitting: boolean;
  velocity: number;
  position: { x: number; y: number; z: number };
  isOpen: boolean;
  confidence: number;
}

export interface GameConfig {
  perfectWindow: number; // ±ms
  goodWindow: number; // ±ms
  noteSpeed: number; // pixels per second
  hitCooldown: number; // ms between hits
  confidenceThreshold: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  perfectWindow: 150, // Increased from 100
  goodWindow: 300,    // Increased from 200
  noteSpeed: 150,     // Reduced from 200
  hitCooldown: 100,   // Reduced from 120
  confidenceThreshold: 0.5,
};

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}
