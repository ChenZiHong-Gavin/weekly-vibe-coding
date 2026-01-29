import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownProps {
  onComplete: () => void;
}

export function Countdown({ onComplete }: CountdownProps) {
  const [count, setCount] = useState(3);
  
  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }
    
    const timer = setTimeout(() => {
      setCount(c => c - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [count, onComplete]);
  
  const displayText = count === 0 ? 'GO!' : count.toString();
  const color = count === 0 ? 'text-accent' : 'text-foreground';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          className={`game-title text-9xl font-black ${color} text-shadow-glow`}
        >
          {displayText}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
