# 记忆厨房 · 视觉设计简报（给 Codex）

## 这是什么

一个单页 Web 应用（Vite + 原生 JS，无框架）。照片是食材；用户把几张照片放上案板，选处理方式（切片/捣碎/腌制）、用量、烹饪方式（炖/炒/蒸/烤/生拌）和火候，按「开火」，就会做出一张全新的照片——一段从未发生过的记忆。出锅的菜可以再放回食材库继续煮。

功能已经完成并通过浏览器测试。**你的任务只有一件：视觉设计。** 让它看起来像一件有气质的作品，而不是一个表单。

## 你拥有的文件

- `src/style.css`：整个重写，这是你的主战场。当前内容只是功能占位。
- `index.html`：可以增删装饰性结构（SVG、分隔、标签、背景层），可以改文案的排版方式，可以调整语义标签和 class 名。
- `src/pot.js`：锅的 canvas 动画，可以重画得更好看（蒸汽、火焰、锅沿反光等），接口 `startPot(canvas)` 返回 `{ update(view) }` 不能变；`view` 的字段见文件。
- 可以新增 `public/` 下的静态资源（SVG 纹理等），但不要引入外部字体 CDN 以外的第三方资源；不要加 npm 依赖。

## 绝对不能改的（JS 依赖这些）

- 所有 `id` 属性、所有 `data-act` / `data-field` / `data-value` / `data-remote` 属性、三个 `<template>` 的 id 及其内部的 class 名（`ingredient__*`、`board-item__*`、`dish__*`）、表单字段的 `name`。
- `#methods`、`#heats`、`.seg` 内的按钮由 JS 生成，class 固定为 `.method`（带 `.method__label` / `.method__blurb`）和 `.seg__btn`，选中态 class 是 `.is-active`。
- `#pot` 上由 JS 写的状态：`data-stage`（idle | cooking | done | error）、`data-method`、`data-heat`。请用它们做视觉反馈（比如 cooking 时锅在晃、done 时有一瞬光）。
- `.dropzone.is-over`、`.panel--stove.is-over`、`.ingredient--on-board` 这几个由 JS 切换的 class。
- `src/main.js`、`src/state.js`、`src/recipe.js`、`src/localCook.js`、`src/imageApi.js`、`src/storage.js`、`src/samples.js`、`tests/` 不要改。

## 想要的气质

- 关键词：**手写菜谱本 / 深夜厨房 / 温热的旧照片**。纸、油渍、铅笔批注、铸铁锅、炉火的暖光。不要 SaaS 风、不要蓝紫渐变、不要玻璃拟态。
- 三个区域应有三种"材质感"：食材库像冰箱贴/照片墙，案板像木头或砧板，灶台是深色、暖光、有火，餐桌是干净的白盘子/亚麻布。
- 五种烹饪方式按钮要有各自的小图形（可用内联 SVG 或 CSS 画），选中后灶台的氛围随 `data-method` 微变（炖=橙红慢呼吸，炒=跳动，蒸=灰白雾，烤=深褐，生拌=明亮）。
- 「开火」是全页最重的一个动作，要像一个真实的旋钮或按钮。
- 中文排版要讲究：标题用有衬线感的中文字体栈（可用 Google Fonts 的 Noto Serif SC 或 Ma Shan Zheng / Zhi Mang Xing 做手写批注，正文系统字体即可），字距、行高、数字用等宽或衬线。
- 深色模式：跟随 `prefers-color-scheme`，深色也要像夜里的厨房，不是简单反色。
- 动效克制、有意义；尊重 `prefers-reduced-motion`。
- 响应式：桌面三栏；1000px 以下单栏纵向（食材库 → 案板/灶台 → 餐桌），手机上按钮要能点、横向不滚动。

## 验证

```bash
npm run build       # 必须通过
npm test            # 必须通过（不要改 tests/）
```

浏览器回归 `node tests/browser.mjs` 需要先起 `npm run preview`，可能受沙箱限制；做不了就跳过，我会在你之后跑。

完成后在 `docs/DESIGN_NOTES.md` 写一段 200 字以内的设计说明：配色、字体、每个区域的材质想法、动效清单。
