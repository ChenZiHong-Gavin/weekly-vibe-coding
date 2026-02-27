import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useState } from "react";
import AppCard from "./AppCard";
import diceVersePromptRaw from "@prompts/dice-verse.md?raw";
import piMatchmakerPromptRaw from "@prompts/pi-matchmaker.md?raw";
import airDrumMasterPromptRaw from "@prompts/air-drum-master.md?raw";

const categories = [
  {
    title: "专题一：想做点什么就做点什么",
    apps: [
      {
        title: "Dice Verse",
        description: "一个创意写作工具，让你在方格中用AI生成的骰子创作诗歌。",
        icon: "🎲",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/dice-verse/",
        status: "live" as const,
        colorClass: "icon-orange",
        prompt: diceVersePromptRaw,
      },
      {
        title: "Pi Matchmaker",
        description: "在圆周率前10万位中寻找你的生日或纪念日。",
        icon: "🥧",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/pi-matchmaker/",
        status: "live" as const,
        colorClass: "icon-pink",
        prompt: piMatchmakerPromptRaw,
      },
      {
        title: "Spin Art",
        description: "实时旋转绘画小工具，通过旋转画布轻松创作出绚丽的几何图案。",
        icon: "🎨",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/spin-art/",
        status: "live" as const,
        colorClass: "icon-teal",
        prompt: "",
      },
      {
        title: "Snap Puzzle",
        description: "上传照片变成一个简单有趣的拼图游戏。",
        icon: "🧩",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/snap-puzzle/",
        status: "live" as const,
        colorClass: "icon-pink",
        prompt: "",
      },
      {
        title: "Danmaku Magic",
        description: "一个可以让你在视频上添加动态弹幕的工具。",
        icon: "📺",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/danmaku-magic/",
        status: "live" as const,
        colorClass: "icon-purple",
        prompt: "",
      },
      {
        title: "Hairline Tracker",
        description: "追踪记录你的发际线变化，见证岁月的痕迹。",
        icon: "👱",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/hairline-tracker/",
        status: "live" as const,
        colorClass: "icon-orange",
        prompt: "",
      },
    ],
  },
  {
    title: "专题二：手势交互",
    apps: [
      {
        title: "FaceOpera",
        description: "实时AR京剧变脸，通过手势或触摸轻松切换传统脸谱。",
        icon: "🎭",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/peking-opera/",
        status: "live" as const,
        colorClass: "icon-teal",
        prompt: "",
      },
      {
        title: "Air Drum Master",
        description: "通过手势识别模拟架子鼓演奏，体验空气架子鼓的乐趣。",
        icon: "🥁",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/air-drum-master/",
        status: "live" as const,
        colorClass: "icon-orange",
        prompt: "",
      },
    ],
  },
  {
    title: "专题三：语音交互",
    apps: [
      {
        title: "Spellbook",
        description: "《哈利波特》魔法咒语练习，通过音素识别验证你的发音。",
        icon: "🪄",
        url: "https://chenzihong-gavin.github.io/weekly-vibe-coding/spellbook/",
        status: "live" as const,
        colorClass: "icon-purple",
        prompt: "",
      },
    ],
  },
  {
    title: "专题四：地理信息交互",
    apps: [
      {
        title: "敬请期待",
        description: "更多有趣的地理信息交互应用正在开发中...",
        icon: "🗺️",
        url: "#",
        status: "coming" as const,
        colorClass: "icon-pink",
        prompt: "",
      },
    ],
  },
];

const AppsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = categories.map((category) => ({
    ...category,
    apps: category.apps.filter(
      (app) =>
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.apps.length > 0);

  return (
    <section id="apps" className="py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="section-title">
            <span className="text-foreground">探索创意</span>{" "}
            <span className="text-gradient-warm">应用</span>
          </h2>
          <p className="section-subtitle mb-8">
            每周一个创意应用，用提示词探索无限可能
          </p>

          {/* Search Box */}
          <div className="relative max-w-md mx-auto mb-8">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="搜索应用..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>
        </motion.div>

        {filteredCategories.length > 0 ? (
          filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-16">
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="font-display text-xl font-semibold text-muted-foreground mb-8 flex items-center gap-3"
              >
                <span className="w-2 h-2 rounded-full bg-primary" />
                {category.title}
              </motion.h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.apps.map((app, appIndex) => (
                  <AppCard
                    key={appIndex}
                    {...app}
                    category={undefined}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            未找到相关应用
          </div>
        )}
      </div>
    </section>
  );
};

export default AppsSection;
