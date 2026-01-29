import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

export function BackgroundEffects() {
  const { combo, gameState } = useGameStore();
  
  // Generate floating particles based on combo
  const particleCount = Math.min(combo, 20);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-muted/10 via-background to-background" />
      
      {/* Animated background lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        {[...Array(5)].map((_, i) => (
          <motion.line
            key={i}
            x1="0%"
            y1={`${20 + i * 15}%`}
            x2="100%"
            y2={`${20 + i * 15}%`}
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="10 20"
            animate={{
              strokeDashoffset: [0, -60],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.2,
            }}
          />
        ))}
      </svg>
      
      {/* Floating particles */}
      {gameState === 'playing' && [...Array(particleCount)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: i % 2 === 0 
              ? 'hsl(var(--primary))' 
              : 'hsl(var(--secondary))',
            left: `${Math.random() * 100}%`,
            top: '100%',
          }}
          animate={{
            y: [0, -window.innerHeight * 1.2],
            x: [0, (Math.random() - 0.5) * 200],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeOut',
          }}
        />
      ))}
      
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-radial from-primary/10 to-transparent" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-radial from-secondary/10 to-transparent" />
      
      {/* Combo glow effect */}
      {combo >= 10 && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
          style={{
            background: combo >= 50 
              ? 'radial-gradient(ellipse at center, hsl(var(--accent) / 0.2) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}
