import { create } from 'zustand';
import { GestureResult, TheaterMode, StageEffect } from '@/types/hand-shadow';

interface TheaterStore {
  mode: TheaterMode;
  setMode: (mode: TheaterMode) => void;

  selectedSceneId: string;
  setSelectedSceneId: (id: string) => void;

  showGestureGuide: boolean;
  setShowGestureGuide: (v: boolean) => void;

  gestures: GestureResult[];
  setGestures: (g: GestureResult[]) => void;

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

  detectedPose: string | null;
  setDetectedPose: (pose: string | null) => void;
}

export const useTheaterStore = create<TheaterStore>((set) => ({
  mode: 'free',
  setMode: (mode) => set({ mode }),

  selectedSceneId: 'cave',
  setSelectedSceneId: (id) => set({ selectedSceneId: id }),

  showGestureGuide: true,
  setShowGestureGuide: (v) => set({ showGestureGuide: v }),

  gestures: [],
  setGestures: (g) => set({ gestures: g }),

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

  detectedPose: null,
  setDetectedPose: (pose) => set({ detectedPose: pose }),
}));
