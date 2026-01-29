import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

export function ScoreDisplay() {
  const { score, combo, maxCombo } = useGameStore();
  
  return (
    <div className="flex items-center justify-between gap-8 px-6 py-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border">
      {/* Score */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Score</div>
        <div className="score-display text-3xl text-accent">
          {score.score.toLocaleString()}
        </div>
      </div>
      
      {/* Combo */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Combo</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={combo}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`score-display text-3xl ${combo >= 50 ? 'combo-display' : combo >= 10 ? 'text-primary' : 'text-foreground'}`}
          >
            {combo}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Accuracy */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Accuracy</div>
        <div className="score-display text-3xl text-foreground">
          {score.accuracy.toFixed(1)}%
        </div>
      </div>
      
      {/* Hit Stats */}
      <div className="flex gap-4">
        <div className="text-center">
          <div className="text-xs text-perfect uppercase tracking-wider mb-1">Perfect</div>
          <div className="score-display text-xl text-perfect">{score.perfect}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-good uppercase tracking-wider mb-1">Good</div>
          <div className="score-display text-xl text-good">{score.good}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-miss uppercase tracking-wider mb-1">Miss</div>
          <div className="score-display text-xl text-miss">{score.miss}</div>
        </div>
      </div>
    </div>
  );
}
