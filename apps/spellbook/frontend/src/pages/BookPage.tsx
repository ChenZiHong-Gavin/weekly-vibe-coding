import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import MagicalParticles from '@/components/MagicalParticles';
import MiniSpellCard from '@/components/MiniSpellCard';
import BookNavigation from '@/components/BookNavigation';
import { PracticeDialog } from '@/components/PracticeDialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getSpellsByBook, 
  bookTitles, 
  categoryLabels, 
  Spell, 
  SpellCategory 
} from '@/data/spells';

const BookPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const bookNumber = parseInt(bookId || '1', 10);
  const { toast } = useToast();

  const [activeSpellId, setActiveSpellId] = useState<string | null>(null);
  const [voiceHash, setVoiceHash] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<SpellCategory | 'all'>('all');
  const [practicingSpell, setPracticingSpell] = useState<Spell | null>(null);

  const spells = useMemo(() => getSpellsByBook(bookNumber), [bookNumber]);

  const filteredSpells = useMemo(() => {
    if (selectedCategory === 'all') return spells;
    return spells.filter(spell => spell.category === selectedCategory);
  }, [spells, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(spells.map(s => s.category));
    return Array.from(cats) as SpellCategory[];
  }, [spells]);

  const generateVoiceHash = useCallback(() => {
    return Date.now() % 1000;
  }, []);

  

  const handlePracticeSuccess = () => {
    if (practicingSpell) {
      setVoiceHash(generateVoiceHash());
      setActiveSpellId(practicingSpell.id);
      
      toast({
        title: `✨ ${practicingSpell.latinName}!`,
        description: `${practicingSpell.chineseName} - 练习成功！`,
        variant: practicingSpell.magicType === 'black' ? 'destructive' : 'default',
      });

      setTimeout(() => setActiveSpellId(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MagicalParticles />
      <BookNavigation />

      <PracticeDialog 
        spell={practicingSpell}
        open={!!practicingSpell}
        onOpenChange={(open) => !open && setPracticingSpell(null)}
        onSuccess={handlePracticeSuccess}
      />

      {/* Hero Section */}
      <header className="relative z-10 pt-24 pb-8 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="font-heading text-4xl md:text-5xl text-primary text-glow-gold mb-2"
            animate={{
              textShadow: [
                '0 0 10px hsl(45 80% 55% / 0.5), 0 0 30px hsl(45 80% 55% / 0.3)',
                '0 0 20px hsl(45 80% 55% / 0.6), 0 0 50px hsl(45 80% 55% / 0.4)',
                '0 0 10px hsl(45 80% 55% / 0.5), 0 0 30px hsl(45 80% 55% / 0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            《哈利·波特与{bookTitles[bookNumber]}》
          </motion.h1>
          <p className="text-muted-foreground">
            本卷共收录 {spells.length} 种咒语
          </p>
        </motion.div>
      </header>

      {/* Category Filter */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 mb-6">
        <div className="flex flex-wrap gap-2 justify-center items-center">
          <FilterButton
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          >
            全部
          </FilterButton>
          {categories.map(category => (
            <FilterButton
              key={category}
              active={selectedCategory === category}
              onClick={() => {
                setSelectedCategory(category);
                setActiveSpellId(null);
              }}
            >
              {categoryLabels[category]}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* Spells Grid */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 pb-40">
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
        >
          {filteredSpells.map(spell => (
            <motion.div
              key={spell.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <MiniSpellCard
                spell={spell}
                isActive={activeSpellId === spell.id}
                voiceHash={voiceHash}
                onPractice={setPracticingSpell}
              />
            </motion.div>
          ))}
        </motion.div>

        {filteredSpells.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            该分类下暂无咒语
          </div>
        )}
      </main>

      
    </div>
  );
};

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const FilterButton = ({ active, onClick, children }: FilterButtonProps) => (
  <motion.button
    className={`px-4 py-2 rounded-full text-sm transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
    }`}
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    {children}
  </motion.button>
);

export default BookPage;
