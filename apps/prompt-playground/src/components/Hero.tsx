import { motion } from "framer-motion";
import { Sparkles, Code2, Lightbulb, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

const toolBadges = [
  { name: "Cursor", icon: "💻" },
  { name: "Claude", icon: "🤖" },
  { name: "GitHub Copilot", icon: "🐙" },
  { name: "Lovable", icon: "💜" },
  { name: "Prompt", icon: "✨" },
  { name: "Vibe Coding", icon: "🎵" },
];

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating badges marquee */}
      <div className="w-full overflow-hidden mb-12 relative">
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        <div className="flex gap-4 animate-marquee w-max">
          {[...toolBadges, ...toolBadges, ...toolBadges, ...toolBadges].map((badge, index) => (
            <div key={index} className="floating-badge shrink-0">
              <span>{badge.icon}</span>
              <span className="text-foreground/80">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="text-center max-w-4xl mx-auto z-10">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
        >
          <span className="text-foreground">Weekly </span>
          <span className="text-gradient-warm">Vibe</span>
          <span className="text-foreground"> Coding</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-muted-foreground mb-8"
        >
          用提示词实现一百个创意应用
        </motion.p>

        {/* Search bar style CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl glow-orange"
            onClick={() => document.getElementById('apps')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            探索应用
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
            asChild
          >
            <a href="https://github.com/ChenZiHong-Gavin/weekly-vibe-coding" target="_blank" rel="noopener noreferrer">
              <Code2 className="w-5 h-5 mr-2" />
              查看源码
            </a>
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {[
            { icon: <Lightbulb className="w-6 h-6 icon-orange" />, number: "100", label: "目标应用" },
            { icon: <Rocket className="w-6 h-6 icon-teal" />, number: "7", label: "已完成" },
            { icon: <Code2 className="w-6 h-6 icon-pink" />, number: "5", label: "专题系列" },
            { icon: <Sparkles className="w-6 h-6 icon-purple" />, number: "∞", label: "创意想法" },
          ].map((stat, index) => (
            <div
              key={index}
              className="clay-card p-6 text-center"
            >
              <div className="flex justify-center mb-3">{stat.icon}</div>
              <div className="stat-number text-foreground">{stat.number}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
