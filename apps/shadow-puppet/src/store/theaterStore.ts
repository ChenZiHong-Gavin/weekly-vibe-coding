import { create } from 'zustand';
import { PuppetState, TheaterMode, RecordedFrame, GestureResult, PoseLandmark, StageEffect } from '@/types/puppet';

interface TheaterStore {
  mode: TheaterMode;
  setMode: (mode: TheaterMode) => void;

  selectedSceneId: string;
  setSelectedSceneId: (id: string) => void;

  puppetStates: PuppetState[];
  setPuppetStates: (states: PuppetState[]) => void;
  updatePuppetState: (index: number, state: PuppetState) => void;
  addPuppet: (state: PuppetState) => void;
  removePuppet: (index: number) => void;

  activePuppetIndex: number;
  setActivePuppetIndex: (index: number) => void;

  isShadowMode: boolean;
  toggleShadowMode: () => void;

  isRecording: boolean;
  recordedFrames: RecordedFrame[];
  startRecording: () => void;
  stopRecording: () => void;
  addRecordedFrame: (frame: RecordedFrame) => void;
  clearRecording: () => void;

  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;

  currentStoryId: string | null;
  setCurrentStoryId: (id: string | null) => void;

  storyActIndex: number;
  setStoryActIndex: (i: number) => void;

  showGestureGuide: boolean;
  setShowGestureGuide: (v: boolean) => void;

  gestures: GestureResult[];
  setGestures: (g: GestureResult[]) => void;

  poseLandmarks: PoseLandmark[];
  setPoseLandmarks: (lm: PoseLandmark[]) => void;

  cameraReady: boolean;
  setCameraReady: (v: boolean) => void;
  cameraFailed: boolean;
  setCameraFailed: (v: boolean) => void;

  bgmEnabled: boolean;
  toggleBGM: () => void;

  sfxEnabled: boolean;
  toggleSFX: () => void;

  effects: StageEffect[];
  triggerEffect: (effect: StageEffect) => void;
  clearEffects: () => void;
}

export const useTheaterStore = create<TheaterStore>((set, get) => ({
  mode: 'free',
  setMode: (mode) => set({ mode }),

  selectedSceneId: 'mountain',
  setSelectedSceneId: (id) => set({ selectedSceneId: id }),

  puppetStates: [],
  setPuppetStates: (states) => set({ puppetStates: states }),
  updatePuppetState: (index, state) => set((s) => {
    const next = [...s.puppetStates];
    next[index] = state;
    return { puppetStates: next };
  }),
  addPuppet: (state) => set((s) => ({ puppetStates: [...s.puppetStates, state] })),
  removePuppet: (index) => set((s) => ({
    puppetStates: s.puppetStates.filter((_, i) => i !== index),
    activePuppetIndex: Math.max(0, s.activePuppetIndex - (index <= s.activePuppetIndex ? 1 : 0)),
  })),

  activePuppetIndex: 0,
  setActivePuppetIndex: (index) => set({ activePuppetIndex: index }),

  isShadowMode: true,
  toggleShadowMode: () => set((s) => ({ isShadowMode: !s.isShadowMode })),

  isRecording: false,
  recordedFrames: [],
  startRecording: () => set({ isRecording: true, recordedFrames: [] }),
  stopRecording: () => set({ isRecording: false }),
  addRecordedFrame: (frame) => set((s) => ({ recordedFrames: [...s.recordedFrames, frame] })),
  clearRecording: () => set({ recordedFrames: [] }),

  isPlaying: false,
  setIsPlaying: (v) => set({ isPlaying: v }),

  currentStoryId: null,
  setCurrentStoryId: (id) => set({ currentStoryId: id }),

  storyActIndex: 0,
  setStoryActIndex: (i) => set({ storyActIndex: i }),

  showGestureGuide: true,
  setShowGestureGuide: (v) => set({ showGestureGuide: v }),

  gestures: [],
  setGestures: (g) => set({ gestures: g }),

  poseLandmarks: [],
  setPoseLandmarks: (lm) => set({ poseLandmarks: lm }),

  cameraReady: false,
  setCameraReady: (v) => set({ cameraReady: v }),
  cameraFailed: false,
  setCameraFailed: (v) => set({ cameraFailed: v }),

  bgmEnabled: false,
  toggleBGM: () => set((s) => ({ bgmEnabled: !s.bgmEnabled })),

  sfxEnabled: true,
  toggleSFX: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),

  effects: [],
  triggerEffect: (effect) => set((s) => ({ effects: [...s.effects, effect] })),
  clearEffects: () => set({ effects: [] }),
}));
