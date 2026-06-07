import { useRef, useEffect, useMemo } from 'react';
import { useTheaterStore } from '@/store/theaterStore';
import { SoundManager } from '@/core/SoundManager';
import MenuScreen from '@/components/theater/MenuScreen';
import TheaterStage from '@/components/theater/TheaterStage';
import PuppetSelector from '@/components/theater/PuppetSelector';
import SceneSelector from '@/components/theater/SceneSelector';
import ControlPanel from '@/components/theater/ControlPanel';
import GestureGuide from '@/components/theater/GestureGuide';
import StoryMode from '@/components/story/StoryMode';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function Index() {
  const soundManagerRef = useRef<SoundManager | null>(null);
  const { mode, setMode, setPuppetStates } = useTheaterStore();

  useEffect(() => {
    const sm = new SoundManager();
    sm.init();
    soundManagerRef.current = sm;
    return () => sm.destroy();
  }, []);

  const handleBack = () => {
    setMode('menu');
    setPuppetStates([]);
  };

  return (
    <div className="w-full h-full overflow-hidden relative">
      <AnimatePresence mode="wait">
        {mode === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <MenuScreen soundManager={soundManagerRef.current} />
          </motion.div>
        )}

        {(mode === 'free' || mode === 'story') && (
          <motion.div
            key="theater"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex"
          >
            <div className="flex-1 relative">
              <TheaterStage soundManager={soundManagerRef.current} />
              <GestureGuide />

              <button
                onClick={handleBack}
                className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5
                  panel-traditional rounded-lg text-sm font-song text-parchment
                  hover:border-[hsl(var(--gold)/0.5)] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>

              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <h2 className="theater-title text-2xl">
                  {mode === 'story' ? '故事模式' : '自由表演'}
                </h2>
              </div>
            </div>

            <div className="w-64 h-full overflow-y-auto panel-traditional border-l border-[hsl(var(--gold)/0.2)]">
              <div className="p-4 space-y-6">
                {mode === 'free' && (
                  <>
                    <PuppetSelector soundManager={soundManagerRef.current} />
                    <div className="border-t border-[hsl(25_25%_18%)]" />
                    <SceneSelector />
                    <div className="border-t border-[hsl(25_25%_18%)]" />
                  </>
                )}

                {mode === 'story' && (
                  <>
                    <StoryMode soundManager={soundManagerRef.current} />
                    <div className="border-t border-[hsl(25_25%_18%)]" />
                  </>
                )}

                <ControlPanel soundManager={soundManagerRef.current} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
