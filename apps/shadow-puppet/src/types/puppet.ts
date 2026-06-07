export interface JointDef {
  id: string;
  name: string;
  x: number;
  y: number;
  parentId: string | null;
  angle: number;
  length: number;
  minAngle: number;
  maxAngle: number;
  damping: number;
}

export interface ImagePart {
  id: string;
  jointId: string;
  crop: { x: number; y: number; w: number; h: number };
  pivot?: { x: number; y: number };
  zIndex: number;
}

export interface PuppetDef {
  id: string;
  name: string;
  description: string;
  joints: JointDef[];
  drawCommands: DrawCommand[];
  width: number;
  height: number;
  color: string;
  imagePath?: string;
  imageParts?: ImagePart[];
}

export interface DrawCommand {
  type: 'path' | 'circle' | 'ellipse';
  jointId: string;
  path?: string;
  radius?: number;
  rx?: number;
  ry?: number;
  offsetX?: number;
  offsetY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface JointState {
  id: string;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  velocity: number;
}

export interface PuppetState {
  puppetId: string;
  x: number;
  y: number;
  scale: number;
  joints: Record<string, JointState>;
  isGrabbed: boolean;
  grabbedJointId: string | null;
  opacity: number;
  idleTime: number;
  /** velocity for momentum-based body movement */
  vx: number;
  vy: number;
}

export interface SceneDef {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  elements: SceneElement[];
  ambientColor: string;
}

export interface SceneElement {
  type: 'mountain' | 'cloud' | 'tree' | 'building' | 'moon' | 'bridge' | 'wave' | 'pagoda' | 'flag';
  x: number;
  y: number;
  scale: number;
  opacity: number;
  path?: string;
}

export interface StoryDef {
  id: string;
  name: string;
  description: string;
  sceneId: string;
  puppetIds: string[];
  acts: StoryAct[];
}

export interface StoryAct {
  subtitle: string;
  duration: number;
  actions: StoryAction[];
}

export interface StoryAction {
  puppetIndex: number;
  type: 'move' | 'pose' | 'enter' | 'exit';
  targetX?: number;
  targetY?: number;
  jointAngles?: Record<string, number>;
  delay: number;
  duration: number;
}

export interface HandData {
  landmarks: { x: number; y: number; z: number }[];
  handedness: 'Left' | 'Right';
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface GestureResult {
  type: 'point' | 'pinch' | 'wave' | 'fist' | 'open' | 'none';
  hand: 'left' | 'right';
  position: { x: number; y: number };
  confidence: number;
  fingerTips: { x: number; y: number }[];
  wristPosition?: { x: number; y: number };
  palmAngle?: number;
  /** 0=curled, 1=fully extended per finger: thumb/index/middle/ring/pinky */
  fingerCurls: Record<string, number>;
  /** wrist rotation angles in degrees */
  wristAngle: { yaw: number; roll: number };
  /** palm position delta since last frame (px), EMA-smoothed */
  palmDelta: { x: number; y: number };
}

export type TheaterMode = 'menu' | 'free' | 'story';

export interface RecordedFrame {
  timestamp: number;
  puppets: PuppetState[];
}

export interface StageEffect {
  id: string;
  type: 'burst' | 'smoke' | 'petals';
  x: number;
  y: number;
  startTime: number;
}
