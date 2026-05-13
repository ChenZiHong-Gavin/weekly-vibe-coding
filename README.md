# weekly-vibe-coding

![Project Status: Active](https://img.shields.io/badge/status-active-success.svg) ![Progress](https://img.shields.io/badge/Ideas-16%2F100-blue)

用提示词实现一百个idea。

## 目录

- [weekly-vibe-coding](#weekly-vibe-coding)
  - [目录](#目录)
  - [关于项目](#关于项目)
    - [近期文章](#近期文章)
  - [已实现的应用](#已实现的应用)
    - [专题零：创意原点](#专题零创意原点)
    - [专题一：想做点什么就做点什么](#专题一想做点什么就做点什么)
    - [专题二：手势交互](#专题二手势交互)
    - [专题三：语音交互](#专题三语音交互)
    - [专题四：地理信息交互](#专题四地理信息交互)
    - [专题五：有审美的网站设计](#专题五有审美的网站设计)
    - [专题六：数学小工具](#专题六数学小工具)
    - [专题七：学习必备](#专题七学习必备)
    - [专题八：抽象排序算法](#专题八抽象排序算法)
    - [专题九：假装是真的](#专题九假装是真的)
  - [如何运行](#如何运行)
  - [贡献](#贡献)
  - [License](#license)

## 关于项目

`weekly-vibe-coding` 是一个实验性项目，旨在通过每周一次Vibe Coding，使用Prompt来快速构建和实现有趣的想法。

每个应用都是一个独立的子项目，存放在 `apps` 目录下。

欢迎关注我的公众号：【无所事事的执念】，解锁一些coding心得。

### 近期文章
1. 2025年11月23日 [快停止Vibe Gambling，因为它正在毁掉你](https://mp.weixin.qq.com/s/6qSUykpcpV9Qzjf19CqxaA)


## 已实现的应用

### 专题零：Prompt Playground

0. **[Prompt Playground](https://chenzihong-gavin.github.io/weekly-vibe-coding/prompt-playground/)** (`apps/prompt-playground`)
    - Weekly Vibe Coding 的项目展示主页，汇集了所有创意应用的展示平台。
    - [Prompt](https://github.com/ChenZiHong-Gavin/weekly-vibe-coding/blob/main/prompts/prompt-playground.md)

       <img width="400" alt="image" src="https://github.com/user-attachments/assets/64878ac4-8ef9-4e1b-b5e6-db0ac40ba05e" />


### 专题一：想做点什么就做点什么
1.  **[Dice Verse](https://chenzihong-gavin.github.io/weekly-vibe-coding/dice-verse/)** (`apps/dice-verse`)
    - 一个创意写作工具，让你在方格中用AI生成的骰子创作诗歌。
    - [Prompt](https://github.com/ChenZiHong-Gavin/weekly-vibe-coding/blob/main/prompts/dice-verse.md)
      
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/8ceb06db-4a6f-4b69-bd0d-3c7c17aff3b8" />


2. **[Spin Art](https://chenzihong-gavin.github.io/weekly-vibe-coding/spin-art/)** (`apps/spin-art`)
    - 实时旋转绘画小工具，通过旋转画布轻松创作出绚丽的几何图案。
  
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/3839b21c-3459-44e2-b73e-9100a187eb98" />

  
3. **[Snap Puzzle](https://chenzihong-gavin.github.io/weekly-vibe-coding/snap-puzzle/)** (`apps/snap-puzzle`)
    - 上传照片变成一个简单有趣的拼图游戏。
  
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/bf5ec35c-b057-4ee7-bb9f-e36803875291" />

  
4. **[Danmaku Magic](https://chenzihong-gavin.github.io/weekly-vibe-coding/danmaku-magic/)** (`apps/danmaku-magic`)
    - 一个可以让你在视频上添加动态弹幕的工具。
  
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/7898c5e6-136d-48f7-acd0-f5c7c2f21929" />


5. **[Hairline Tracker](https://chenzihong-gavin.github.io/weekly-vibe-coding/hairline-tracker/)**(`apps/hairline-tracker`)
    - 追踪记录你的发际线。
  
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/f31b65ec-d6db-40aa-b0d0-bb3f24053559" />

### 专题二：手势交互

7. **[FaceOpera](https://chenzihong-gavin.github.io/weekly-vibe-coding/peking-opera/)** (`apps/peking-opera`)
    - 实时AR京剧变脸，通过手势或触摸轻松切换传统脸谱。

      <img width="400" alt="Gemini_Generated_Image_1dfzgi1dfzgi1dfz" src="https://github.com/user-attachments/assets/e1d7357e-6da0-4dc7-bde2-dba5efae2193" />

8. **[Air Drum Master](https://chenzihong-gavin.github.io/weekly-vibe-coding/air-drum-master/)** (`apps/air-drum-master`)
    - 隔空架子鼓，通过摄像头识别手势，让你在空气中敲击架子鼓。

      <img width="400" alt="image" src="https://github.com/user-attachments/assets/105c1366-6049-4632-ace9-50ff90286ac7" />

16. **[Marionette](https://chenzihong-gavin.github.io/weekly-vibe-coding/marionette/)** (`apps/marionette`)
    - 手势操控提线木偶，通过 MediaPipe 实时追踪五根手指，用物理模拟的提线控制一个手绘风格的布偶。


### 专题三：语音交互

9.  **[Spellbook](https://github.com/ChenZiHong-Gavin/weekly-vibe-coding/tree/main/apps/spellbook)** (`apps/spellbook`)
    - 《哈利波特》魔法咒语练习，通过前端录音与后端音素识别，比对用户的发音与目标咒语的音素，让你能够念对魔法，施展魔法。

      <img width="400" alt="image" src="https://github.com/user-attachments/assets/304c161a-3b66-447e-8f93-a6dc99a97e01" />

### 专题四：地理信息交互

### 专题五：有审美的网站设计

13. **[Pretext Solar System](https://chenzihong-gavin.github.io/weekly-vibe-coding/pretext-solar-system/)** (`apps/pretext-solar-system`)
    - 基于 `@chenglou/pretext` 排版引擎的太阳系动态文字排版演示。深邃星空中，八大行星沿椭圆轨道运行，报纸式双栏长文实时环绕行星流动排版，配合首字下沉、大标题等经典排版细节。
    
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/4f9c9b57-d4f4-46d3-9e45-1b0e44e92e17" />


### 专题六：数学小工具

10. **[Pi Matchmaker](https://chenzihong-gavin.github.io/weekly-vibe-coding/pi-matchmaker/)** (`apps/pi-matchmaker`)
    - 一个小网页，查找两个人的生日在圆周率上的相对位置，用于测姻缘。

      <img width="400" alt="image" src="https://github.com/user-attachments/assets/cb379715-1f45-445a-8309-224b700ccab0" />


### 专题七：学习必备

11. **[Paper2Novel](https://chenzihong-gavin.github.io/weekly-vibe-coding/arxiv-to-novel/)** (`apps/arxiv-to-novel`)
    - 将任意 arXiv 学术论文转化为引人入胜的小说，支持 10 种文学风格。
   
      <img width="400"  alt="image" src="https://github.com/user-attachments/assets/1d0f5935-3d33-4e2b-8bfd-413b64eb69df" />

12. **[Vim Chaser](https://chenzihong-gavin.github.io/weekly-vibe-coding/vim-chaser/)** (`apps/vim-chaser`)
    - 一个在「追逐、战斗、解谜」中不知不觉学会 Vim 的网页游戏。三种模式：🎯 冒险模式（10章63关故事驱动教学）、⚡ 极速模式（60秒计时追逐）、🏌️ Code Golf（最少按键挑战），覆盖 120+ Vim 命令。
   
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/15359009-981f-4c47-90d9-f99d721156f4" />


### 专题八：抽象排序算法

14. **[Louis XVI Sort](https://chenzihong-gavin.github.io/weekly-vibe-coding/louis-xvi-sort/)** (`apps/louis-xvi-sort`)
    - 路易十六排序可视化器 👑 — 一个以法国大革命为主题的排序算法演示。从右到左扫描数组，凡是比右邻居大的元素一律"砍头"（值降为邻居值）。配有伪代码高亮、柱状图动画、断头台音效，支持速度调节与单步执行。

      <img width="400" alt="image" src="https://github.com/user-attachments/assets/abdd2573-30cb-4818-ae0d-13d8ac3b9662" />



### 专题九：假装是真的

15. **[Real-to-AI](https://chenzihong-gavin.github.io/weekly-vibe-coding/real-to-ai/)** (`apps/real-to-ai`)
    - 把真实照片伪装成AI生成的截图。支持 ChatGPT 对话、Midjourney、Stable Diffusion WebUI、ComfyUI 四种模板，含手机/桌面双布局，导出高清PNG。
    - [Prompt](https://github.com/ChenZiHong-Gavin/weekly-vibe-coding/blob/main/prompts/real-to-ai.md)
   
      <img width="400" alt="image" src="https://github.com/user-attachments/assets/854ec939-9ca6-4e9e-aa8d-90269d7ec73d" />



## 如何运行

以 `dice-verse` 应用为例，在本地运行该项目的步骤如下：

1.  克隆仓库:
    ```bash
    git clone https://github.com/chenzihong-gavin/weekly-vibe-coding.git
    cd weekly-vibe-coding
    ```

2.  进入应用目录并安装依赖:
    ```bash
    cd apps/dice-verse
    npm install
    ```

3.  启动开发服务器:
    ```bash
    npm run dev
    ```

## 贡献

无论是提出新的想法、报告Bug，还是提交代码，欢迎任何形式的贡献！

如果您有兴趣贡献，请遵循以下步骤:

1.  Fork 本仓库。
2.  创建一个新的分支: `git checkout -b feature/YourAmazingIdea`。
3.  提交您的更改: `git commit -m 'Add some AmazingIdea'`。
4.  将您的分支推送到远程: `git push origin feature/YourAmazingIdea`。
5.  创建一个 Pull Request。

## License

本项目使用 [MIT License](LICENSE) 授权。
