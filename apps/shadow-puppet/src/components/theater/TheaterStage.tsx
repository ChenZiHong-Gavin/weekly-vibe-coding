import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useTheaterStore } from '@/store/theaterStore';
import { useTheaterLoop } from '@/hooks/useTheaterLoop';
import { useHandTracking } from '@/hooks/useHandTracking';
import { HandPoseClassifier } from '@/core/HandPoseClassifier';
import { SoundManager } from '@/core/SoundManager';
import { GestureResult } from '@/types/hand-shadow';
import { scenes } from '@/data/scenes';
import CameraPreview from './CameraPreview';

interface TheaterStageProps {
  soundManager: SoundManager | null;
}

export default function TheaterStage({ soundManager }: TheaterStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(true);
  const poseClassifierRef = useRef(new HandPoseClassifier());
  const lastComboRef = useRef(0);
  const fistTimerRef = useRef(0);

  const {
    gestures,
    setGestures,
    setCameraReady,
    setDetectedPose,
    sfxEnabled,
    cameraFailed,
    selectedSceneId,
    triggerEffect,
  } = useTheaterStore();

  const scene = useMemo(
    () => scenes.find(s => s.id === selectedSceneId) || scenes[0],
    [selectedSceneId],
  );

  const canvasW = canvasRef.current?.width || window.innerWidth;
  const canvasH = canvasRef.current?.height || window.innerHeight;

  const handleGestures = useCallback(
    (g: GestureResult[]) => {
      setGestures(g);
    },
    [setGestures],
  );

  const { ready, error, videoRef, rawHands } = useHandTracking(
    handleGestures,
    canvasW,
    canvasH,
    true,
  );

  useEffect(() => {
    setCameraReady(ready);
  }, [ready, setCameraReady]);

  // Pose classification from raw hand data
  useEffect(() => {
    if (rawHands.length > 0) {
      const result = poseClassifierRef.current.classify(rawHands[0]);
      setDetectedPose(result.pose || null);
    } else {
      setDetectedPose(null);
    }
  }, [rawHands, setDetectedPose]);

  // Gesture combo → effects trigger
  useEffect(() => {
    const g = gestures[0];
    if (!g || g.type === 'none') return;

    const now = Date.now();
    const pos = g.position;

    if (g.type === 'pinch' && now - lastComboRef.current > 2000 && sfxEnabled) {
      triggerEffect({
        id: `fx-${now}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'burst', x: pos.x, y: pos.y - 60,
        startTime: performance.now(),
      });
      soundManager?.playGong();
      lastComboRef.current = now;
    }

    if (g.type === 'wave' && now - lastComboRef.current > 2000 && sfxEnabled) {
      triggerEffect({
        id: `fx-${now}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'petals', x: pos.x, y: pos.y,
        startTime: performance.now(),
      });
      soundManager?.playWoodblock();
      lastComboRef.current = now;
    }

    if (g.type === 'fist') {
      if (fistTimerRef.current === 0) fistTimerRef.current = now;
      if (now - fistTimerRef.current > 600 && sfxEnabled && now - lastComboRef.current > 2000) {
        triggerEffect({
          id: `fx-${now}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'smoke', x: pos.x, y: pos.y + 40,
          startTime: performance.now(),
        });
        soundManager?.playDrum();
        lastComboRef.current = now;
        fistTimerRef.current = 0;
      }
    } else {
      fistTimerRef.current = 0;
    }
  }, [gestures, sfxEnabled, triggerEffect, soundManager]);

  useTheaterLoop({
    canvasRef,
    scene,
    gestures,
    handData: rawHands,
  });

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {cameraFailed && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <div className="panel-traditional rounded-lg px-4 py-2 text-center max-w-md">
            <p className="text-vermilion text-sm font-song">摄像头不可用</p>
            {error && (
              <p className="text-muted-foreground text-xs mt-1 font-song">{error}</p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-gold underline hover:text-gold/80 font-song"
            >
              点击刷新页面重试
            </button>
          </div>
        </div>
      )}

      {!ready && !cameraFailed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="panel-traditional rounded-lg px-6 py-4 text-center">
            <div className="animate-pulse text-gold text-lg font-song">
              正在启动手势识别
            </div>
            <div className="text-muted-foreground text-sm mt-2">
              请允许浏览器使用摄像头，将手掌对准屏幕
            </div>
          </div>
        </div>
      )}

      {ready && (
        <button
          onClick={() => setShowCamera(!showCamera)}
          className="absolute top-4 right-4 z-20 panel-traditional rounded-lg px-3 py-1.5 text-xs font-song transition-all hover:border-[hsl(var(--gold)/0.5)]"
          style={{ color: 'hsl(var(--gold))' }}
        >
          {showCamera ? '隐藏摄像头' : '显示摄像头'}
        </button>
      )}

      <CameraPreview
        videoRef={videoRef}
        visible={ready && showCamera}
        handData={rawHands}
      />
    </div>
  );
}
