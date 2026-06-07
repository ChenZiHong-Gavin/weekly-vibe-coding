import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useTheaterStore } from '@/store/theaterStore';
import { useTheaterLoop } from '@/hooks/useTheaterLoop';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useHandGestureControl } from '@/hooks/useHandGestureControl';
import { PuppetEngine } from '@/core/PuppetEngine';
import { SoundManager } from '@/core/SoundManager';
import { puppets as puppetDefs } from '@/data/puppets';
import { scenes } from '@/data/scenes';
import { GestureResult } from '@/types/puppet';
import CameraPreview from './CameraPreview';

interface TheaterStageProps {
  soundManager: SoundManager | null;
}

export default function TheaterStage({ soundManager }: TheaterStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new PuppetEngine());
  const hasInputRef = useRef(false);
  const [showCamera, setShowCamera] = useState(true);

  const {
    puppetStates,
    selectedSceneId,
    isShadowMode,
    gestures,
    setGestures,
    setCameraReady,
    mode,
    activePuppetIndex,
    cameraFailed,
    addPuppet,
  } = useTheaterStore();

  // Add default puppet when entering with no puppets on stage
  useEffect(() => {
    if (puppetStates.length === 0) {
      const def = puppetDefs.find(d => d.id === 'warrior') || puppetDefs[0];
      const state = engineRef.current.createPuppetState(def, 480, 320, 0.8);
      addPuppet(state);
    }
  }, [puppetStates.length, addPuppet]);

  const scene = useMemo(
    () => scenes.find(s => s.id === selectedSceneId) || scenes[0],
    [selectedSceneId],
  );

  const puppetPairs = useMemo(
    () => puppetStates.map((ps, i) => ({
      def: puppetDefs.find(d => d.id === ps.puppetId) || puppetDefs[0],
      state: ps,
      isActive: i === activePuppetIndex,
    })),
    [puppetStates, activePuppetIndex],
  );

  const canvasW = canvasRef.current?.width || window.innerWidth;
  const canvasH = canvasRef.current?.height || window.innerHeight;

  const handleGestures = useCallback(
    (g: GestureResult[]) => {
      setGestures(g);
    },
    [setGestures],
  );

  const trackingEnabled = mode === 'free' || mode === 'story';

  const { ready, videoRef, rawHands } = useHandTracking(
    handleGestures,
    canvasW,
    canvasH,
    trackingEnabled,
  );

  useEffect(() => {
    setCameraReady(ready);
  }, [ready, setCameraReady]);

  const handleUpdate = useCallback(() => {}, []);

  const { engine, frameTimeRef } = useTheaterLoop({
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    scene,
    puppets: puppetPairs,
    allPuppetDefs: puppetDefs,
    gestures,
    isShadowMode,
    onUpdate: handleUpdate,
    hasInputRef,
  });

  useHandGestureControl(puppetDefs, engine || engineRef.current, soundManager, canvasRef, hasInputRef);

  // Mouse fallback when camera is unavailable
  const mouseMode = cameraFailed && trackingEnabled;

  useEffect(() => {
    if (!mouseMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseMove = (e: MouseEvent) => {
      const { puppetStates, activePuppetIndex, updatePuppetState } = useTheaterStore.getState();
      const ps = puppetStates[activePuppetIndex];
      if (!ps) return;
      updatePuppetState(activePuppetIndex, {
        ...ps,
        x: e.clientX,
        y: e.clientY,
      });
    };

    canvas.addEventListener('mousemove', onMouseMove);
    return () => canvas.removeEventListener('mousemove', onMouseMove);
  }, [mouseMode]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {cameraFailed && trackingEnabled && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="panel-traditional rounded-lg px-4 py-1.5 text-center">
            <span className="text-vermilion text-xs font-song">摄像头不可用，已启用鼠标控制</span>
          </div>
        </div>
      )}

      {!ready && !cameraFailed && trackingEnabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="panel-traditional rounded-lg px-6 py-4 text-center">
            <div className="animate-pulse text-gold text-lg font-song">
              正在启动手势识别...
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
        landmarks={[]}
        visible={ready && showCamera}
        handMode
        handData={rawHands}
      />
    </div>
  );
}
