import { HandData } from '@/types/hand-shadow';

type HandsResultCallback = (hands: HandData[]) => void;

const BASE = import.meta.env.BASE_URL;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded by looking for an existing script tag
    const existing = document.querySelector(`script[data-mp="${src}"]`);
    if (existing) { resolve(); return; }

    const script = document.createElement('script');
    script.src = src;
    script.setAttribute('data-mp', src);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

export class HandTracker {
  private hands: any = null;
  private camera: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private onResults: HandsResultCallback | null = null;
  private running = false;
  public lastError: string | null = null;

  async init(videoElement: HTMLVideoElement, onResults: HandsResultCallback): Promise<boolean> {
    this.videoElement = videoElement;
    this.onResults = onResults;
    this.lastError = null;

    try {
      // Load IIFE scripts via <script> tags so they execute in global scope.
      // Dynamic import() fails because esbuild ESM conversion turns `this` → undefined.
      await loadScript(`${BASE}mediapipe/hands.js`);
      await loadScript(`${BASE}mediapipe/camera_utils.js`);

      const Hands = (window as any).Hands;
      const Camera = (window as any).Camera;

      if (!Hands) {
        this.lastError = 'MediaPipe Hands 加载失败，请刷新页面重试';
        console.error('HandTracker: window.Hands is undefined after script load');
        return false;
      }
      if (!Camera) {
        this.lastError = 'MediaPipe Camera 加载失败，请刷新页面重试';
        console.error('HandTracker: window.Camera is undefined after script load');
        return false;
      }

      this.hands = new Hands({
        locateFile: (file: string) => {
          return `${BASE}mediapipe/${file}`;
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
            } catch (_) {}
          }
        },
        width: 640,
        height: 480,
      });

      return true;
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error('HandTracker init failed:', msg);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        this.lastError = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问';
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFound')) {
        this.lastError = '未检测到摄像头设备';
      } else if (msg.includes('NotReadableError')) {
        this.lastError = '摄像头被其他应用占用，请关闭其他使用摄像头的程序';
      } else {
        this.lastError = `初始化失败：${msg}`;
      }
      return false;
    }
  }

  async start(): Promise<void> {
    this.running = true;
    if (this.camera) {
      try {
        await this.camera.start();
      } catch (e: any) {
        this.running = false;
        const msg = e?.message || String(e);
        console.error('HandTracker camera start failed:', msg);
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          this.lastError = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问并刷新页面';
        } else if (msg.includes('NotFoundError')) {
          this.lastError = '未检测到摄像头设备';
        } else {
          this.lastError = `摄像头启动失败：${msg}`;
        }
        throw e;
      }
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
    if (this.hands) {
      try { this.hands.close(); } catch (_) {}
      this.hands = null;
    }
    this.camera = null;
    this.onResults = null;
  }
}
