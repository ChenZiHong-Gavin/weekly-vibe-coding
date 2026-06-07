import { PoseLandmark } from '@/types/puppet';

type PoseResultCallback = (landmarks: PoseLandmark[]) => void;

export class PoseTracker {
  private pose: any = null;
  private camera: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private onResults: PoseResultCallback | null = null;
  private running = false;

  async init(videoElement: HTMLVideoElement, onResults: PoseResultCallback): Promise<boolean> {
    this.videoElement = videoElement;
    this.onResults = onResults;

    try {
      // These packages are IIFE scripts that assign to window globals.
      // Rollup may not detect the global→ESM export conversion, so use window globals.
      await import('@mediapipe/pose');
      await import('@mediapipe/camera_utils');
      const Pose = (window as any).Pose;
      const Camera = (window as any).Camera;

      this.pose = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
        },
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      this.pose.onResults((results: any) => {
        if (!this.onResults || !this.running) return;
        if (results.poseLandmarks) {
          const landmarks: PoseLandmark[] = results.poseLandmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility ?? 0,
          }));
          this.onResults(landmarks);
        }
      });

      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.pose && this.running) {
            try {
              await this.pose.send({ image: videoElement });
            } catch (_) {}
          }
        },
        width: 640,
        height: 480,
      });

      return true;
    } catch (e) {
      console.error('PoseTracker init failed:', e);
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
      try { this.camera.stop(); } catch (_) {}
    }
  }

  destroy(): void {
    this.stop();
    if (this.pose) {
      try { this.pose.close(); } catch (_) {}
      this.pose = null;
    }
    this.camera = null;
    this.onResults = null;
  }
}
