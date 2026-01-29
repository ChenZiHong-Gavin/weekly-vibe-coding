import type { HandGesture } from '@/types/game';

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface HandHistory {
  positions: { x: number; y: number; z: number; time: number }[];
  lastHitTime: number;
}

export class GestureDetector {
  private hands: any = null;
  private camera: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private onGestureCallback: ((left: HandGesture | null, right: HandGesture | null) => void) | null = null;
  
  private leftHandHistory: HandHistory = { positions: [], lastHitTime: 0 };
  private rightHandHistory: HandHistory = { positions: [], lastHitTime: 0 };
  
  private readonly VELOCITY_THRESHOLD = 0.05;
  private readonly HIT_COOLDOWN = 120; // ms
  private readonly HISTORY_LENGTH = 5;
  
  async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onGesture: (left: HandGesture | null, right: HandGesture | null) => void
  ): Promise<void> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.onGestureCallback = onGesture;
    
    // Dynamically import MediaPipe
    const { Hands } = await import('@mediapipe/hands');
    const { Camera } = await import('@mediapipe/camera_utils');
    
    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
    
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });
    
    this.hands.onResults(this.onResults.bind(this));
    
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.hands && this.videoElement) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480,
    });
    
    await this.camera.start();
  }
  
  private onResults(results: any): void {
    if (!this.canvasElement || !this.onGestureCallback) return;
    
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;
    
    // Clear and draw video frame
    ctx.save();
    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // Mirror the canvas
    ctx.scale(-1, 1);
    ctx.translate(-this.canvasElement.width, 0);
    
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    
    ctx.restore();
    
    let leftGesture: HandGesture | null = null;
    let rightGesture: HandGesture | null = null;
    
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks: HandLandmark[] = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];
        
        // Note: handedness is from camera's perspective, so we flip it
        const isLeftHand = handedness.label === 'Right'; // Mirrored!
        
        const gesture = this.analyzeGesture(landmarks, isLeftHand);
        
        if (isLeftHand) {
          leftGesture = gesture;
        } else {
          rightGesture = gesture;
        }
        
        // Draw hand landmarks
        this.drawHand(ctx, landmarks, isLeftHand);
      }
    }
    
    this.onGestureCallback(leftGesture, rightGesture);
  }
  
  private analyzeGesture(landmarks: HandLandmark[], isLeftHand: boolean): HandGesture {
    const wrist = landmarks[0];
    const now = Date.now();
    
    const history = isLeftHand ? this.leftHandHistory : this.rightHandHistory;
    
    // Add current position to history
    history.positions.push({
      x: wrist.x,
      y: wrist.y,
      z: wrist.z,
      time: now,
    });
    
    // Keep only recent positions
    while (history.positions.length > this.HISTORY_LENGTH) {
      history.positions.shift();
    }
    
    // Calculate velocity (forward movement in z-axis and downward in y-axis)
    let velocity = 0;
    if (history.positions.length >= 2) {
      const prev = history.positions[0];
      const curr = history.positions[history.positions.length - 1];
      const timeDelta = (curr.time - prev.time) / 1000; // seconds
      
      if (timeDelta > 0) {
        // Detect forward punch motion (z decreases, y might decrease)
        const zVelocity = (prev.z - curr.z) / timeDelta;
        const yVelocity = (prev.y - curr.y) / timeDelta;
        // Also consider x-velocity for side hits
        const xVelocity = Math.abs(prev.x - curr.x) / timeDelta;
        
        // Increased y-velocity weight for downward strikes, added x-velocity
        velocity = Math.max(zVelocity, yVelocity * 0.8, xVelocity * 0.5);
      }
    }
    
    // Check if fingers are extended (open hand = Kat)
    const isOpen = this.isHandOpen(landmarks);
    
    // Determine if this is a hit
    const timeSinceLastHit = now - history.lastHitTime;
    const isHitting = velocity > this.VELOCITY_THRESHOLD && timeSinceLastHit > this.HIT_COOLDOWN;
    
    if (isHitting) {
      history.lastHitTime = now;
    }
    
    return {
      hand: isLeftHand ? 'left' : 'right',
      isHitting,
      velocity,
      position: { x: wrist.x, y: wrist.y, z: wrist.z },
      isOpen,
      confidence: 1,
    };
  }
  
  private isHandOpen(landmarks: HandLandmark[]): boolean {
    // Check if fingers are extended by comparing fingertip y to knuckle y
    const fingerTips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
    const fingerKnuckles = [5, 9, 13, 17]; // Corresponding knuckles
    
    let extendedCount = 0;
    for (let i = 0; i < fingerTips.length; i++) {
      const tip = landmarks[fingerTips[i]];
      const knuckle = landmarks[fingerKnuckles[i]];
      
      // Finger is extended if tip is above (lower y value) or significantly forward of knuckle
      if (tip.y < knuckle.y || tip.z < knuckle.z - 0.03) {
        extendedCount++;
      }
    }
    
    // Hand is open if at least 3 fingers are extended
    return extendedCount >= 3;
  }
  
  private drawHand(ctx: CanvasRenderingContext2D, landmarks: HandLandmark[], isLeftHand: boolean): void {
    const width = this.canvasElement!.width;
    const height = this.canvasElement!.height;
    
    const color = isLeftHand ? 'hsl(220, 85%, 60%)' : 'hsl(15, 95%, 60%)';
    
    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm
    ];
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo((1 - p1.x) * width, p1.y * height);
      ctx.lineTo((1 - p2.x) * width, p2.y * height);
      ctx.stroke();
    }
    
    // Draw landmarks
    ctx.fillStyle = color;
    for (const landmark of landmarks) {
      ctx.beginPath();
      ctx.arc((1 - landmark.x) * width, landmark.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  
  stop(): void {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.hands) {
      this.hands.close();
    }
  }
}

export const gestureDetector = new GestureDetector();
