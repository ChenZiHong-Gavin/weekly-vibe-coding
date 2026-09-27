# 相机数字孪生 · Camera Twin

一台 Canon EOS R6 Mark III 的可交互三维数字孪生：点击任何部件看它是什么、怎么用；在右侧直接提问，讲解员（Claude）会用中文回答，并让模型配合演示：镜头飞到部件、高亮、单独显示、切换视角、转动模式转盘或翻开屏幕。

## 状态

- 三维场景、部件知识库（55 个部件，来自佳能官方手册"部件名称"页）、讲解员工具协议、契约测试：已完成。
- `src/model/r6iii.js`：**程序化 Three.js 模型槽位，由 Codex 按 [建模简报](./docs/MODELING_BRIEF.md) 编写**。未实现时应用自动使用 `src/model/placeholder.js` 的方块占位模型，所有功能照常可用。
- 讲解员支持两种模型接口：火山方舟豆包（`ARK_API_KEY`，默认 `doubao-seed-evolving`，已实测）或 Anthropic（`ANTHROPIC_API_KEY`）。未配置时其余功能不受影响。

## 虚拟固件（第一轮闭环）

`src/firmware/` 是一台"能开机"的 R6 Mark III：

- `state.js`：纯 JS 状态机。电源 OFF/ON/LOCK，12 档模式转盘，快门 30" 到 1/8000、光圈 F4 到 F22（RF 24-105 F4L）、ISO、曝光补偿；主拨盘和两个速控转盘按手册分工（Av 主拨盘调光圈、Tv/M 调快门、速控转盘 1 调曝光补偿或 M 模式光圈、速控转盘 2 调 ISO）；半自动模式会按晴天 EV 13 自动测光；MENU 八个主页签及其全部二级页签和条目（`src/firmware/menu.json`，从佳能官方中文手册「设置页菜单」各页抓取，基础区自动隐藏创意区专属项）、INFO 三级信息、Q 速控屏、快门拍照写入虚拟卡、回放与删除；LOCK 时锁定主拨盘。
- `screen.js`：把状态画成 3:2 画布：取景画面（程序生成的风景，随曝光变亮变暗）、佳能配色的菜单、速控屏、回放。
- `index.js`：把画布做成贴图贴到翻转屏和取景器上，同步电源拨杆、模式转盘的姿态；在三维画布上点击开关和按钮、滚轮转动转盘。

已实现的常用功能：菜单条目按 SET 进入第三级选项（97 项可改，当前值蓝色标示，MENU 取消；其余条目显示官方手册的说明文字，数据在 `src/firmware/menu-options.json`）；格式化、重置、清洁感应器等带确认对话框；Q 速控屏 10 项（AF 操作、AF 区域、驱动、白平衡、ISO、曝光补偿、画质、测光、防抖、色彩模式）可直接改；自拍驱动模式有倒计时；照片/短片开关切到短片后录像钮开始/停止录制并保存短片；回放可翻页、放大、评分、保护、删除；AE 锁、AF 区域按钮、RATE 按钮均有效；基础区隐藏创意区专属菜单项。

**练习课程**：右侧"练习课程"分两组。基础 8 门（开机换模式、曝光三要素、手动曝光、伺服对焦、自拍、录短片、格式化、拍摄与删除）；人像 6 门，依据[佳能（中国）人像摄影专业技巧](https://www.canon.com.cn/special/canon_portrait/index.html)系列改编到 R6 Mark III（背景虚化设置、对焦在眼睛上、逆光曝光与自动曝光锁、暗调人像、黑白颗粒、抓拍孩子），每门附教程要点和来源链接。开始后每一步目标按固件状态实时判定，卡住时点"要提示"，讲解员只提示不代劳；讲解员也能用 `start_lesson` 主动开课。

**三维交互**：转盘可以左右拖动或滚轮；快门按下即半按对焦、松开拍摄；点击翻转屏、卡槽盖、电池仓盖、镜头释放钮会开合或拆装；镜头 AF/MF 与防抖拨杆和固件联动；开机后点击 3D 屏幕可以直接触摸菜单、速控项和对话框按钮；取景画面的远景随光圈变化虚化。

右侧"相机屏幕"面板同步显示屏幕内容。键盘：`P` 电源，`,` `.` 模式，`←` `→` 主拨盘，`↑` `↓` 速控转盘 1，`[` `]` 速控转盘 2，`M` 菜单，`I` INFO，`Q` 速控，空格 快门，回车 SET。讲解员的步骤新增 `firmware` 字段，可以开机、换模式、改曝光、按按钮，并能读取相机当前状态回答"现在是什么参数"。

## 运行

需要 Node.js 22 或更新版本。

```sh
cd apps/camera-twin
npm install
cp .env.example .env   # 填入 ARK_API_KEY（豆包）或 ANTHROPIC_API_KEY（可选）
npm run dev            # http://127.0.0.1:4319
```

```sh
npm test               # 契约与协议测试
npm run check:model    # 单独检查 r6iii.js 是否满足模型契约
npm run build && npm start
```

## 结构

```
apps/camera-twin/
├── index.html / src/style.css      三栏界面：部件列表 · 三维舞台 · 讲解员
├── src/main.js                     入口：点击拾取、部件卡片、视角按钮
├── src/scene.js                    渲染、轨道控制、聚焦飞行、高亮、隔离显示、控制件
├── src/guide.js                    对话面板与分步演示执行器
├── src/guide-contract.js           讲解员工具定义 present_camera 与计划校验（前后端共用）
├── src/parts.json                  部件知识库（id、中英文名、位置、说明、用法）
├── src/firmware/                   虚拟固件：状态机 state.js、屏幕渲染 screen.js、三维绑定 index.js
├── src/model/contract.js           模型契约：部件 id、尺寸、坐标约定、控制件、校验函数
├── src/model/r6iii.js              ← 留给 Codex 的程序化模型槽位
├── src/model/placeholder.js        方块占位模型
├── server.mjs                      本地服务：Vite 中间件 + /api/guide 代理（密钥不出服务器）
├── scripts/check-model.mjs         无头契约检查
├── tests/contract.test.mjs
├── docs/MODELING_BRIEF.md          给建模者的简报、参考图说明、形体要点
└── public/reference-images/        官方部件图（正/背/翻屏）、官方背面与顶部照片、第三方渲染
```

## 讲解员如何工作

浏览器把最近的对话和当前选中的部件发到本地 `/api/guide`。服务端调用豆包（chat/completions 强制工具调用）或 Claude（Anthropic SDK），系统提示里附上部件清单、固件动作与当前相机状态，并提供唯一工具 `present_camera`：模型必须提交 `answer`（中文回答）和最多六个 `steps`。每一步只能引用清单中的部件 id、固定的视角枚举和契约里声明的控制件，服务端与浏览器各校验一次后再执行。模型只看到部件清单和问题，不发送源码或图片。

## 参考来源

- 佳能官方在线手册 [Part Names](https://cam.start.canon/en/C022/manual/html/UG-00_Before_0120.html)（部件图与命名）
- 佳能官方产品照片（经 PetaPixel 发布）
- Sketchfab 上 vietanh-hoang 的 R6 III 渲染图（仅作比例参考，模型本身不可下载）
