import { useRef, useEffect, useCallback, useState } from 'react';
import { gestureDetector } from '@/core/GestureDetector';
import { useGameStore } from '@/store/gameStore';
import type { HandGesture } from '@/types/game';

interface UseGestureDetectionProps {
  enabled: boolean;
}

export function useGestureDetection({ enabled }: UseGestureDetectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setLeftHand, setRightHand } = useGameStore();
  
  const handleGesture = useCallback((left: HandGesture | null, right: HandGesture | null) => {
    setLeftHand(left);
    setRightHand(right);
  }, [setLeftHand, setRightHand]);
  
  const initialize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Video or canvas element not ready');
      return;
    }
    
    try {
      await gestureDetector.initialize(
        videoRef.current,
        canvasRef.current,
        handleGesture
      );
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize gesture detection:', err);
      setError('Failed to initialize camera. Please allow camera access.');
    }
  }, [handleGesture]);
  
  useEffect(() => {
    if (enabled && !isInitialized) {
      initialize();
    }
    
    return () => {
      if (isInitialized) {
        gestureDetector.stop();
        setIsInitialized(false);
      }
    };
  }, [enabled, isInitialized, initialize]);
  
  return {
    videoRef,
    canvasRef,
    isInitialized,
    error,
    reinitialize: initialize,
  };
}
