# weekly-vibe-coding

![Project Status: Active](https://img.shields.io/badge/status-active-success.svg) ![Progress](https://img.shields.io/badge/Ideas-8%2F100-blue)

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

       <img width="400" height="600" alt="image" src="https://github.com/user-attachments/assets/64878ac4-8ef9-4e1b-b5e6-db0ac40ba05e" />


### 专题一：想做点什么就做点什么
1.  **[Dice Verse](https://chenzihong-gavin.github.io/weekly-vibe-coding/dice-verse/)** (`apps/dice-verse`)
    - 一个创意写作工具，让你在方格中用AI生成的骰子创作诗歌。
    - [Prompt](https://github.com/ChenZiHong-Gavin/weekly-vibe-coding/blob/main/prompts/dice-verse.md)
      
      <img width="400" height="600" alt="image" src="https://github.com/user-attachments/assets/8ceb06db-4a6f-4b69-bd0d-3c7c17aff3b8" />


2. **[Spin Art](https://chenzihong-gavin.github.io/weekly-vibe-coding/spin-art/)** (`apps/spin-art`)
    - 实时旋转绘画小工具，通过旋转画布轻松创作出绚丽的几何图案。
  
      <img width="400" height="600" alt="image" src="https://github.com/user-attachments/assets/3839b21c-3459-44e2-b73e-9100a187eb98" />

  
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

6. **[FaceOpera](https://chenzihong-gavin.github.io/weekly-vibe-coding/peking-opera/)** (`apps/peking-opera`)
    - 实时AR京剧变脸，通过手势或触摸轻松切换传统脸谱。

      <img width="400" alt="Gemini_Generated_Image_1dfzgi1dfzgi1dfz" src="https://github.com/user-attachments/assets/e1d7357e-6da0-4dc7-bde2-dba5efae2193" />

7. **[Air Drum Master](https://chenzihong-gavin.github.io/weekly-vibe-coding/air-drum-master/)** (`apps/air-drum-master`)
    - 隔空架子鼓，通过摄像头识别手势，让你在空气中敲击架子鼓。

    <img width="400" alt="image" src="https://github.com/user-attachments/assets/7517c57b-7b0b-4720-96f3-33979857d471" />

### 专题三：语音交互

8.  **[Spellbook](https://github.com/ChenZiHong-Gavin/weekly-vibe-coding/tree/main/apps/spellbook)** (`apps/spellbook`)
    - 《哈利波特》魔法咒语练习，通过前端录音与后端音素识别，比对用户的发音与目标咒语的音素，让你能够念对魔法，施展魔法。

      <img width="400" alt="image" src="https://github.com/user-attachments/assets/304c161a-3b66-447e-8f93-a6dc99a97e01" />

### 专题四：地理信息交互

### 专题五：有审美的网站设计


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
