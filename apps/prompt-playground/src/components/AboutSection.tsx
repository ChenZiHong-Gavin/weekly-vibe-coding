import { motion } from "framer-motion";
import { Github, BookOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const AboutSection = () => {
  return (
    <section id="about" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title">
            <span className="text-foreground">关于</span>{" "}
            <span className="text-gradient-warm">项目</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="clay-card p-8 md:p-12 text-center mb-8"
        >
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            <span className="text-foreground font-semibold">Weekly Vibe Coding</span>{" "}
            是一个实验性项目，旨在通过每周一次 Vibe Coding，使用 Prompt 来快速构建和实现有趣的想法。
            每个应用都是一个独立的子项目，探索不同的交互方式和创意可能。
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              asChild
            >
              <a
                href="https://github.com/ChenZiHong-Gavin/weekly-vibe-coding"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-5 h-5 mr-2" />
                GitHub 仓库
              </a>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-white/20 hover:bg-white/10 rounded-xl"
              asChild
            >
              <a
                href="https://github.com/ChenZiHong-Gavin/weekly-vibe-coding#readme"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                阅读文档
              </a>
            </Button>
          </div>
        </motion.div>

        {/* WeChat follow card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="clay-card p-6 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <MessageSquare className="w-5 h-5 icon-teal" />
            <span className="font-display font-semibold text-foreground">
              关注公众号
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            【无所事事的执念】- 解锁更多 coding 心得
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
