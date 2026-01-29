import React from 'react';
import { motion } from 'framer-motion';

export function Track() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Main track line */}
      <div className="absolute left-[15vw] right-[10vw] top-1/2 -translate-y-1/2 h-20">
        {/* Track background */}
        <div className="absolute inset-0 bg-muted/20 rounded-full track-glow" />
        
        {/* Track center line */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="w-full h-0.5 bg-gradient-to-r from-accent/50 via-accent/20 to-transparent" />
        </div>
        
        {/* Beat markers */}
        {[0.25, 0.5, 0.75].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-accent/20"
            style={{ left: `${pos * 100}%` }}
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>
      
      {/* Spawn indicator */}
      <div className="absolute right-[10vw] top-1/2 -translate-y-1/2 w-1 h-24 bg-gradient-to-b from-transparent via-muted-foreground/30 to-transparent rounded-full" />
    </div>
  );
}
