// ── MediaPipe hand data ──
export interface HandData {
  landmarks: { x: number; y: number; z: number }[];
  handedness: 'Left' | 'Right';
}

// ── Interpreted gesture ──
export interface GestureResult {
  type: 'point' | 'pinch' | 'wave' | 'fist' | 'open' | 'none';
  hand: 'left' | 'right';
  position: { x: number; y: number };
  confidence: number;
  fingerTips: { x: number; y: number }[];
  wristPosition?: { x: number; y: number };
  palmAngle?: number;
  fingerCurls: Record<string, number>;
  wristAngle: { yaw: number; roll: number };
  palmDelta: { x: number; y: number };
}

// ── Hand pose classification ──
export interface HandPoseResult {
  pose: string;
  confidence: number;
  hand: 'left' | 'right';
}

// ── Stage background scene ──
export interface SceneDef {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  elements: SceneElement[];
  ambientColor: string;
}

export interface SceneElement {
  type: 'mountain' | 'cloud' | 'tree' | 'building' | 'moon' | 'bridge' | 'wave' | 'pagoda' | 'flag' | 'torch' | 'rock' | 'caveman';
  x: number;
  y: number;
  scale: number;
  opacity: number;
  path?: string;
}

// ── Visual effects ──
export interface StageEffect {
  id: string;
  type: 'burst' | 'smoke' | 'petals';
  x: number;
  y: number;
  startTime: number;
}

// ── Theater mode ──
export type TheaterMode = 'menu' | 'free';
