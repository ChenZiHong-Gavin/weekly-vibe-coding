import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface PatronusSpellProps {
  isActive: boolean;
  voiceHash: number;
}

const patronusAnimals = [
  { name: '鹿', emoji: '🦌', description: 'Stag - 象征保护与勇气' },
  { name: '凤凰', emoji: '🦅', description: 'Phoenix - 象征重生与希望' },
  { name: '水獭', emoji: '🦦', description: 'Otter - 象征智慧与好奇' },
  { name: '狼', emoji: '🐺', description: 'Wolf - 象征忠诚与力量' },
  { name: '马', emoji: '🐴', description: 'Horse - 象征自由与高贵' },
  { name: '天鹅', emoji: '🦢', description: 'Swan - 象征优雅与纯洁' },
  { name: '猫头鹰', emoji: '🦉', description: 'Owl - 象征智慧与洞察' },
  { name: '兔子', emoji: '🐰', description: 'Rabbit - 象征敏捷与警觉' },
  { name: '狐狸', emoji: '🦊', description: 'Fox - 象征机智与狡黠' },
  { name: '熊', emoji: '🐻', description: 'Bear - 象征力量与坚韧' },
];

const PatronusSpell = ({ isActive, voiceHash }: PatronusSpellProps) => {
  const [patronus, setPatronus] = useState(patronusAnimals[0]);

  useEffect(() => {
    if (isActive) {
      const index = Math.abs(voiceHash) % patronusAnimals.length;
      setPatronus(patronusAnimals[index]);
    }
  }, [isActive, voiceHash]);

  return (
    <div className="relative flex flex-col items-center justify-center h-64">
      <AnimatePresence>
        {isActive && (
          <>
            {/* Silver mist effect */}
            <motion.div
              className="absolute rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(200 80% 70% / 0.4) 0%, transparent 70%)',
                width: 250,
                height: 250,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1.1], 
                opacity: [0.3, 0.6, 0.4],
                rotate: [0, 180, 360]
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Patronus animal */}
            <motion.div
              className="relative z-10"
              initial={{ scale: 0, opacity: 0, y: 50 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
              }}
              exit={{ scale: 0, opacity: 0, y: -50 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.span 
                className="text-8xl block"
                style={{
                  filter: 'drop-shadow(0 0 20px hsl(200 80% 70%)) drop-shadow(0 0 40px hsl(200 90% 80%))',
                }}
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {patronus.emoji}
              </motion.span>
            </motion.div>

            <motion.div
              className="absolute bottom-0 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-patronus font-heading text-xl text-glow-patronus">
                {patronus.name}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {patronus.description}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!isActive && (
        <div className="text-muted-foreground/50 text-6xl opacity-30">
          ✨
        </div>
      )}
    </div>
  );
};

export default PatronusSpell;
