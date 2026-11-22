# 记忆厨房 · 单区布局视觉实现简报（给 Codex）

用户从 `docs/mockups/` 的四版里选了 **V2「摊开一张灶台」**（`docs/mockups/v2.html`）。功能已经按这个布局重做并通过浏览器测试（`docs/screenshots/02-served.png` 是只有占位样式的现状）。**你的任务：把 v2.html 的视觉落到真实页面上**——重写 `src/style.css`，按需调整 `index.html` 的装饰结构，让它和你的示意图一样好看，同时是可用的、响应式的产品页面。

## 页面结构（index.html，已定）

一个 `<main class="table">`，里面三块加页眉页脚：

- `.masthead`：标题、副标题、「放几张示例照片」「灶台设置」按钮。
- `.board`（左，案板）：`.upload`（拖放/点选，内含 `#board-count` 显示「3 / 5 · 可多选」）、`#photos` 照片列表（`<li class="photo">`：`.photo__img`、`.photo__name`、`.photo__meta`、`[data-act="pot"]` 往锅里放/✓在锅里 切换、`[data-act="remove"]`）、`.selected` 当前选中照片（`#edit-name`、`#edit-flavor`、`#preps` 三把厨具 = 处理方式、`#amounts` 三把量匙 = 用量）。
- `.stove`（中，锅）：`#pot-steps` 备料→下锅→烹饪→出锅、`.wok#pot`（内含 `#wok-canvas` 俯视锅内画面，由 JS 绘制；`#pot-status` 状态字）、`#dish-title` 菜名输入、`#heats` 三档火候（火苗）、`#methods` 五种烹法、`#btn-cook` 开火 / `#btn-cancel` 熄火、`#stove-provider`。
- `.serve`（右，瓷盘）：`#plate-lead`「刚出锅，还热着。」、`#plate-title` 菜名、`.plate#plate` 白瓷盘（内含 `#plate-img`）、`#plate-recipe`、`#plate-notes` 烹饪笔记、`#plate-actions`（保存 / ↶ 放回锅里继续煮 / 再来一锅 / ×）、`.return-hint`、`#btn-history`「做过的菜 · 01 道 / 回看」（内含 `#history-thumb`）。
- `.colophon` 页脚。
- 两个 `<dialog>`：`#history-dialog`（做过的菜列表 `.history-item`）和 `#settings-dialog`。
- `#stage` 全屏烹饪舞台（已有样式在 style.css 末尾「Cooking stage」一节，保留即可）。

## 绝对不能改的（JS 依赖）

- 所有 `id`、所有 `data-act` / `data-value` / `data-remote` / `data-field`、`<template>` 的 id 和模板内的 class 名（`photo__*`、`history-item__*`）、表单字段 `name`。
- JS 生成的按钮：`#preps`、`#amounts`、`#heats` 里是 `.seg__btn`（附加 `.seg__btn--tool` / `.seg__btn--spoon` / `.seg__btn--flame`），内含 `.seg__icon` 和 `.seg__label`；`#methods` 里是 `.method`（内含 `.method__icon` / `.method__label` / `.method__blurb`）；选中态 `.is-active`，`data-value` 分别是 slice/mash/marinate、1/2/3、1/2/3、stew/stirfry/steam/roast/raw。**厨具、量匙、火苗、烹法的图形请用 CSS 或 `.seg__icon` / `.method__icon` 里的背景 SVG 画出来**（刀 = 切片、杵 = 捣碎、碗 = 腌制；量匙大小 = 用量；火苗 1/2/3 朵 = 火候；五种烹法各一个小图标），不要改 JS。
- JS 切换的 class：`.photo--in-pot`、`.photo--selected`、`.upload.is-over`、`.wok.is-over`、`.plate--empty`、`.history-item--on-plate`；`#pot` 上的 `data-stage`（idle/cooking/done/error）、`data-method`、`data-heat`、`data-count`。
- `src/*.js`、`tests/` 不要动。

## 视觉要求

- 以 `docs/mockups/v2.html` 为准：俯视旧木桌、左边案板摊照片、中间铸铁大锅、右边白瓷盘和亚麻布、厨具当控件、纸签式的按钮。
- 锅内画面由 canvas 绘制，你只负责锅的外沿、把手、炉圈、阴影和桌面；`.wok` 要保持正圆、`#wok-canvas` 填满内圈。
- 响应式：桌面三块并排；1000px 以下按 锅 → 案板 → 瓷盘 纵向排列（grid-template-areas 已给，可以改），手机不横向滚动。
- 深色模式跟随 `prefers-color-scheme`（夜里的厨房，不是反色）；尊重 `prefers-reduced-motion`。
- 保留 style.css 末尾的 Cooking stage 一节。

## 验证

```bash
npm run build   # 必须通过
npm test        # 必须通过
```
浏览器回归 `node tests/browser.mjs`（先 `npm run preview`）可能受沙箱限制，做不了我来跑。
完成后更新 `docs/DESIGN_NOTES.md`（200 字以内），不要提交 git。
