import { motion } from "framer-motion";
import { Target, TrendingUp, Calendar, Zap } from "lucide-react";

const ProgressSection = () => {
  const progress = 7; // Current number of completed apps
  const target = 100;
  const percentage = (progress / target) * 100;

  return (
    <section id="progress" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title">
            <span className="text-foreground">挑战</span>{" "}
            <span className="text-gradient-warm">进度</span>
          </h2>
          <p className="section-subtitle">
            目标：用提示词实现一百个创意应用
          </p>
        </motion.div>

        {/* Main progress card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="clay-card p-8 md:p-12 mb-8"
        >
          {/* Progress visualization */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="stat-number text-primary">{progress}</span>
            <span className="text-4xl text-muted-foreground">/</span>
            <span className="stat-number text-muted-foreground">{target}</span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar mb-4">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: 0 }}
              whileInView={{ width: `${percentage}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>

          <p className="text-center text-muted-foreground">
            已完成 <span className="text-primary font-semibold">{percentage.toFixed(0)}%</span> 的挑战目标
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Target className="w-5 h-5 icon-orange" />, value: "100", label: "目标" },
            { icon: <TrendingUp className="w-5 h-5 icon-teal" />, value: "7", label: "已完成" },
            { icon: <Calendar className="w-5 h-5 icon-pink" />, value: "每周", label: "更新频率" },
            { icon: <Zap className="w-5 h-5 icon-purple" />, value: "5", label: "专题系列" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="clay-card p-5 text-center"
            >
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgressSection;
