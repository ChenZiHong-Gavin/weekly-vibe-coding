import { useEffect, useRef, useCallback, useState } from 'react';
import { useTheaterStore } from '@/store/theaterStore';
import { stories } from '@/data/stories';
import { puppets as puppetDefs } from '@/data/puppets';
import { PuppetEngine } from '@/core/PuppetEngine';
import { SoundManager } from '@/core/SoundManager';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play } from 'lucide-react';

interface StoryModeProps {
  soundManager: SoundManager | null;
}

export default function StoryMode({ soundManager }: StoryModeProps) {
  const {
    currentStoryId,
    storyActIndex,
    setStoryActIndex,
    isPlaying,
    setIsPlaying,
    setPuppetStates,
    setSelectedSceneId,
    sfxEnabled,
  } = useTheaterStore();

  const engineRef = useRef(new PuppetEngine());
  const animRef = useRef(0);
  const actStartRef = useRef(0);
  const pausedAtRef = useRef(0);
  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [actProgress, setActProgress] = useState(0);

  const story = stories.find(s => s.id === currentStoryId);

  const startStory = useCallback(() => {
    if (!story) return;

    setSelectedSceneId(story.sceneId);

    const initialStates = story.puppetIds.map((pid) => {
      const def = puppetDefs.find(d => d.id === pid)!;
      return engineRef.current.createPuppetState(def, 400, 300, 0.7);
    });
    setPuppetStates(initialStates);
    setStoryActIndex(0);
    setIsPlaying(true);
    isPausedRef.current = false;
    setIsPaused(false);
    setActProgress(0);

    if (sfxEnabled && soundManager) {
      soundManager.playGong();
    }
  }, [story, setSelectedSceneId, setPuppetStates, setStoryActIndex, setIsPlaying, sfxEnabled, soundManager]);

  const handlePauseToggle = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  };

  useEffect(() => {
    if (!isPlaying || !story) return;

    const act = story.acts[storyActIndex];
    if (!act) {
      setIsPlaying(false);
      return;
    }

    // If resuming from pause, adjust start time
    if (pausedAtRef.current > 0) {
      actStartRef.current = performance.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
    } else {
      actStartRef.current = performance.now();
      pausedAtRef.current = 0;
    }

    const actionsRan = new Set<number>();
    // Track move start positions per action index
    const moveStartPositions: Map<number, { x: number; y: number }> = new Map();

    const tick = (now: number) => {
      if (isPausedRef.current) {
        pausedAtRef.current = now - actStartRef.current;
        return; // Stop processing but keep the loop reference
      }

      animRef.current = requestAnimationFrame(tick);

      const elapsed = now - actStartRef.current;
      setActProgress(Math.min(elapsed / act.duration, 1));

      // Process one-shot actions (enter, pose, exit)
      for (let i = 0; i < act.actions.length; i++) {
        if (actionsRan.has(i)) continue;
        const action = act.actions[i];
        if (elapsed < action.delay) continue;
        actionsRan.add(i);

        const store = useTheaterStore.getState();
        const ps = store.puppetStates[action.puppetIndex];
        if (!ps) continue;

        if (action.type === 'enter') {
          const canvas = document.querySelector('canvas');
          const cw = canvas?.width || window.innerWidth;
          const ch = canvas?.height || window.innerHeight;
          store.updatePuppetState(action.puppetIndex, {
            ...ps,
            x: action.targetX! * cw,
            y: action.targetY! * ch,
            opacity: 1,
          });
        } else if (action.type === 'pose' && action.jointAngles) {
          for (const [jointId, angle] of Object.entries(action.jointAngles)) {
            const js = ps.joints[jointId];
            if (js) {
              js.targetAngle = angle;
            } else {
              const fallback = jointId.replace('lowerArm', 'upperArm');
              const fb = ps.joints[fallback];
              if (fb) fb.targetAngle = angle * 0.6;
            }
          }
          store.updatePuppetState(action.puppetIndex, { ...ps });
        } else if (action.type === 'exit') {
          store.updatePuppetState(action.puppetIndex, { ...ps, opacity: 0 });
        }
      }

      // Process move actions with continuous interpolation
      for (let i = 0; i < act.actions.length; i++) {
        const action = act.actions[i];
        if (action.type !== 'move') continue;
        if (elapsed < action.delay) continue;

        const moveElapsed = elapsed - action.delay;
        const t = Math.min(moveElapsed / action.duration, 1);
        const ease = t * (2 - t);

        const store = useTheaterStore.getState();
        const ps = store.puppetStates[action.puppetIndex];
        if (!ps) continue;

        // Record start position when move begins
        if (!moveStartPositions.has(i)) {
          moveStartPositions.set(i, { x: ps.x, y: ps.y });
        }
        const start = moveStartPositions.get(i)!;

        const canvas = document.querySelector('canvas');
        const cw = canvas?.width || window.innerWidth;
        const ch = canvas?.height || window.innerHeight;

        const targetX = action.targetX! * cw;
        const targetY = action.targetY! * ch;

        store.updatePuppetState(action.puppetIndex, {
          ...ps,
          x: start.x + (targetX - start.x) * ease,
          y: start.y + (targetY - start.y) * ease,
        });
      }

      // Check act completion
      if (elapsed >= act.duration) {
        cancelAnimationFrame(animRef.current);
        if (storyActIndex < story.acts.length - 1) {
          setStoryActIndex(storyActIndex + 1);
          setActProgress(0);
          if (sfxEnabled && soundManager) soundManager.playWoodblock();
        } else {
          setIsPlaying(false);
          setActProgress(1);
          if (sfxEnabled && soundManager) soundManager.playGong();
        }
      }
    };

    // If resuming, tick immediately
    if (isPausedRef.current) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      animRef.current = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, storyActIndex, story, setIsPlaying, setStoryActIndex, sfxEnabled, soundManager]);

  const currentAct = story?.acts[storyActIndex];

  return (
    <div className="space-y-3">
      <h3 className="theater-title text-lg">故事模式</h3>

      {!isPlaying ? (
        <div className="space-y-2">
          {stories.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                useTheaterStore.getState().setCurrentStoryId(s.id);
                const engine = new PuppetEngine();
                const initialStates = s.puppetIds.map((pid) => {
                  const def = puppetDefs.find(d => d.id === pid)!;
                  return engine.createPuppetState(def, 400, 300, 0.7);
                });
                setPuppetStates(initialStates);
                setSelectedSceneId(s.sceneId);
                setStoryActIndex(0);
                setIsPlaying(true);
                if (sfxEnabled && soundManager) soundManager.playGong();
              }}
              className="w-full p-3 rounded-lg border border-[hsl(25_25%_18%)] hover:border-[hsl(var(--gold)/0.3)] bg-[hsl(25_35%_10%/0.5)] transition-all text-left"
            >
              <div className="font-song text-sm text-gold">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.description}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground font-song">
            <span>第 {storyActIndex + 1} / {story?.acts.length} 幕</span>
            {isPaused && <span className="text-gold text-xs">已暂停</span>}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-[hsl(25_25%_12%)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[hsl(var(--gold))] transition-all duration-300"
              style={{ width: `${actProgress * 100}%` }}
            />
          </div>

          {/* Overall story progress */}
          <div className="flex gap-1">
            {story?.acts.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i < storyActIndex ? 'bg-jade/50' :
                  i === storyActIndex ? 'bg-gold' :
                  'bg-[hsl(25_25%_12%)]'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePauseToggle}
              className="btn-traditional text-sm flex-1 flex items-center justify-center gap-2"
            >
              {isPaused ? (
                <><Play className="w-3.5 h-3.5" /> 继续</>
              ) : (
                <><Pause className="w-3.5 h-3.5" /> 暂停</>
              )}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setStoryActIndex(0);
                setActProgress(0);
              }}
              className="btn-traditional text-sm flex-1"
            >
              停止
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isPlaying && currentAct && (
          <motion.div
            key={storyActIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-lg"
          >
            <div className="panel-traditional rounded-xl px-8 py-4">
              <p className="font-song text-base text-parchment text-center leading-relaxed">
                {currentAct.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
