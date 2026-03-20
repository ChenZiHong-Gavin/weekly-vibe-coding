# Prompt for Vim Chaser

## 背景

参考实现 `Kimi_Agent_Vim 基础练习` 存在以下问题：游戏性弱（本质是教程幻灯片）、反馈不足（只有一个任务完成弹窗）、缺乏动机（没有分数/排行/成就）、模式单一、只覆盖 ~30 个命令。

## 第一轮

```
我要做一个网页游戏，通过游戏方式教玩家学会 Vim。

核心设计理念：
1. 不是教程，是游戏 — 教学融入游玩，玩着玩着就学会了
2. 即时反馈 — 每次按键都有视觉和听觉反馈，命中目标有粒子爆炸
3. 成长感 — 从 hjkl 到宏录制，玩家能感受到自己变强的过程

三种游戏模式：
- 🎯 冒险模式：10章63关故事驱动教学，从 hjkl 到宏录制
- ⚡ 极速模式：60秒计时追逐，连击系统，chase targets for high scores
- 🏌️ Code Golf 挑战：给定起始和目标代码，用最少按键完成编辑，beat par

技术要求：
- React + Vite + TypeScript + Tailwind CSS
- Web Audio API 合成音效（不依赖音频文件）
- 纯前端，无后端依赖
- 模块化架构：VimEngine（纯逻辑引擎）和 UI 完全分离
- 进度 localStorage 持久化

Vim 引擎需要支持：
- 基础移动：h j k l w b e W B 0 $ ^
- 跳转：gg G {n}G { } % H M L
- 搜索：/ ? n N * # f F t T ; ,
- 编辑：i a o I A O r x X s S dd cc D C J
- 操作符+动作：dw de d$ cw ce c$ yw y$
- 文本对象：iw aw i( a( i" a' it ip
- Visual 模式：v V + d/c/y/>/</~/U/u/r
- 宏：q 录制 @ 回放 . 点命令
- 寄存器：yy p P
- 标记：m ' `
- 命令行：:s 替换
- 撤销：u Ctrl+r
- 跳转列表：Ctrl+o Ctrl+i

每关包含：新命令介绍卡 → 代码编辑器（带光标和目标高亮）→ 星级评价（按步数）

视觉风格：终端暗色主题 + 霓虹绿色调 + CRT 扫描线 + 浮动粒子背景
```

## 第二轮

```
补充以下内容：

1. VimEngine 补全所有缺失命令的实现（gg/G、Visual 模式操作、:s 替换、~ 大小写、宏录制 q/@、标记跳转 m/'、缩进 >>/<< 和 visual >/<、Ctrl+o/i 跳转列表、H/M/L 屏幕定位）

2. 补充 Chapter 3-10 的完整关卡数据：
   - Ch.3 远征（9关）：gg/G、{n}G、{}段落跳、/搜索、*#、f/F、t/T、;,
   - Ch.4 编辑（9关）：i/a、I/A、o/O、r、D/C、x、dd、J
   - Ch.5 组合（8关）：dw/db、d$/df、cw/ce/cc、yw/yy/p、数字前缀、u/Ctrl+r
   - Ch.6 精准（6关）：iw/aw、i(/a(、i"/i'、it/at、ip/ap
   - Ch.7 视觉（6关）：v选择、V行选、缩进>/<、大小写~gU/gu、选中替换
   - Ch.8 效率（5关）：yy/p、dd+p搬运、q录制宏、.点命令
   - Ch.9 进阶（6关）：m标记、Ctrl+o/i跳转列表、%匹配括号、H/M/L、:s替换
   - Ch.10 大师（5关）：代码重构、快速修Bug、代码高尔夫、配置编辑、终极试炼

3. 新增 Code Golf 挑战模式（9个挑战，Easy 到 Expert，每个有 par 参考步数）

4. 视觉打磨：CRT 扫描线、浮动粒子背景、glow 文字、宏录制指示器、新 CSS 动画
```
