import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Bug {
  id: number;
  x: number;
  y: number;
  emoji: string;
  isDead: boolean;
}

interface AvadaSpellProps {
  isActive: boolean;
}

const bugEmojis = ['🪲', '🐛', '🦗', '🪳', '🐜', '🦟', '🪰'];

const AvadaSpell = ({ isActive }: AvadaSpellProps) => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    // Initialize bugs
    const initialBugs: Bug[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 50,
      emoji: bugEmojis[Math.floor(Math.random() * bugEmojis.length)],
      isDead: false,
    }));
    setBugs(initialBugs);
  }, []);

  useEffect(() => {
    if (isActive) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);
      
      // Kill bugs one by one with delay
      bugs.forEach((bug, index) => {
        setTimeout(() => {
          setBugs(prev => prev.map(b => 
            b.id === bug.id ? { ...b, isDead: true } : b
          ));
        }, 100 * (index + 1));
      });

      // Respawn after 3 seconds
      setTimeout(() => {
        setBugs(prev => prev.map(b => ({ ...b, isDead: false })));
      }, 4000);
    }
  }, [isActive]);

  return (
    <div className="relative flex items-center justify-center h-64 overflow-hidden">
      {/* Green flash effect */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="absolute inset-0 bg-avada/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              boxShadow: 'inset 0 0 100px hsl(120 100% 40%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Green lightning bolt */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 text-avada text-4xl"
            initial={{ opacity: 0, y: -20, scale: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              filter: 'drop-shadow(0 0 10px hsl(120 100% 40%)) drop-shadow(0 0 20px hsl(120 100% 50%))',
              textShadow: '0 0 20px hsl(120 100% 50%)',
            }}
          >
            ⚡
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bugs */}
      {bugs.map((bug) => (
        <motion.div
          key={bug.id}
          className="absolute text-2xl"
          style={{ left: `${bug.x}%`, top: `${bug.y}%` }}
          animate={bug.isDead ? {
            opacity: 0,
            scale: 0,
            rotate: 180,
            y: 50,
          } : {
            opacity: 1,
            scale: 1,
            rotate: 0,
            y: [0, -5, 0],
            x: [0, Math.random() * 10 - 5, 0],
          }}
          transition={bug.isDead ? {
            duration: 0.5,
          } : {
            duration: 2 + Math.random(),
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {bug.emoji}
        </motion.div>
      ))}

      {/* Spell text */}
      <AnimatePresence>
        {isActive && (
          <motion.p
            className="absolute bottom-0 text-avada font-heading text-lg text-glow-avada"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Avada Kedavra!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AvadaSpell;
