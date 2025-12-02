import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import mask1 from "@/assets/mask-1.png";
import mask2 from "@/assets/mask-2.png";
import mask3 from "@/assets/mask-3.png";
import mask4 from "@/assets/mask-4.png";
import mask5 from "@/assets/mask-5.png";

const masks = [mask1, mask2, mask3, mask4, mask5];

interface LandmarkPoint {
  x: number;
  y: number;
}

export const FaceOpera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentMask, setCurrentMask] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const detectorRef = useRef<any>(null);
  const handDetectorRef = useRef<any>(null);
  const animationRef = useRef<number>();
  const maskImagesRef = useRef<HTMLImageElement[]>([]);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef<boolean>(false);
  const lastGestureTimeRef = useRef<number>(0);
  const prevHandCenterXRef = useRef<number | null>(null);
  const lastGestureDirRef = useRef<string | null>(null);
  const lastHandSeenAtRef = useRef<number>(0);
  const handHistoryRef = useRef<number[]>([]);
  const faceBoxRef = useRef<{ left: number; right: number; top: number; bottom: number; centerX: number } | null>(null);
  const lastFaceRef = useRef<{ x: number; y: number; r: number; s: number } | null>(null);
  const lastFaceTsRef = useRef<number>(0);

  const waitForEvent = (el: HTMLVideoElement, event: string, timeoutMs: number) =>
    new Promise<void>((resolve, reject) => {
      let timer: number | undefined;
      const onResolve = () => {
        if (timer !== undefined) window.clearTimeout(timer);
        el.removeEventListener(event, onResolve);
        resolve();
      };
      el.addEventListener(event, onResolve, { once: true });
      timer = window.setTimeout(() => {
        el.removeEventListener(event, onResolve);
        reject(new Error("timeout"));
      }, timeoutMs);
    });

  const withTimeout = async <T,>(p: Promise<T>, ms: number) => {
    return Promise.race<T>([
      p,
      new Promise<T>((_, reject) => {
        const id = window.setTimeout(() => reject(new Error("timeout")), ms);
        (p as any).finally?.(() => window.clearTimeout(id));
      }),
    ]);
  };

  useEffect(() => {
    masks.forEach((maskSrc, index) => {
      const img = new Image();
      img.src = maskSrc;
      maskImagesRef.current[index] = img;
    });

    const initCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoInput = devices.some((d) => d.kind === "videoinput");
        if (!hasVideoInput) {
          toast.error("未检测到摄像头");
          return;
        }

        const attempts = [
          { video: { facingMode: "environment", width: 1280, height: 720 }, audio: false },
          { video: { facingMode: "environment", width: 640, height: 480 }, audio: false },
          { video: { facingMode: "user", width: 640, height: 480 }, audio: false },
        ] as MediaStreamConstraints[];

        let connected = false;
        let lastError: unknown;

        for (let i = 0; i < attempts.length && !connected; i++) {
          try {
            toast.loading(`正在连接相机（尝试 ${i + 1}/${attempts.length}）...`, { id: "camera-conn" });
            const stream = await withTimeout(
              navigator.mediaDevices.getUserMedia(attempts[i]),
              5000
            );
            currentStreamRef.current?.getTracks().forEach((t) => t.stop());
            currentStreamRef.current = stream;

            if (!videoRef.current) throw new Error("no video element");
            videoRef.current.srcObject = stream;

            try {
              await withTimeout(waitForEvent(videoRef.current, "loadedmetadata", 3000), 3000);
            } catch {}

            try {
              await withTimeout(videoRef.current.play(), 3000);
            } catch (e) {
              currentStreamRef.current.getTracks().forEach((t) => t.stop());
              currentStreamRef.current = null;
              lastError = e;
              continue;
            }

            if (videoRef.current.readyState < 3 || videoRef.current.videoWidth === 0) {
              currentStreamRef.current?.getTracks().forEach((t) => t.stop());
              currentStreamRef.current = null;
              lastError = new Error("video not ready");
              continue;
            }

            connected = true;
            toast.success("相机已启动", { id: "camera-conn" });
          } catch (err) {
            lastError = err;
          }
        }

        if (!connected) {
          console.error("Camera error:", lastError);
          toast.error("相机连接超时或失败", { id: "camera-conn" });
        }
      } catch (error) {
        console.error("Camera error:", error);
        toast.error("无法访问相机");
      }
    };

    const initDetector = async () => {
      try {
        toast.loading("正在加载人脸特征点检测...", { id: "face-detector" });
        let visionModule: any;
        try {
          visionModule = await import(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"
          );
        } catch {
          visionModule = await import(
            "https://unpkg.com/@mediapipe/tasks-vision/vision_bundle.js"
          );
        }
        const Vision: any = visionModule.default ?? visionModule;
        const { FaceLandmarker, FilesetResolver, HandLandmarker } = Vision;
        let resolver;
        try {
          resolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
          );
        } catch {
          resolver = await FilesetResolver.forVisionTasks(
            "https://unpkg.com/@mediapipe/tasks-vision/wasm"
          );
        }

        let landmarker;
        try {
          landmarker = await FaceLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          });
        } catch {
          landmarker = await FaceLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          });
        }
        let handLandmarker;
        try {
          handLandmarker = await HandLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.7,
            minHandPresenceConfidence: 0.7,
            minTrackingConfidence: 0.7,
          });
        } catch {
          handLandmarker = await HandLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        detectorRef.current = landmarker;
        handDetectorRef.current = handLandmarker;
        console.log("手部检测器状态:", handDetectorRef.current);
        setIsDetecting(true);
        toast.success("人脸特征点检测加载完成", { id: "face-detector" });
      } catch (error) {
        console.error("Model loading error:", error);
        toast.error("人脸检测加载失败", { id: "face-detector" });
      }
    };

    initCamera();
    initDetector();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((t) => t.stop());
        currentStreamRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isDetecting || !detectorRef.current) return;

    const LEFT_EYE = 468;
    const RIGHT_EYE = 473;
    const NOSE_TIP = 1;
    const FOREHEAD = 9;

    const detect = async () => {
      if (
        !videoRef.current ||
        !canvasRef.current ||
        videoRef.current.readyState !== 4
      ) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      try {
        const ts = performance.now();
        const results = detectorRef.current.detectForVideo(
          videoRef.current,
          ts
        );

        let centerX = canvas.width / 2;
        let centerY = canvas.height / 2;
        let rotation = 0;
        let maskSize = 120 * 4.5;
        let hasFace = false;

        if (results?.faceLandmarks?.length) {
          const lms = results.faceLandmarks[0];
          const getPoint = (i: number): LandmarkPoint | null => {
            const p = lms[i];
            if (!p) return null;
            return { x: p.x * canvas.width, y: p.y * canvas.height };
          };
          const leftEye = getPoint(LEFT_EYE);
          const rightEye = getPoint(RIGHT_EYE);
          const nose = getPoint(NOSE_TIP);
          const forehead = getPoint(FOREHEAD);
          centerX = nose && forehead ? (nose.x + forehead.x) / 2 : centerX;
          centerY = nose && forehead ? (nose.y + forehead.y) / 2 : centerY;
          if (leftEye && rightEye) {
            const dx = rightEye.x - leftEye.x;
            const dy = rightEye.y - leftEye.y;
            rotation = Math.atan2(dy, dx);
            const eyeDistance = Math.sqrt(dx * dx + dy * dy);
            maskSize = eyeDistance * 4.5;
          }
          hasFace = true;
          if (lastFaceRef.current) {
            const a = 0.6;
            centerX = lastFaceRef.current.x * a + centerX * (1 - a);
            centerY = lastFaceRef.current.y * a + centerY * (1 - a);
            rotation = lastFaceRef.current.r * a + rotation * (1 - a);
            maskSize = lastFaceRef.current.s * a + maskSize * (1 - a);
          }
          lastFaceRef.current = { x: centerX, y: centerY, r: rotation, s: maskSize };
          lastFaceTsRef.current = ts;
        } else if (lastFaceRef.current && ts - lastFaceTsRef.current < 400) {
          centerX = lastFaceRef.current.x;
          centerY = lastFaceRef.current.y;
          rotation = lastFaceRef.current.r;
          maskSize = lastFaceRef.current.s;
          hasFace = true;
        }

        if (hasFace) {
          const maskImage = maskImagesRef.current[currentMask];
          if (maskImage && maskImage.complete) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            ctx.globalAlpha = 0.65;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(maskImage, -maskSize / 2, -maskSize / 2, maskSize, maskSize);
            ctx.restore();
          }
          const left = centerX - maskSize / 2;
          const right = centerX + maskSize / 2;
          const top = centerY - maskSize / 2;
          const bottom = centerY + maskSize / 2;
          faceBoxRef.current = { left, right, top, bottom, centerX };
        }
        if (handDetectorRef.current) {
          const handRes = handDetectorRef.current.detectForVideo(videoRef.current, ts);
          const hands = handRes?.handLandmarks || handRes?.landmarks || handRes?.multiHandLandmarks || [];
          console.log("手部检测结果:", hands.length > 0 ? "检测到" : "未检测");
          if (hands.length) {
            const lm = hands[0];
            let sumX = 0;
            let sumY = 0;
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
            lm.forEach((p: any) => {
              const x = p.x * canvas.width;
              const y = p.y * canvas.height;
              sumX += x;
              sumY += y;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            });
            const handCx = sumX / lm.length;
            const handCy = sumY / lm.length;

            const area = Math.max(0, (maxX - minX)) * Math.max(0, (maxY - minY));
            const score = handRes?.handedness?.[0]?.[0]?.score ?? 0;
            const drawPoints = score >= 0.5 || area > canvas.width * canvas.height * 0.01;

            if (drawPoints) {
              ctx.fillStyle = "#00ffff";
              ctx.strokeStyle = "#00ffff";
              ctx.lineWidth = 2;
              lm.forEach((p: any) => {
                const x = p.x * canvas.width;
                const y = p.y * canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
              });
              ctx.fillStyle = "#ff0066";
              ctx.beginPath();
              ctx.arc(handCx, handCy, 8, 0, Math.PI * 2);
              ctx.fill();
            }

            handHistoryRef.current.push(handCx);
            const HAND_HISTORY_LEN = 5;
            if (handHistoryRef.current.length > HAND_HISTORY_LEN) {
              handHistoryRef.current.shift();
            }
            if (handHistoryRef.current.length >= HAND_HISTORY_LEN && faceBoxRef.current) {
              const maxX = Math.max(...handHistoryRef.current);
              const minX = Math.min(...handHistoryRef.current);
              const moveRange = maxX - minX;
              const thresh = canvas.width * 0.05;
              const now = performance.now();
              const firstX = handHistoryRef.current[0];
              const lastX = handHistoryRef.current[handHistoryRef.current.length - 1];
              const dirRight = lastX > firstX + thresh * 0.5;
              const withinFaceY = handCy >= faceBoxRef.current.top && handCy <= faceBoxRef.current.bottom;
              const centerLine = faceBoxRef.current.centerX;
              const crossesCenter = minX < centerLine && maxX > centerLine;
              if (moveRange > thresh && dirRight && withinFaceY && crossesCenter && now - lastGestureTimeRef.current > 800) {
                setCurrentMask((prev) => (prev + 1) % masks.length);
                toast.success("➡️ 变脸成功");
                lastGestureTimeRef.current = now;
                handHistoryRef.current = [];
              }
            }

            lastHandSeenAtRef.current = performance.now();
          } else {
            if (performance.now() - lastHandSeenAtRef.current > 1000) {
              handHistoryRef.current = [];
            }
          }
        }
      } catch (e) {
        console.error("Detection error:", e);
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDetecting, currentMask]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentMask((prev) => (prev + 1) % masks.length);
        toast.success("切换到下一个脸谱");
      } else {
        setCurrentMask((prev) => (prev - 1 + masks.length) % masks.length);
        toast.success("切换到上一个脸谱");
      }
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-overlay">
        <h1 className="text-3xl font-bold text-center text-foreground animate-slide-up">
          京剧变脸
        </h1>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-overlay">
        <div className="flex justify-center gap-3">
          {masks.map((_, index) => (
            <div
              key={index}
              className={`w-12 h-12 rounded-full border-2 transition-all ${
                index === currentMask
                  ? "border-secondary scale-110 shadow-glow"
                  : "border-border scale-90 opacity-60"
              }`}
              style={{
                backgroundImage: `url(${masks[index]})`,
                backgroundSize: "cover",
              }}
              onClick={() => setCurrentMask(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
