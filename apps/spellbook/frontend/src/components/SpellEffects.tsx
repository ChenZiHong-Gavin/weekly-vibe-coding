import { motion, AnimatePresence } from 'framer-motion';
import { Spell } from '@/data/spells';

interface SpellEffectProps {
  spell: Spell;
  isActive: boolean;
  voiceHash?: number;
}

// Patronus animals based on voice hash
const patronusAnimals = ['🦌', '🐺', '🦅', '🐻', '🦁', '🐍', '🦢', '🐬', '🦊', '🐰'];

// 每个咒语的独特效果配置
const spellEffectConfigs: Record<string, {
  icon: string;
  scene?: React.ReactNode;
  color?: string;
}> = {
  // Book 1
  'alohomora': { icon: '🚪', color: 'hsl(45 100% 60%)' },
  'petrificus-totalus': { icon: '🗿', color: 'hsl(0 0% 60%)' },
  'wingardium-leviosa': { icon: '🪶', color: 'hsl(200 80% 70%)' },
  'locomotor-mortis': { icon: '🦵', color: 'hsl(0 0% 50%)' },
  'avada-kedavra': { icon: '💀', color: 'hsl(120 100% 40%)' },
  
  // Book 2
  'lumos': { icon: '💡', color: 'hsl(45 100% 70%)' },
  'reparo': { icon: '🔧', color: 'hsl(200 60% 60%)' },
  'expelliarmus': { icon: '🪄', color: 'hsl(0 80% 60%)' },
  'rictusempra': { icon: '🤣', color: 'hsl(45 80% 60%)' },
  'tarantallegra': { icon: '💃', color: 'hsl(300 60% 60%)' },
  'finite-incantatem': { icon: '🛑', color: 'hsl(200 80% 60%)' },
  'serpensortia': { icon: '🐍', color: 'hsl(120 60% 40%)' },
  'aparecium': { icon: '👁️', color: 'hsl(280 60% 60%)' },
  'obliviate': { icon: '🧠', color: 'hsl(260 60% 60%)' },
  
  // Book 3
  'waddiwasi': { icon: '💨', color: 'hsl(200 60% 60%)' },
  'riddikulus': { icon: '🎭', color: 'hsl(45 80% 60%)' },
  'impervius': { icon: '☔', color: 'hsl(200 80% 60%)' },
  'dissendium': { icon: '🚪', color: 'hsl(30 60% 50%)' },
  'mobiliarbus': { icon: '🌲', color: 'hsl(120 40% 40%)' },
  'expecto-patronum': { icon: '🦌', color: 'hsl(200 80% 70%)' },
  'nox': { icon: '🌑', color: 'hsl(240 20% 20%)' },
  
  // Book 4
  'incendio': { icon: '🔥', color: 'hsl(20 100% 50%)' },
  'accio': { icon: '🧲', color: 'hsl(280 60% 60%)' },
  'sonorus': { icon: '📢', color: 'hsl(45 80% 60%)' },
  'quietus': { icon: '🔇', color: 'hsl(200 20% 40%)' },
  'morsmordre': { icon: '💀', color: 'hsl(120 100% 30%)' },
  'stupefy': { icon: '💫', color: 'hsl(0 80% 50%)' },
  'enervate': { icon: '⚡', color: 'hsl(45 100% 60%)' },
  'prior-incantato': { icon: '👻', color: 'hsl(280 40% 50%)' },
  'deletrius': { icon: '💨', color: 'hsl(0 0% 60%)' },
  'engorgio': { icon: '📈', color: 'hsl(120 60% 50%)' },
  'crucio': { icon: '⚡', color: 'hsl(0 100% 40%)' },
  'furnunculus': { icon: '🌋', color: 'hsl(15 100% 50%)' },
  'densaugeo': { icon: '🦷', color: 'hsl(0 0% 90%)' },
  'orchideous': { icon: '🌸', color: 'hsl(330 80% 70%)' },
  'avis': { icon: '🐦', color: 'hsl(200 60% 60%)' },
  'diffindo': { icon: '✂️', color: 'hsl(0 80% 50%)' },
  'relashio': { icon: '✨', color: 'hsl(30 100% 60%)' },
  'point-me': { icon: '🧭', color: 'hsl(200 60% 50%)' },
  'impedimenta': { icon: '🛡️', color: 'hsl(200 60% 60%)' },
  'reducio': { icon: '📉', color: 'hsl(280 60% 50%)' },
  'reducto': { icon: '💥', color: 'hsl(30 100% 50%)' },
  
  // Book 5
  'portus': { icon: '🌀', color: 'hsl(200 80% 60%)' },
  'legilimens': { icon: '🧠', color: 'hsl(280 60% 60%)' },
  'protego': { icon: '🛡️', color: 'hsl(200 80% 70%)' },
  'evanesco': { icon: '💨', color: 'hsl(280 40% 60%)' },
  'scourgify': { icon: '🧹', color: 'hsl(45 60% 50%)' },
  'flagrate': { icon: '✖️', color: 'hsl(20 100% 50%)' },
  'colloportus': { icon: '🔒', color: 'hsl(200 40% 40%)' },
  'silencio': { icon: '🤫', color: 'hsl(260 40% 50%)' },
  
  // Book 6
  'levicorpus': { icon: '🙃', color: 'hsl(280 60% 60%)' },
  'liberacorpus': { icon: '🙂', color: 'hsl(120 60% 50%)' },
  'sectumsempra': { icon: '🗡️', color: 'hsl(0 100% 40%)' },
  'aguamenti': { icon: '💧', color: 'hsl(200 80% 60%)' },
  'tergeo': { icon: '✨', color: 'hsl(45 80% 70%)' },
  
  // Book 7
  'descendo': { icon: '⬇️', color: 'hsl(30 60% 40%)' },
  'deprimo': { icon: '🕳️', color: 'hsl(30 40% 30%)' },
  'expulso': { icon: '💣', color: 'hsl(30 100% 50%)' },
  'homenum-revelio': { icon: '👤', color: 'hsl(200 60% 60%)' },
  'piertotum-locomotor': { icon: '🗿', color: 'hsl(30 30% 50%)' },
  'protego-horribilis': { icon: '🛡️', color: 'hsl(200 100% 70%)' },
  'protego-totalum': { icon: '🔮', color: 'hsl(200 80% 60%)' },
  'repello-muggletum': { icon: '🚫', color: 'hsl(0 60% 50%)' },
  'salvio-hexia': { icon: '✨', color: 'hsl(45 80% 60%)' },
};

const SpellEffects = ({ spell, isActive, voiceHash = 0 }: SpellEffectProps) => {
  const config = spellEffectConfigs[spell.id] || { icon: '✨', color: 'hsl(280 60% 60%)' };
  
  if (!isActive) {
    return (
      <div className="flex items-center justify-center h-full min-h-[10rem] text-muted-foreground/50">
        <span className="text-4xl">🪄</span>
      </div>
    );
  }

  const renderEffect = () => {
    // 根据spell.id渲染特定效果
    switch (spell.id) {
      // ===== BOOK 1 =====
      case 'alohomora':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 门打开动画 */}
            <motion.div
              className="absolute w-20 h-28 rounded-t-lg border-4 border-amber-600 bg-amber-800/50"
              style={{ transformOrigin: 'left center', perspective: '500px' }}
              animate={{
                rotateY: [0, -80, -80, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <motion.div 
                className="absolute right-2 top-1/2 w-2 h-2 rounded-full bg-yellow-400"
                animate={{ 
                  boxShadow: ['0 0 5px hsl(45 100% 60%)', '0 0 15px hsl(45 100% 60%)', '0 0 5px hsl(45 100% 60%)']
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </motion.div>
            <motion.span
              className="absolute text-3xl"
              style={{ right: '-20px', top: '-10px' }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ✨
            </motion.span>
          </motion.div>
        );

      case 'petrificus-totalus':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 人变成石头 */}
            <motion.div className="relative">
              <motion.span
                className="text-6xl"
                animate={{
                  filter: [
                    'grayscale(0%) brightness(1)',
                    'grayscale(100%) brightness(0.7)',
                    'grayscale(100%) brightness(0.7)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              >
                🧍
              </motion.span>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              >
                <span className="text-6xl" style={{ filter: 'grayscale(100%)' }}>🗿</span>
              </motion.div>
            </motion.div>
            {/* 石化光束 */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-8 bg-gradient-to-t from-gray-400 to-transparent"
                style={{ transform: `rotate(${i * 45}deg)`, transformOrigin: 'bottom center' }}
                animate={{ scaleY: [0, 1, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        );

      case 'wingardium-leviosa':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{
                y: [-30, 30, -30],
                rotate: [0, 15, -15, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              🪶
            </motion.span>
            {/* 漂浮粒子 */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{ 
                  background: 'radial-gradient(circle, hsl(200 80% 70%), transparent)',
                  left: `${30 + (i % 4) * 15}%`,
                }}
                animate={{
                  y: [20, -40, 20],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        );

      case 'locomotor-mortis':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 腿被锁住 */}
            <motion.div className="relative">
              <motion.span className="text-5xl">🦵</motion.span>
              <motion.span 
                className="text-5xl absolute left-4"
                style={{ transform: 'scaleX(-1)' }}
              >
                🦵
              </motion.span>
              {/* 锁链效果 */}
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-gray-500"
                animate={{
                  scaleX: [0.5, 1, 0.5],
                  boxShadow: ['0 0 5px gray', '0 0 15px gray', '0 0 5px gray'],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
            <motion.span
              className="absolute text-2xl top-0"
              animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⛓️
            </motion.span>
          </motion.div>
        );

      case 'avada-kedavra':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 死亡绿光 */}
            <motion.div
              className="absolute inset-0 bg-avada/30 rounded-lg"
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
            <motion.span
              className="text-6xl relative z-10"
              animate={{
                filter: [
                  'drop-shadow(0 0 10px hsl(120 100% 40%))',
                  'drop-shadow(0 0 40px hsl(120 100% 40%))',
                  'drop-shadow(0 0 10px hsl(120 100% 40%))',
                ],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              💀
            </motion.span>
            {/* 闪电 */}
            <motion.span
              className="absolute text-4xl"
              style={{ top: '-10px', right: '20%' }}
              animate={{ scale: [0, 2, 0], opacity: [0, 1, 0], rotate: [0, 15, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ⚡
            </motion.span>
            {/* 绿色光束 */}
            <motion.div
              className="absolute w-2 h-20 bg-gradient-to-t from-avada to-transparent rounded-full"
              style={{ bottom: '60%' }}
              animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
          </motion.div>
        );

      // ===== BOOK 2 =====
      case 'lumos':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.div
              className="w-24 h-24 rounded-full bg-lumos"
              animate={{
                boxShadow: [
                  '0 0 20px hsl(45 100% 70%), 0 0 40px hsl(45 100% 70% / 0.5)',
                  '0 0 60px hsl(45 100% 70%), 0 0 100px hsl(45 100% 70% / 0.8)',
                  '0 0 20px hsl(45 100% 70%), 0 0 40px hsl(45 100% 70% / 0.5)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="absolute text-5xl">💡</span>
            {/* 光线 */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-12 bg-gradient-to-t from-lumos to-transparent"
                style={{ transform: `rotate(${i * 45}deg)`, transformOrigin: 'bottom center' }}
                animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        );

      case 'reparo':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 破碎的眼镜修复 */}
            <motion.div className="relative">
              <motion.span className="text-5xl">👓</motion.span>
              {/* 修复光芒 */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-xl"
                    style={{ transform: `rotate(${i * 60}deg) translateY(-35px)` }}
                    animate={{ scale: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  >
                    ✨
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        );

      case 'expelliarmus':
        return (
          <motion.div className="relative flex items-center justify-center overflow-hidden">
            {/* 魔杖被缴械飞出 */}
            <motion.span
              className="text-5xl"
              animate={{
                rotate: [0, 720],
                x: [0, 80],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.5 }}
            >
              🪄
            </motion.span>
            {/* 红色光束 */}
            <motion.div
              className="absolute left-0 w-20 h-2 bg-gradient-to-r from-red-500 to-transparent rounded-full"
              animate={{ scaleX: [0, 1, 0], x: [-20, 40, 100] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.1 }}
            />
          </motion.div>
        );

      case 'rictusempra':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ rotate: [-10, 10, -10] }}
              transition={{ duration: 0.15, repeat: Infinity }}
            >
              🤣
            </motion.span>
            {/* 笑声气泡 */}
            {['哈', '哈', '哈'].map((text, i) => (
              <motion.span
                key={i}
                className="absolute text-lg font-bold text-yellow-400"
                style={{ left: `${20 + i * 25}%` }}
                animate={{ y: [0, -40], opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.3 }}
              >
                {text}
              </motion.span>
            ))}
          </motion.div>
        );

      case 'tarantallegra':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{
                y: [0, -25, 0],
                rotate: [-15, 15, -15],
              }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              💃
            </motion.span>
            {/* 音符 */}
            {['🎵', '🎶'].map((note, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl"
                style={{ left: i === 0 ? '20%' : '70%' }}
                animate={{ y: [0, -30], opacity: [1, 0], rotate: [0, 20] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.5 }}
              >
                {note}
              </motion.span>
            ))}
          </motion.div>
        );

      case 'finite-incantatem':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 咒语解除波纹 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-20 h-20 rounded-full border-2 border-blue-400"
                animate={{
                  scale: [0.5, 2],
                  opacity: [0.8, 0],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
            <motion.span className="text-5xl relative z-10">🛑</motion.span>
          </motion.div>
        );

      case 'serpensortia':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{
                x: [-15, 15, -15],
                rotate: [-5, 5, -5],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              🐍
            </motion.span>
            {/* 蛇从魔杖出现 */}
            <motion.div
              className="absolute bottom-0 w-2 h-10 bg-gradient-to-t from-green-600 to-transparent rounded-full"
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'aparecium':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 隐形墨水显现 */}
            <motion.div className="relative">
              <motion.div
                className="w-16 h-20 bg-amber-100 rounded border-2 border-amber-300"
                style={{ position: 'relative' }}
              >
                {/* 显现的文字 */}
                <motion.div
                  className="absolute inset-0 flex flex-col items-center justify-center text-amber-800 text-xs font-bold"
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span>秘密</span>
                  <span>文字</span>
                </motion.div>
              </motion.div>
            </motion.div>
            <motion.span
              className="absolute text-3xl top-0 right-0"
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              👁️
            </motion.span>
          </motion.div>
        );

      case 'obliviate':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-6xl">🧠</motion.span>
            {/* 记忆碎片飘走 */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-purple-400/60 rounded-full"
                animate={{
                  x: [(i - 2) * 10, (i - 2) * 40],
                  y: [0, -50],
                  opacity: [1, 0],
                  scale: [1, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        );

      // ===== BOOK 3 =====
      case 'waddiwasi':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 物体像子弹飞出 */}
            <motion.span
              className="text-4xl"
              animate={{
                x: [-30, 80],
                rotate: [0, 720],
                scale: [1, 0.5],
              }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }}
            >
              🫧
            </motion.span>
            <motion.div
              className="absolute left-0 w-16 h-1 bg-gradient-to-r from-blue-400 to-transparent"
              animate={{ scaleX: [0, 1, 0] }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.7 }}
            />
          </motion.div>
        );

      case 'riddikulus':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 博格特变形 */}
            <motion.div className="relative">
              <motion.span
                className="text-6xl"
                animate={{
                  scale: [1, 1.2, 0.8, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                🎭
              </motion.span>
            </motion.div>
            <motion.span
              className="absolute text-2xl top-0"
              animate={{ y: [0, -20], opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              😂
            </motion.span>
          </motion.div>
        );

      case 'impervius':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 防水护罩 */}
            <motion.div
              className="absolute w-24 h-24 rounded-full border-2 border-blue-400/50"
              animate={{
                boxShadow: [
                  '0 0 10px hsl(200 80% 60% / 0.3)',
                  '0 0 25px hsl(200 80% 60% / 0.6)',
                  '0 0 10px hsl(200 80% 60% / 0.3)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-5xl">☔</span>
            {/* 水滴弹开 */}
            {[...Array(4)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-xl"
                style={{ top: '-10px', left: `${20 + i * 20}%` }}
                animate={{
                  y: [0, 40, 60],
                  opacity: [0, 1, 0],
                  x: [(i - 1.5) * 5, (i - 1.5) * 20],
                }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              >
                💧
              </motion.span>
            ))}
          </motion.div>
        );

      case 'dissendium':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 密道打开 */}
            <motion.div className="relative">
              <motion.span className="text-5xl">🗿</motion.span>
              {/* 密道入口 */}
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0 bg-black rounded-t-lg overflow-hidden"
                animate={{ height: [0, 20, 20, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            <motion.span
              className="absolute text-xl"
              animate={{ opacity: [0, 1, 0], y: [0, 10] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
            >
              ↘️
            </motion.span>
          </motion.div>
        );

      case 'mobiliarbus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{
                x: [-20, 20, -20],
                y: [0, -5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🌲
            </motion.span>
            {/* 魔法轨迹 */}
            <motion.div
              className="absolute w-20 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'expecto-patronum':
        const animal = patronusAnimals[voiceHash % patronusAnimals.length];
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.div
              className="absolute w-44 h-44 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(200 80% 70% / 0.5), transparent)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.span
              className="text-8xl relative z-10"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.8 }}
              style={{
                filter: 'drop-shadow(0 0 30px hsl(200 80% 70%))',
              }}
            >
              {animal}
            </motion.span>
            {/* 光芒 */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-16 bg-gradient-to-t from-patronus to-transparent"
                style={{ transform: `rotate(${i * 30}deg)`, transformOrigin: 'bottom center' }}
                animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        );

      case 'nox':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 光芒熄灭 */}
            <motion.div
              className="w-20 h-20 rounded-full bg-gray-800"
              animate={{
                boxShadow: [
                  '0 0 30px hsl(45 100% 70%)',
                  '0 0 10px hsl(45 50% 30%)',
                  '0 0 0px transparent',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.span
              className="absolute text-4xl"
              animate={{ opacity: [1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🌑
            </motion.span>
          </motion.div>
        );

      // ===== BOOK 4 =====
      case 'incendio':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              <span className="text-6xl">🔥</span>
            </motion.div>
            {/* 火花 */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-orange-400 rounded-full"
                animate={{
                  y: [0, -40],
                  x: [(i - 3) * 10, (i - 3) * 20],
                  opacity: [1, 0],
                }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        );

      case 'accio':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 物品飞来 */}
            <motion.span
              className="text-5xl"
              animate={{
                x: [80, 0],
                scale: [0.3, 1],
                opacity: [0, 1],
              }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
            >
              🧹
            </motion.span>
            {/* 魔法轨迹 */}
            <motion.div
              className="absolute w-24 h-1 bg-gradient-to-l from-purple-500 to-transparent"
              animate={{ scaleX: [1, 0], x: [40, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.7 }}
            />
          </motion.div>
        );

      case 'sonorus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-6xl">📢</motion.span>
            {/* 声波 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-8 h-16 border-r-4 border-yellow-400/50 rounded-r-full"
                style={{ left: '55%' }}
                animate={{
                  scale: [0.5, 1.5],
                  opacity: [0.8, 0],
                  x: [0, 30],
                }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </motion.div>
        );

      case 'quietus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-6xl">🔇</motion.span>
            {/* 声音消失 */}
            <motion.div
              className="absolute w-full h-full flex items-center justify-center"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-3xl line-through decoration-2 decoration-red-500">🔊</span>
            </motion.div>
          </motion.div>
        );

      case 'morsmordre':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 黑魔标记 */}
            <motion.div
              className="relative"
              animate={{
                filter: [
                  'drop-shadow(0 0 10px hsl(120 100% 30%))',
                  'drop-shadow(0 0 30px hsl(120 100% 30%))',
                  'drop-shadow(0 0 10px hsl(120 100% 30%))',
                ],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <motion.span className="text-6xl">💀</motion.span>
              <motion.span
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-4xl"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                🐍
              </motion.span>
            </motion.div>
            {/* 绿色烟雾 */}
            <motion.div
              className="absolute inset-0 bg-green-900/30 rounded-full"
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'stupefy':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 红色昏迷光 */}
            <motion.div
              className="absolute w-28 h-28 rounded-full bg-red-500/40"
              animate={{
                scale: [0.5, 1.5, 0.5],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.span className="text-5xl">💫</motion.span>
            {/* 红色光束 */}
            <motion.div
              className="absolute w-20 h-2 bg-gradient-to-r from-red-500 to-transparent rounded-full"
              animate={{ scaleX: [0, 1, 0], x: [-20, 30] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'enervate':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 唤醒效果 */}
            <motion.span
              className="text-6xl"
              animate={{ scale: [0.8, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⚡
            </motion.span>
            <motion.span
              className="absolute text-3xl"
              animate={{ y: [10, -10], opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              👁️
            </motion.span>
          </motion.div>
        );

      case 'prior-incantato':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 魔杖回放 */}
            <motion.span className="text-5xl">🪄</motion.span>
            <motion.div
              className="absolute"
              animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-4xl">👻</span>
            </motion.div>
          </motion.div>
        );

      case 'deletrius':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 影像消失 */}
            <motion.div
              animate={{ opacity: [1, 0], scale: [1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-5xl">👻</span>
            </motion.div>
            <motion.span
              className="absolute text-3xl"
              animate={{ opacity: [0, 1, 0], y: [-10, 10] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              💨
            </motion.span>
          </motion.div>
        );

      case 'engorgio':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-4xl"
              animate={{ scale: [1, 2.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎃
            </motion.span>
          </motion.div>
        );

      case 'crucio':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 酷刑咒 - 红色闪电 */}
            <motion.div
              className="absolute inset-0 bg-red-900/30 rounded-lg"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.2, repeat: Infinity }}
            />
            <motion.span
              className="text-6xl"
              animate={{
                filter: [
                  'drop-shadow(0 0 10px hsl(0 100% 40%))',
                  'drop-shadow(0 0 30px hsl(0 100% 40%))',
                  'drop-shadow(0 0 10px hsl(0 100% 40%))',
                ],
              }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              ⚡
            </motion.span>
            {/* 痛苦符号 */}
            <motion.span
              className="absolute text-2xl top-0"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              💢
            </motion.span>
          </motion.div>
        );

      case 'furnunculus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              🌋
            </motion.span>
            {/* 岩浆飞溅 */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-orange-500 rounded-full"
                animate={{
                  y: [0, -30, 10],
                  x: [(i - 2) * 15, (i - 2) * 25],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        );

      case 'densaugeo':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ scaleY: [1, 2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🦷
            </motion.span>
            <motion.span
              className="absolute text-2xl -bottom-2"
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ↓
            </motion.span>
          </motion.div>
        );

      case 'orchideous':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
            >
              <span className="text-6xl">🌸</span>
            </motion.div>
            {['🌺', '🌷', '🌹', '🌻', '💐'].map((flower, i) => (
              <motion.span
                key={i}
                className="absolute text-3xl"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 1],
                  opacity: [0, 1, 1],
                  x: Math.cos((i * 72 * Math.PI) / 180) * 45,
                  y: Math.sin((i * 72 * Math.PI) / 180) * 45,
                }}
                transition={{ delay: 0.1 * i + 0.3, duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
              >
                {flower}
              </motion.span>
            ))}
          </motion.div>
        );

      case 'avis':
        return (
          <motion.div className="relative flex items-center justify-center overflow-hidden">
            {['🐦', '🕊️', '🐤', '🦜', '🦆'].map((bird, i) => (
              <motion.span
                key={i}
                className="absolute text-4xl"
                animate={{
                  x: [0, (i % 2 ? 1 : -1) * 120],
                  y: [0, -40 + i * 15, 10],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.25,
                }}
              >
                {bird}
              </motion.span>
            ))}
            {/* 爆炸效果 */}
            <motion.span
              className="text-3xl"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              💥
            </motion.span>
          </motion.div>
        );

      case 'diffindo':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 切割效果 */}
            <motion.div
              className="absolute w-32 h-1 bg-red-500"
              animate={{
                scaleX: [0, 1],
                opacity: [1, 0],
                rotate: -30,
              }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.6 }}
            />
            <motion.div
              className="absolute w-32 h-1 bg-red-500"
              animate={{
                scaleX: [0, 1],
                opacity: [1, 0],
                rotate: 30,
              }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.6, delay: 0.2 }}
            />
            <span className="text-5xl">✂️</span>
          </motion.div>
        );

      case 'relashio':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 火花释放 */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                animate={{
                  x: [0, Math.cos((i * 45 * Math.PI) / 180) * 50],
                  y: [0, Math.sin((i * 45 * Math.PI) / 180) * 50],
                  opacity: [1, 0],
                  scale: [1, 0.5],
                }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
              />
            ))}
            <motion.span
              className="text-5xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              ✨
            </motion.span>
          </motion.div>
        );

      case 'point-me':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ rotate: [0, 360, 360, 0] }}
              transition={{ duration: 2, repeat: Infinity, times: [0, 0.3, 0.7, 1] }}
            >
              🧭
            </motion.span>
            <motion.span
              className="absolute text-2xl -top-2"
              animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⬆️
            </motion.span>
          </motion.div>
        );

      case 'impedimenta':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 障碍墙 */}
            <motion.div
              className="w-28 h-20 rounded-lg border-4 border-blue-400/60"
              animate={{
                boxShadow: [
                  '0 0 10px hsl(200 80% 60% / 0.3)',
                  '0 0 30px hsl(200 80% 60% / 0.6)',
                  '0 0 10px hsl(200 80% 60% / 0.3)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="absolute text-4xl">🛡️</span>
          </motion.div>
        );

      case 'reducio':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ scale: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              📦
            </motion.span>
            <motion.span
              className="absolute text-2xl"
              animate={{ scale: [1.5, 0.5, 1.5], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ↘️
            </motion.span>
          </motion.div>
        );

      case 'reducto':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{
                scale: [1, 1.5, 0],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              💥
            </motion.span>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-4 h-4 bg-orange-500 rounded"
                style={{ rotate: `${i * 45}deg` }}
                animate={{
                  x: [0, Math.cos((i * 45 * Math.PI) / 180) * 60],
                  y: [0, Math.sin((i * 45 * Math.PI) / 180) * 60],
                  opacity: [1, 0],
                  rotate: [0, 180],
                }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.05 * i }}
              />
            ))}
          </motion.div>
        );

      // ===== BOOK 5 =====
      case 'portus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              🌀
            </motion.span>
            <motion.div
              className="absolute w-20 h-20 rounded-full border-2 border-blue-400/50"
              animate={{ scale: [0.5, 1.5, 0.5], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'legilimens':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-6xl">🧠</motion.span>
            {/* 读心波纹 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-16 h-16 rounded-full border-2 border-purple-400/50"
                animate={{
                  scale: [0.5, 2],
                  opacity: [0.8, 0],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
            <motion.span
              className="absolute text-3xl"
              animate={{ opacity: [0, 1, 0], y: [10, -20] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              👁️
            </motion.span>
          </motion.div>
        );

      case 'protego':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.div
              className="absolute w-36 h-36 rounded-full border-4 border-patronus"
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.3, 0.8, 0.3],
                borderWidth: ['2px', '6px', '2px'],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-28 h-28 rounded-full border-2 border-patronus/50"
              animate={{
                scale: [1, 0.8, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <span className="text-5xl">🛡️</span>
          </motion.div>
        );

      case 'evanesco':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ opacity: [1, 0], scale: [1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              📜
            </motion.span>
            <motion.span
              className="absolute text-3xl"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              💨
            </motion.span>
          </motion.div>
        );

      case 'scourgify':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ rotate: [-15, 15, -15], x: [-10, 10, -10] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              🧹
            </motion.span>
            {/* 清洁光芒 */}
            <motion.div
              className="absolute"
              animate={{ x: [-20, 20], opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <span className="text-2xl">✨</span>
            </motion.div>
          </motion.div>
        );

      case 'flagrate':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 火焰X标记 */}
            <motion.div
              className="absolute w-16 h-1 bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 rounded-full"
              style={{ rotate: '45deg' }}
              animate={{
                boxShadow: [
                  '0 0 5px orange',
                  '0 0 15px orange',
                  '0 0 5px orange',
                ],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-16 h-1 bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 rounded-full"
              style={{ rotate: '-45deg' }}
              animate={{
                boxShadow: [
                  '0 0 5px orange',
                  '0 0 15px orange',
                  '0 0 5px orange',
                ],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'colloportus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-6xl">🚪</motion.span>
            <motion.span
              className="absolute text-4xl"
              animate={{
                scale: [0.5, 1.2, 1],
                opacity: [0, 1, 1],
              }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
            >
              🔒
            </motion.span>
          </motion.div>
        );

      case 'silencio':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              🤫
            </motion.span>
            {/* 声波消失 */}
            <motion.div
              className="absolute right-0"
              animate={{ opacity: [1, 0], x: [0, 20] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <span className="text-2xl">🔇</span>
            </motion.div>
          </motion.div>
        );

      // ===== BOOK 6 =====
      case 'levicorpus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              style={{ transform: 'rotate(180deg)' }}
              animate={{ y: [20, -10, 20] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🧍
            </motion.span>
            {/* 魔法绳 */}
            <motion.div
              className="absolute w-1 h-16 bg-purple-400"
              style={{ top: '-20px' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'liberacorpus':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{
                rotate: [180, 0],
                y: [-20, 10],
              }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
            >
              🧍
            </motion.span>
          </motion.div>
        );

      case 'sectumsempra':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 无形剑切割 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-24 h-0.5 bg-red-500"
                style={{ rotate: `${-30 + i * 30}deg` }}
                animate={{
                  scaleX: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <motion.span
              className="text-5xl"
              animate={{
                filter: [
                  'drop-shadow(0 0 5px red)',
                  'drop-shadow(0 0 15px red)',
                  'drop-shadow(0 0 5px red)',
                ],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              🗡️
            </motion.span>
          </motion.div>
        );

      case 'aguamenti':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              💧
            </motion.span>
            {/* 水流 */}
            <motion.div
              className="absolute bottom-0 w-20 h-8 bg-gradient-to-t from-blue-400/60 to-transparent rounded-t-full"
              animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          </motion.div>
        );

      case 'tergeo':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-5xl">✨</motion.span>
            {/* 污渍消失 */}
            <motion.div
              className="absolute"
              animate={{ opacity: [1, 0], scale: [1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className="text-3xl">💩</span>
            </motion.div>
            <motion.div
              className="absolute"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              {[...Array(4)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute text-xl"
                  style={{ transform: `rotate(${i * 90}deg) translateY(-30px)` }}
                >
                  ✨
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        );

      // ===== BOOK 7 =====
      case 'descendo':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.div className="relative">
              <motion.span className="text-5xl">🧱</motion.span>
              <motion.span
                className="absolute text-3xl top-0"
                animate={{ y: [0, 30], opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                ⬇️
              </motion.span>
            </motion.div>
          </motion.div>
        );

      case 'deprimo':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-6xl">🕳️</motion.span>
            {/* 碎片掉落 */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-amber-600 rounded"
                animate={{
                  y: [0, 50],
                  opacity: [1, 0],
                  rotate: [0, 180],
                }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                style={{ left: `${20 + i * 15}%` }}
              />
            ))}
          </motion.div>
        );

      case 'expulso':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ scale: [1, 1.5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              💣
            </motion.span>
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-orange-400 rounded-full"
                animate={{
                  x: [0, Math.cos((i * 36 * Math.PI) / 180) * 70],
                  y: [0, Math.sin((i * 36 * Math.PI) / 180) * 70],
                  opacity: [1, 0],
                }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.03 * i }}
              />
            ))}
          </motion.div>
        );

      case 'homenum-revelio':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 人形显现波纹 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-20 h-20 rounded-full border-2 border-blue-400/50"
                animate={{
                  scale: [0.5, 2],
                  opacity: [0.8, 0],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
            <motion.span
              className="text-5xl"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              👤
            </motion.span>
          </motion.div>
        );

      case 'piertotum-locomotor':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{
                x: [-10, 10, -10],
                rotate: [-5, 5, -5],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              🗿
            </motion.span>
            {/* 脚步 */}
            <motion.span
              className="absolute bottom-0 text-2xl"
              animate={{ opacity: [0, 1, 0], y: [0, 5, 0] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              👟
            </motion.span>
          </motion.div>
        );

      case 'protego-horribilis':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 强大护盾 */}
            <motion.div
              className="absolute w-40 h-40 rounded-full border-4 border-blue-300"
              animate={{
                scale: [0.9, 1.1, 0.9],
                boxShadow: [
                  '0 0 20px hsl(200 100% 70% / 0.5)',
                  '0 0 50px hsl(200 100% 70% / 0.8)',
                  '0 0 20px hsl(200 100% 70% / 0.5)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-32 h-32 rounded-full border-2 border-blue-200/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute text-xl"
                  style={{ transform: `rotate(${i * 45}deg) translateY(-55px)` }}
                >
                  ✨
                </motion.span>
              ))}
            </motion.div>
            <span className="text-5xl">🛡️</span>
          </motion.div>
        );

      case 'protego-totalum':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.div
              className="absolute w-36 h-36 rounded-full bg-blue-400/20"
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.span
              className="text-6xl"
              animate={{
                filter: [
                  'drop-shadow(0 0 10px hsl(200 80% 60%))',
                  'drop-shadow(0 0 25px hsl(200 80% 60%))',
                  'drop-shadow(0 0 10px hsl(200 80% 60%))',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🔮
            </motion.span>
          </motion.div>
        );

      case 'repello-muggletum':
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span className="text-5xl">🚫</motion.span>
            <motion.span
              className="absolute text-3xl"
              animate={{
                x: [0, 30, 60],
                opacity: [1, 0.5, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🧑
            </motion.span>
          </motion.div>
        );

      case 'salvio-hexia':
        return (
          <motion.div className="relative flex items-center justify-center">
            {/* 防护魔法 */}
            <motion.div
              className="absolute w-32 h-32 rounded-lg border-2 border-yellow-400/50"
              animate={{
                borderColor: [
                  'hsl(45 80% 60% / 0.5)',
                  'hsl(45 80% 60% / 1)',
                  'hsl(45 80% 60% / 0.5)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.span className="text-5xl">✨</motion.span>
            {/* 弹开的咒语 */}
            <motion.span
              className="absolute text-2xl"
              animate={{
                x: [-30, 30],
                y: [0, -20, 0],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⚡
            </motion.span>
          </motion.div>
        );

      default:
        // 默认效果
        return (
          <motion.div className="relative flex items-center justify-center">
            <motion.span
              className="text-6xl"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 10px ${config.color})` }}
            >
              {config.icon}
            </motion.span>
            <motion.div
              className="absolute"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className="text-3xl">✨</span>
            </motion.div>
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="flex items-center justify-center h-full min-h-[10rem]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {renderEffect()}
      </motion.div>
    </AnimatePresence>
  );
};

export default SpellEffects;
