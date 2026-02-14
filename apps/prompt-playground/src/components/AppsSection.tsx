import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useState } from "react";
import AppCard from "./AppCard";

const diceVersePrompt = `# Prompt for Dice-verse

## 第一轮
\`\`\`
我需要一个极简的文本编辑器，用于创作诗歌。

页面是一个9X9的网格。

第一阶段时，用户可以在网格中设置数量，代表这个格子中字的数量。

第二阶段时，大语言模型会根据用户的设置，为每个网格自动生成一个骰子，骰子的每个面都是对应字数的词，可以当作诗的一部分。

最后，用户可以通过转动每个骰子，来调整诗歌。
\`\`\`

## 第二轮
\`\`\`
1. 我想要把格子变成5X5
2. 我想要调整数量的方式更优雅一点，现在有点丑
3. 我需要限制每个格子的最大字数是4
4. 我需要增加一个标题栏，标题也是生成的骰子，但是一开始不需要自己设置字数
5. 我需要把页面调整的更加优雅美观
6. 一开始设置的可以不用显示字数，而是用未知符号代替，有几个字就是几个未知符号
7. 骰子我想要真实一点的，骰子转动的方向是自己控制的
\`\`\`

## 第三轮
\`\`\`
1. 标题栏不需要8个格子，一个格子就行，最后生成的也不需要是同样字数的
2. 可以把问号换成随机的特殊字符
3. 把格子上面悬浮的左键前进右键后退去掉，保留页面底部的就行
4. 导出诗歌时需要保留标题和换行，复制之后是诗歌的格式
\`\`\`

## 第四轮
\`\`\`
1. 标题的骰子里面的内容一开始留空就行，后面生成的时候才会确定字数
2. 特殊符号如果为4个的话可以两个一行，分两行
\`\`\`
`;

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
        prompt: diceVersePrompt,
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
