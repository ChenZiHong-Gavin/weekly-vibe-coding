import { useRef, useEffect } from 'react';
import { SoundManager } from '@/core/SoundManager';
import TheaterStage from '@/components/theater/TheaterStage';
import GestureGuide from '@/components/theater/GestureGuide';

export default function Index() {
  const soundManagerRef = useRef<SoundManager | null>(null);

  useEffect(() => {
    const sm = new SoundManager();
    sm.init();
    soundManagerRef.current = sm;
    return () => sm.destroy();
  }, []);

  return (
    <div className="w-full h-full overflow-hidden relative">
      <TheaterStage soundManager={soundManagerRef.current} />
      <GestureGuide />
    </div>
  );
}
