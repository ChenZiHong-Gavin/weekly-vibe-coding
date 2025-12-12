import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SpellCardProps {
  title: string;
  latinName: string;
  description: string;
  instruction: string;
  children: ReactNode;
  accentColor: 'lumos' | 'patronus' | 'avada';
  isListening: boolean;
  isActivated: boolean;
}

const accentStyles = {
  lumos: {
    border: 'border-lumos/30',
    glow: 'shadow-[0_0_30px_hsl(45_100%_70%_/_0.2)]',
    text: 'text-lumos',
  },
  patronus: {
    border: 'border-patronus/30',
    glow: 'shadow-[0_0_30px_hsl(200_80%_70%_/_0.2)]',
    text: 'text-patronus',
  },
  avada: {
    border: 'border-avada/30',
    glow: 'shadow-[0_0_30px_hsl(120_100%_40%_/_0.2)]',
    text: 'text-avada',
  },
};

const SpellCard = ({
  title,
  latinName,
  description,
  instruction,
  children,
  accentColor,
  isListening,
  isActivated,
}: SpellCardProps) => {
  const styles = accentStyles[accentColor];

  return (
    <motion.div
      className={`spell-card rounded-xl p-6 magical-border ${styles.border} ${isActivated ? styles.glow : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-center mb-4">
        <h3 className={`font-heading text-2xl ${styles.text} mb-1`}>
          {title}
        </h3>
        <p className="font-heading text-lg text-muted-foreground italic">
          "{latinName}"
        </p>
      </div>

      <p className="text-foreground/80 text-center mb-4 text-sm">
        {description}
      </p>

      <div className="min-h-[16rem]">
        {children}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground mb-2">
          {instruction}
        </p>
        {isListening && (
          <motion.div
            className={`inline-block px-3 py-1 rounded-full text-xs ${styles.text} bg-secondary`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            正在聆听...
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default SpellCard;
