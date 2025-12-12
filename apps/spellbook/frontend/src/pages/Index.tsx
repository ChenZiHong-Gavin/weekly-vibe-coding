import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import MagicalParticles from '@/components/MagicalParticles';
import BookNavigation from '@/components/BookNavigation';
import { bookTitles } from '@/data/spells';

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MagicalParticles />
      <BookNavigation />
      
      {/* Hero Section */}
      <header className="relative z-10 pt-24 pb-12 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1 
            className="font-heading text-5xl md:text-7xl text-primary text-glow-gold mb-4"
            animate={{ 
              textShadow: [
                '0 0 10px hsl(45 80% 55% / 0.5), 0 0 30px hsl(45 80% 55% / 0.3)',
                '0 0 20px hsl(45 80% 55% / 0.6), 0 0 50px hsl(45 80% 55% / 0.4)',
                '0 0 10px hsl(45 80% 55% / 0.5), 0 0 30px hsl(45 80% 55% / 0.3)',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            霍格沃茨
          </motion.h1>
          <h2 className="font-heading text-2xl md:text-3xl text-foreground/80 mb-6">
            魔法咒语教学
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            欢迎来到魔法世界！在这里，你将学习来自七本书籍的所有咒语。
            只需对着麦克风大声念出正确的咒语，即可施展魔法。
          </p>
        </motion.div>
      </header>

      {/* Book Navigation Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-40">
        <h3 className="font-heading text-2xl text-center text-foreground/80 mb-8">按书籍探索咒语</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(bookTitles).map(([bookNum, title], index) => (
            <motion.div
              key={bookNum}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/book/${bookNum}`}>
                <motion.div
                  className="spell-card rounded-xl p-6 magical-border text-center cursor-pointer group"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    📖
                  </div>
                  <h4 className="font-heading text-lg text-primary mb-1">第 {bookNum} 卷</h4>
                  <p className="text-sm text-muted-foreground">{title}</p>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        
      </section>
    </div>
  );
};

export default Index;
