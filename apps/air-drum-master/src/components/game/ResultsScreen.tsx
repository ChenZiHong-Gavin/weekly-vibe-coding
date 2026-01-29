import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Trophy, RotateCcw, Home, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultsScreenProps {
  onReplay: () => void;
  onHome: () => void;
}

export function ResultsScreen({ onReplay, onHome }: ResultsScreenProps) {
  const { score, currentBeatMap, resetGame } = useGameStore();
  const totalNotesInBeatMap = currentBeatMap?.notes.length || 0;
  
  const accuracyPercent = totalNotesInBeatMap > 0 
    ? ((score.perfect * 100 + score.good * 50) / totalNotesInBeatMap) 
    : score.accuracy;
    
  const totalProcessed = score.perfect + score.good + score.miss;
  
  // Calculate grade
  let grade: string;
  let gradeColor: string;
  
  if (accuracyPercent >= 95) {
    grade = 'S';
    gradeColor = 'text-accent';
  } else if (accuracyPercent >= 85) {
    grade = 'A';
    gradeColor = 'text-primary';
  } else if (accuracyPercent >= 70) {
    grade = 'B';
    gradeColor = 'text-secondary';
  } else if (accuracyPercent >= 50) {
    grade = 'C';
    gradeColor = 'text-muted-foreground';
  } else {
    grade = 'D';
    gradeColor = 'text-miss';
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-2xl mx-4"
      >
        <div className="bg-card/80 backdrop-blur-sm rounded-3xl border border-border p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <Trophy className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="game-title text-3xl text-foreground mb-2">
              {currentBeatMap?.title || 'Demo Song'}
            </h2>
            <p className="text-muted-foreground">
              {currentBeatMap?.artist || 'Taiko Master'} • {currentBeatMap?.difficulty || 'Normal'}
            </p>
          </div>
          
          {/* Grade */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            className="text-center mb-8"
          >
            <div className={`game-title text-9xl font-black ${gradeColor} text-shadow-glow`}>
              {grade}
            </div>
          </motion.div>
          
          {/* Score */}
          <div className="text-center mb-8">
            <div className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
              Final Score
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="score-display text-5xl text-accent"
            >
              {score.score.toLocaleString()}
            </motion.div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-muted/30 rounded-xl p-4 text-center"
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Accuracy
              </div>
              <div className="score-display text-2xl text-foreground">
                {accuracyPercent.toFixed(1)}%
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-muted/30 rounded-xl p-4 text-center"
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Max Combo
              </div>
              <div className="score-display text-2xl text-primary">
                {score.maxCombo}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-muted/30 rounded-xl p-4 text-center"
            >
              <div className="text-xs text-perfect uppercase tracking-wider mb-1">
                Perfect
              </div>
              <div className="score-display text-2xl text-perfect">
                {score.perfect}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-muted/30 rounded-xl p-4 text-center"
            >
              <div className="text-xs text-good uppercase tracking-wider mb-1">
                Good / Miss
              </div>
              <div className="score-display text-2xl">
                <span className="text-good">{score.good}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-miss">{score.miss}</span>
              </div>
            </motion.div>
          </div>
          
          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex justify-center gap-4"
          >
            <Button
              onClick={onHome}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Home className="w-5 h-5" />
              Home
            </Button>
            <Button
              onClick={onReplay}
              size="lg"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
