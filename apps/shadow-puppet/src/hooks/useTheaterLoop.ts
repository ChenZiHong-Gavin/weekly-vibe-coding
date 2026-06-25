import { useRef, useEffect, useCallback } from 'react';
import { StageRenderer } from '@/core/StageRenderer';
import { SceneDef, GestureResult, HandData } from '@/types/hand-shadow';

interface TheaterLoopOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  scene: SceneDef;
  gestures: GestureResult[];
  handData: HandData[];
}

export function useTheaterLoop(options: TheaterLoopOptions) {
  const rendererRef = useRef<StageRenderer | null>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const loop = useCallback((timestamp: number) => {
    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05) : 0.016;
    lastTimeRef.current = timestamp;

    const { scene, gestures, handData } = optionsRef.current;
    const renderer = rendererRef.current;

    if (renderer) {
      renderer.renderFrame(scene, handData, gestures, dt);
    }

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

  return { renderer: rendererRef.current };
}
