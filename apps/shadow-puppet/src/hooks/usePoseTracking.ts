import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseTracker } from '@/core/PoseTracker';
import { PoseLandmark } from '@/types/puppet';
import { useTheaterStore } from '@/store/theaterStore';

export function usePoseTracking(
  onPose: (landmarks: PoseLandmark[]) => void,
  enabled: boolean,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<PoseTracker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);

  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;

  const handleResults = useCallback(
    (lm: PoseLandmark[]) => {
      setLandmarks(lm);
      onPoseRef.current(lm);
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

    const tracker = new PoseTracker();
    trackerRef.current = tracker;

    let mounted = true;

    (async () => {
      const ok = await tracker.init(video, handleResults);
      if (!mounted) return;
      if (!ok) {
        setError('无法初始化人体追踪，请检查摄像头权限');
        useTheaterStore.getState().setCameraFailed(true);
        return;
      }
      await tracker.start();
      if (mounted) {
        setReady(true);
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

  return { ready, error, videoRef, landmarks };
}
