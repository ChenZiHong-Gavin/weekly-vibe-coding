import { useEffect, useRef, useState, useCallback } from 'react';
import { HandTracker } from '@/core/HandTracker';
import { GestureInterpreter } from '@/core/GestureInterpreter';
import { HandData, GestureResult } from '@/types/puppet';
import { useTheaterStore } from '@/store/theaterStore';

export function useHandTracking(
  onGestures: (gestures: GestureResult[]) => void,
  canvasWidth: number,
  canvasHeight: number,
  enabled: boolean,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const interpreterRef = useRef(new GestureInterpreter());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawHands, setRawHands] = useState<HandData[]>([]);

  const onGesturesRef = useRef(onGestures);
  onGesturesRef.current = onGestures;
  const canvasSizeRef = useRef({ w: canvasWidth, h: canvasHeight });
  canvasSizeRef.current = { w: canvasWidth, h: canvasHeight };

  const handleResults = useCallback(
    (hands: HandData[]) => {
      setRawHands(hands);
      const { w, h } = canvasSizeRef.current;
      const gestures = interpreterRef.current.interpret(hands, w, h);
      onGesturesRef.current(gestures);
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.muted = true;
    video.style.position = 'fixed';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
    videoRef.current = video;

    const tracker = new HandTracker();
    trackerRef.current = tracker;

    let mounted = true;

    (async () => {
      try {
        const ok = await tracker.init(video, handleResults);
        if (!mounted) return;
        if (!ok) {
          setError('无法初始化手势追踪，请检查摄像头权限');
          useTheaterStore.getState().setCameraFailed(true);
          return;
        }
        await tracker.start();
        if (mounted) {
          setReady(true);
        }
      } catch (e) {
        console.error('Hand tracking start failed:', e);
        if (mounted) {
          setError('摄像头启动失败');
          useTheaterStore.getState().setCameraFailed(true);
        }
      }
    })();

    return () => {
      mounted = false;
      tracker.destroy();
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    };
  }, [enabled, handleResults]);

  return { ready, error, videoRef, rawHands };
}
