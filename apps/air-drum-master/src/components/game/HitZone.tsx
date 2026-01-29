import React from 'react';
import { motion } from 'framer-motion';

export function HitZone() {
  return (
    <div className="absolute left-[15vw] top-1/2 -translate-y-1/2 -translate-x-1/2">
      {/* Outer glow ring */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 20px hsl(45, 100%, 55%)',
            '0 0 40px hsl(45, 100%, 55%)',
            '0 0 20px hsl(45, 100%, 55%)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="w-48 h-48 rounded-full hit-zone bg-transparent flex items-center justify-center"
      >
        {/* Inner target */}
        <div className="w-36 h-36 rounded-full border-2 border-accent/60 bg-accent/10 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-2 border-accent/40 bg-accent/5" />
        </div>
      </motion.div>
      
      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-accent text-sm font-medium tracking-wider">HIT ZONE</span>
      </div>
    </div>
  );
}
