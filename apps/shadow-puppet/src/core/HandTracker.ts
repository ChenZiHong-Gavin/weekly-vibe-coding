import { HandData } from '@/types/puppet';

type HandsResultCallback = (hands: HandData[]) => void;

export class HandTracker {
  private hands: any = null;
  private camera: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private onResults: HandsResultCallback | null = null;
  private running = false;

  async init(videoElement: HTMLVideoElement, onResults: HandsResultCallback): Promise<boolean> {
    this.videoElement = videoElement;
    this.onResults = onResults;

    try {
      // These packages are IIFE scripts that assign to window.Hands / window.Camera.
      // Rollup may not detect the global→ESM export conversion, so use window globals.
      await import('@mediapipe/hands');
      await import('@mediapipe/camera_utils');
      const Hands = (window as any).Hands;
      const Camera = (window as any).Camera;

      this.hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });

      this.hands.onResults((results: any) => {
        if (!this.onResults || !this.running) return;
        const handDataList: HandData[] = [];
        if (results.multiHandLandmarks && results.multiHandedness) {
          for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const rawLabel = results.multiHandedness[i]?.label;
            // MediaPipe reports mirrored labels for selfie camera
            // "Left" label means user's right hand, "Right" means user's left hand
            const handedness = rawLabel === 'Left' ? 'Right' : 'Left';
            handDataList.push({ landmarks, handedness });
          }
        }
        this.onResults(handDataList);
      });

      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.hands && this.running) {
            try {
              await this.hands.send({ image: videoElement });
            } catch (e) {
              // Ignore transient frame errors
            }
          }
        },
        width: 640,
        height: 480,
      });

      return true;
    } catch (e) {
      console.error('HandTracker init failed:', e);
      return false;
    }
  }

  async start(): Promise<void> {
    this.running = true;
    if (this.camera) {
      await this.camera.start();
    }
  }

  stop(): void {
    this.running = false;
    if (this.camera) {
      try {
        this.camera.stop();
      } catch (_) {}
    }
  }

  destroy(): void {
    this.stop();
    if (this.hands) {
      try { this.hands.close(); } catch (_) {}
      this.hands = null;
    }
    this.camera = null;
    this.onResults = null;
  }
}
