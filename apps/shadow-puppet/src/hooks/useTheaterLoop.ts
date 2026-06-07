import { useRef, useEffect, useCallback } from 'react';
import { StageRenderer } from '@/core/StageRenderer';
import { PuppetEngine } from '@/core/PuppetEngine';
import { PuppetDef, PuppetState, SceneDef, GestureResult } from '@/types/puppet';

interface TheaterLoopOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  scene: SceneDef;
  puppets: { def: PuppetDef; state: PuppetState; isActive?: boolean }[];
  allPuppetDefs: PuppetDef[];
  gestures: GestureResult[];
  isShadowMode: boolean;
  onUpdate: (puppets: { def: PuppetDef; state: PuppetState }[]) => void;
  hasInputRef: React.RefObject<boolean>;
}

export function useTheaterLoop(options: TheaterLoopOptions) {
  const rendererRef = useRef<StageRenderer | null>(null);
  const engineRef = useRef(new PuppetEngine());
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);
  const frameTimeRef = useRef(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const loop = useCallback((timestamp: number) => {
    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05) : 0.016;
    lastTimeRef.current = timestamp;
    frameTimeRef.current = timestamp;

    const { scene, puppets, gestures, isShadowMode, onUpdate } = optionsRef.current;
    const renderer = rendererRef.current;
    const engine = engineRef.current;

    if (!renderer) {
      animRef.current = requestAnimationFrame(loop);
      return;
    }

    const hasInput = optionsRef.current.hasInputRef.current;
    for (const { def, state } of puppets) {
      engine.update(state, def, dt, hasInput);
    }

    renderer.renderFrame(scene, puppets, gestures, isShadowMode, dt);
    onUpdate(puppets);

    animRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    const canvas = options.canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      if (rendererRef.current) {
        rendererRef.current.resize(canvas.width, canvas.height);
      }
    };

    rendererRef.current = new StageRenderer(ctx, canvas.width, canvas.height);
    rendererRef.current.preloadImages(options.allPuppetDefs);
    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas.parentElement!);

    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [options.canvasRef, loop]);

  return {
    engine: engineRef.current,
    renderer: rendererRef.current,
    frameTimeRef,
  };
}
