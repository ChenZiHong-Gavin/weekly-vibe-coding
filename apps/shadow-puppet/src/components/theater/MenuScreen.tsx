import { motion } from 'framer-motion';
import { useTheaterStore } from '@/store/theaterStore';
import { SoundManager } from '@/core/SoundManager';
import { Play, BookOpen } from 'lucide-react';

interface MenuScreenProps {
  soundManager: SoundManager | null;
}

const CLOUDS = [
  { x: '8%', y: '12%', scale: 1.1, duration: 40, delay: 0 },
  { x: '75%', y: '8%', scale: 0.7, duration: 55, delay: 5 },
  { x: '40%', y: '18%', scale: 0.5, duration: 48, delay: 12 },
  { x: '90%', y: '22%', scale: 0.9, duration: 52, delay: 8 },
  { x: '20%', y: '75%', scale: 0.6, duration: 60, delay: 15 },
  { x: '65%', y: '80%', scale: 0.8, duration: 45, delay: 3 },
];

function CloudSvg({ scale }: { scale: number }) {
  return (
    <svg width={120 * scale} height={50 * scale} viewBox="0 0 120 50" fill="none">
      <path
        d="M10 35 C5 20 20 8 35 15 C40 2 65 2 68 15 C78 5 100 10 95 25 C105 22 108 35 98 38 C100 45 85 48 75 42 C65 50 40 50 30 42 C20 48 5 42 10 35Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function MenuScreen({ soundManager }: MenuScreenProps) {
  const { setMode, sfxEnabled } = useTheaterStore();

  const handleStart = (mode: 'free' | 'story') => {
    if (sfxEnabled && soundManager) {
      soundManager.playGong();
    }
    setMode(mode);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, hsl(25 40% 8%) 0%, hsl(25 40% 3%) 100%)',
      }}
    >
      {/* Animated clouds */}
      {CLOUDS.map((c, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none text-[hsl(var(--gold)/0.06)]"
          style={{ top: c.y, left: c.x }}
          animate={{
            x: ['0vw', '8vw', '0vw', '-5vw', '0vw'],
            y: ['0vh', '-2vh', '1vh', '-1.5vh', '0vh'],
          }}
          transition={{
            duration: c.duration,
            repeat: Infinity,
            ease: 'linear',
            delay: c.delay,
          }}
        >
          <CloudSvg scale={c.scale} />
        </motion.div>
      ))}

      {/* Lanterns */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-16">
        {[0, 1].map(i => (
          <motion.div
            key={i}
            className="relative"
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          >
            <div className="w-8 h-12 rounded-b-lg relative" style={{ background: 'linear-gradient(180deg, hsl(var(--accent)), hsl(var(--accent-foreground)))' }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-2 rounded-t" style={{ background: 'hsl(var(--gold))' }} />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4" style={{ background: 'hsl(var(--gold)/0.6)' }} />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full opacity-20 lantern-glow" />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="text-center relative z-10"
      >
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="theater-title text-6xl mb-4"
        >
          光影皮影戏
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="theater-subtitle text-lg mb-12 opacity-70"
        >
          以手为引，光影为墨，演绎千年古韵
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col items-center gap-4"
        >
          <button
            onClick={() => handleStart('free')}
            className="btn-traditional text-lg px-12 py-3 flex items-center gap-3 group"
          >
            <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>自由表演</span>
          </button>

          <button
            onClick={() => handleStart('story')}
            className="px-10 py-2.5 rounded font-song text-base flex items-center gap-3
              bg-[hsl(25_35%_12%)] text-[hsl(var(--parchment))]
              border border-[hsl(var(--gold)/0.3)]
              hover:border-[hsl(var(--gold)/0.6)] hover:bg-[hsl(25_35%_16%)]
              transition-all group"
          >
            <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>故事模式</span>
          </button>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-px scroll-decoration" />
    </div>
  );
}
