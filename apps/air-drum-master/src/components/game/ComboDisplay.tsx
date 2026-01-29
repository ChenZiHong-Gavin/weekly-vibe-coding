import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

export function ComboDisplay() {
  const { combo } = useGameStore();
  
  if (combo < 5) return null;
  
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
      <AnimatePresence mode="wait">
        <motion.div
          key={combo}
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 1.2, opacity: 0, y: -20 }}
          transition={{ 
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          className="flex flex-col items-center"
        >
          <span className="text-muted-foreground text-sm uppercase tracking-widest mb-1">
            Combo
          </span>
          <span 
            className={`game-title text-7xl font-black ${
              combo >= 100 
                ? 'combo-display text-shadow-glow' 
                : combo >= 50 
                  ? 'text-accent text-shadow-glow' 
                  : 'text-primary'
            }`}
          >
            {combo}
          </span>
          {combo >= 10 && combo % 10 === 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-accent text-lg mt-2 font-bold"
            >
              {combo >= 100 ? '🔥 INCREDIBLE!' : combo >= 50 ? '⚡ AMAZING!' : '✨ GREAT!'}
            </motion.span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
