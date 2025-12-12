import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

interface LumosSpellProps {
  isActive: boolean;
}

const LumosSpell = ({ isActive }: LumosSpellProps) => {
  return (
    <div className="relative flex items-center justify-center h-64">
      <AnimatePresence>
        {isActive && (
          <>
            {/* Outer glow */}
            <motion.div
              className="absolute rounded-full bg-lumos/20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.5, 1.2], 
                opacity: [0.5, 0.8, 0.6] 
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ width: 200, height: 200 }}
            />
            {/* Inner glow */}
            <motion.div
              className="absolute rounded-full bg-lumos/40"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.2, 1], 
                opacity: [0.6, 1, 0.8] 
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ width: 120, height: 120 }}
            />
          </>
        )}
      </AnimatePresence>
      
      <motion.div
        animate={{
          filter: isActive 
            ? 'drop-shadow(0 0 30px hsl(45 100% 70%)) drop-shadow(0 0 60px hsl(45 100% 60%))' 
            : 'none',
        }}
        transition={{ duration: 0.3 }}
      >
        <Lightbulb 
          size={80} 
          className={`transition-colors duration-300 ${
            isActive ? 'text-lumos fill-lumos' : 'text-muted-foreground'
          }`}
        />
      </motion.div>
      
      <AnimatePresence>
        {isActive && (
          <motion.p
            className="absolute bottom-0 text-lumos font-heading text-lg text-glow-gold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Lumos!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LumosSpell;
