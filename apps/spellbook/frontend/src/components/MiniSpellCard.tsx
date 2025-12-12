import { motion } from 'framer-motion';
import { Spell, categoryLabels, magicTypeLabels } from '@/data/spells';
import SpellEffects from './SpellEffects';
import { Mic } from 'lucide-react';

interface MiniSpellCardProps {
  spell: Spell;
  isActive: boolean;
  voiceHash?: number;
  onPractice?: (spell: Spell) => void;
}

const categoryColors: Record<string, string> = {
  attack: 'bg-red-500/20 text-red-400 border-red-500/30',
  defense: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  utility: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  movement: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  healing: 'bg-green-500/20 text-green-400 border-green-500/30',
  dark: 'bg-avada/20 text-avada border-avada/30',
  light: 'bg-lumos/20 text-lumos border-lumos/30',
};

const magicTypeColors: Record<string, string> = {
  white: 'text-lumos',
  grey: 'text-muted-foreground',
  black: 'text-avada',
};

const MiniSpellCard = ({ spell, isActive, voiceHash, onPractice }: MiniSpellCardProps) => {
  const effectActive = isActive;

  return (
    <motion.div
      className={`spell-card rounded-xl p-4 magical-border transition-all duration-300 ${
        effectActive ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-heading text-lg text-primary">{spell.chineseName}</h4>
          <p className="text-sm text-muted-foreground italic">"{spell.latinName}"</p>
        </div>
        <div className="flex items-center gap-2">
          {onPractice && (
            <button
              onClick={() => onPractice(spell)}
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="练习施法"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          <span className={`text-xs px-2 py-1 rounded-full border ${categoryColors[spell.category]}`}>
            {categoryLabels[spell.category]}
          </span>
        </div>
      </div>

      <div className="h-32 my-3">
        <SpellEffects spell={spell} isActive={effectActive} voiceHash={voiceHash} />
      </div>

      <p className="text-xs text-foreground/70 mb-3 line-clamp-2">{spell.description}</p>

      <div className="flex items-center justify-between text-xs">
        <span className={magicTypeColors[spell.magicType]}>
          {magicTypeLabels[spell.magicType]}
        </span>
        {effectActive && (
          <motion.span
            className="text-primary"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ✨ 施法中...
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

export default MiniSpellCard;
