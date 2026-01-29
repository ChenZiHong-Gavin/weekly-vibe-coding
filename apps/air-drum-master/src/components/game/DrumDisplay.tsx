import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

export function DrumDisplay() {
  const { lastHit, leftHand, rightHand } = useGameStore();
  
  const hasLeft = !!leftHand;
  const hasRight = !!rightHand;
  
  const isAir = !hasLeft && !hasRight;
  const isKat = hasLeft && !hasRight;
  const isDon = !hasLeft && hasRight;
  const isBoom = hasLeft && hasRight;
  
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-end gap-6 md:gap-12">
      {/* Air Drum (White - None) */}
      <motion.div
        animate={{
          scale: isAir ? 1.1 : 0.9,
          opacity: isAir ? 1 : 0.4,
          boxShadow: isAir ? '0 0 40px rgba(255, 255, 255, 0.6)' : 'none',
        }}
        className="relative w-20 h-20 rounded-full drum-air flex items-center justify-center transition-all"
      >
        <span className="text-black text-sm font-bold">AIR</span>
        <AnimatePresence>
          {isAir && (
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-white/50"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Kat Drum (Blue - Left) */}
      <motion.div
        animate={{
          scale: isKat ? 1.1 : 0.9,
          opacity: isKat ? 1 : 0.4,
          boxShadow: isKat ? '0 0 50px hsl(var(--kat) / 0.6)' : 'none',
        }}
        className="relative w-24 h-24 rounded-full drum-kat flex items-center justify-center transition-all"
      >
        <span className="text-white text-xl font-bold">咔</span>
      </motion.div>
      
      {/* Don Drum (Red - Right) */}
      <motion.div
        animate={{
          scale: isDon ? 1.1 : 0.9,
          opacity: isDon ? 1 : 0.4,
          boxShadow: isDon ? '0 0 50px hsl(var(--don) / 0.6)' : 'none',
        }}
        className="relative w-24 h-24 rounded-full drum-don flex items-center justify-center transition-all"
      >
        <span className="text-white text-xl font-bold">咚</span>
      </motion.div>

      {/* Boom Drum (Black - Both) */}
      <motion.div
        animate={{
          scale: isBoom ? 1.1 : 0.9,
          opacity: isBoom ? 1 : 0.4,
          boxShadow: isBoom ? '0 0 60px rgba(0, 0, 0, 0.8), 0 0 20px hsl(var(--accent) / 0.4)' : 'none',
        }}
        className="relative w-28 h-28 rounded-full drum-boom flex items-center justify-center transition-all"
      >
        <span className="text-white text-xl font-bold">BOOM</span>
      </motion.div>
      
      {/* Judgment display */}
      <AnimatePresence>
        {lastHit && (
          <motion.div
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -60, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2"
          >
            <span 
              className={`
                game-title text-3xl font-black
                ${lastHit.judgment === 'perfect' ? 'judgment-perfect' : 'judgment-good'}
              `}
            >
              {lastHit.judgment === 'perfect' ? 'PERFECT!' : 'GOOD!'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
