import { create } from 'zustand';
import type { GameState, GameScore, BeatMap, Note, Difficulty, HandGesture } from '@/types/game';
import { DEFAULT_CONFIG } from '@/types/game';

interface GameStore {
  // Game state
  gameState: GameState;
  setGameState: (state: GameState) => void;
  
  // Current song/beatmap
  currentBeatMap: BeatMap | null;
  setCurrentBeatMap: (beatMap: BeatMap | null) => void;
  
  // Active notes on screen
  activeNotes: Note[];
  setActiveNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  
  // Score
  score: GameScore;
  resetScore: () => void;
  addPerfect: () => void;
  addGood: () => void;
  addMiss: () => void;
  
  // Combo
  combo: number;
  maxCombo: number;
  incrementCombo: () => void;
  resetCombo: () => void;
  
  // Game time
  gameTime: number;
  setGameTime: (time: number) => void;
  
  // Selected difficulty
  difficulty: Difficulty;
  setDifficulty: (diff: Difficulty) => void;
  
  // Hand gestures
  leftHand: HandGesture | null;
  rightHand: HandGesture | null;
  setLeftHand: (gesture: HandGesture | null) => void;
  setRightHand: (gesture: HandGesture | null) => void;
  
  // Hit feedback
  lastHit: { type: 'don' | 'kat'; judgment: 'perfect' | 'good'; time: number } | null;
  setLastHit: (hit: { type: 'don' | 'kat'; judgment: 'perfect' | 'good'; time: number } | null) => void;
  
  // Audio
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  
  // Calibration offset
  calibrationOffset: number;
  setCalibrationOffset: (offset: number) => void;
  
  // Config
  config: typeof DEFAULT_CONFIG;
}

const initialScore: GameScore = {
  perfect: 0,
  good: 0,
  miss: 0,
  combo: 0,
  maxCombo: 0,
  score: 0,
  accuracy: 100,
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'menu',
  setGameState: (state) => set({ gameState: state }),
  
  currentBeatMap: null,
  setCurrentBeatMap: (beatMap) => set({ currentBeatMap: beatMap }),
  
  activeNotes: [],
  setActiveNotes: (notes) => set({ activeNotes: notes }),
  addNote: (note) => set((state) => ({ activeNotes: [...state.activeNotes, note] })),
  removeNote: (id) => set((state) => ({ 
    activeNotes: state.activeNotes.filter(n => n.id !== id) 
  })),
  updateNote: (id, updates) => set((state) => ({
    activeNotes: state.activeNotes.map(n => n.id === id ? { ...n, ...updates } : n)
  })),
  
  score: { ...initialScore },
  resetScore: () => set({ score: { ...initialScore }, combo: 0, maxCombo: 0, gameTime: 0 }),
  
  addPerfect: () => set((state) => {
    const perfectHits = state.score.perfect + 1;
    const goodHits = state.score.good;
    const missCount = state.score.miss;
    const totalProcessed = perfectHits + goodHits + missCount;
    const accuracy = totalProcessed > 0 ? ((perfectHits * 100 + goodHits * 50) / totalProcessed) : 100;
    
    const points = 1000;
    const newScore = state.score.score + points * (1 + Math.floor(state.combo / 10) * 0.1);
    const newCombo = state.combo + 1;
    
    return {
      score: {
        ...state.score,
        perfect: perfectHits,
        score: Math.floor(newScore),
        accuracy: accuracy,
        combo: newCombo,
        maxCombo: Math.max(state.score.maxCombo, newCombo),
      },
      combo: newCombo,
      maxCombo: Math.max(state.maxCombo, newCombo),
    };
  }),
  
  addGood: () => set((state) => {
    const perfectHits = state.score.perfect;
    const goodHits = state.score.good + 1;
    const missCount = state.score.miss;
    const totalProcessed = perfectHits + goodHits + missCount;
    const accuracy = totalProcessed > 0 ? ((perfectHits * 100 + goodHits * 50) / totalProcessed) : 100;
    
    const points = 500;
    const newScore = state.score.score + points * (1 + Math.floor(state.combo / 10) * 0.1);
    const newCombo = state.combo + 1;
    
    return {
      score: {
        ...state.score,
        good: goodHits,
        score: Math.floor(newScore),
        accuracy: accuracy,
        combo: newCombo,
        maxCombo: Math.max(state.score.maxCombo, newCombo),
      },
      combo: newCombo,
      maxCombo: Math.max(state.maxCombo, newCombo),
    };
  }),
  
  addMiss: () => set((state) => {
    const perfectHits = state.score.perfect;
    const goodHits = state.score.good;
    const missCount = state.score.miss + 1;
    const totalProcessed = perfectHits + goodHits + missCount;
    const accuracy = totalProcessed > 0 ? ((perfectHits * 100 + goodHits * 50) / totalProcessed) : 0;
    
    return {
      score: {
        ...state.score,
        miss: missCount,
        accuracy: Math.max(0, accuracy),
        combo: 0,
      },
      combo: 0,
    };
  }),
  
  combo: 0,
  maxCombo: 0,
  incrementCombo: () => set((state) => ({ 
    combo: state.combo + 1,
    maxCombo: Math.max(state.maxCombo, state.combo + 1)
  })),
  resetCombo: () => set({ combo: 0 }),
  
  gameTime: 0,
  setGameTime: (time) => set({ gameTime: time }),
  
  difficulty: 'normal',
  setDifficulty: (diff) => set({ difficulty: diff }),
  
  leftHand: null,
  rightHand: null,
  setLeftHand: (gesture) => set({ leftHand: gesture }),
  setRightHand: (gesture) => set({ rightHand: gesture }),
  
  lastHit: null,
  setLastHit: (hit) => set({ lastHit: hit }),
  
  audioFile: null,
  setAudioFile: (file) => set({ audioFile: file }),
  
  calibrationOffset: 0,
  setCalibrationOffset: (offset) => set({ calibrationOffset: offset }),
  
  config: DEFAULT_CONFIG,
}));
