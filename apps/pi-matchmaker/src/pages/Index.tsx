import StarBackground from "@/components/StarBackground";
import BirthdayFinder from "@/components/BirthdayFinder";
import LoveMatch from "@/components/LoveMatch";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <StarBackground />
      
      <div className="relative z-10 px-4 py-12 md:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-6xl md:text-8xl font-bold font-mono gradient-text mb-4">
            π
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 font-light">
            在无限不循环中，寻找属于你的数字
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            3.14159265358979323846...
          </p>
        </motion.div>

        {/* Cards */}
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-8">
          <BirthdayFinder />
          <LoveMatch />
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="text-center text-muted-foreground text-xs mt-16"
        >
          通过 Pi Delivery API 搜索圆周率前10万位 · 多格式智能匹配 · 纯属娱乐
        </motion.p>
      </div>
    </div>
  );
};

export default Index;
