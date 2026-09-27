# 建模简报：Canon EOS R6 Mark III 程序化 Three.js 模型

目标文件：`src/model/r6iii.js`。这是当前唯一留空的槽位；其他代码（场景、讲解员、契约、测试）都已就位。

## 契约（必须满足）

```js
export const IMPLEMENTED = true;
export function buildCamera(THREE) { /* 返回 THREE.Group */ }
```

- 只接受传入的 `THREE`（three@0.170.0），不要 `import * as THREE from 'three'`（脚本与浏览器共用）。可以从 `three` 导入 addons（例如 `three/addons/...`），但基础几何体请用传入的 `THREE`。
- 单位：**1 单位 = 1 厘米**。机身外形约 13.84 宽 × 9.84 高 × 8.84 深（不含突出的转盘和眼罩时略小；契约允许 ±25%）。
- 坐标：+Y 向上；**+Z 指向摄影师（屏幕那一面）**；镜头卡口朝 −Z；**+X 是握柄侧**（从背后看的右手边）。模型大致以原点为中心。
- 每个部件是一个 `Object3D`（Group 或 Mesh），并且 **`obj.name === obj.userData.part === 部件 id`**。子网格可以任意多个。每个部件至少含一个 Mesh。
- 必须包含 `src/model/contract.js` 中 `REQUIRED_PART_IDS` 的全部 54 个部件（`body_cap` 可选，若做了请 `visible = false`）。不要出现清单外的 `userData.part`。
- 可选 `root.userData.controls`：`{ mode_dial(t), screen_open(t), card_door_open(t), power(t), still_movie(t) }`，t 在 0..1，直接改变部件的旋转 / 位置。至少实现 `mode_dial`、`screen_open`、`card_door_open`。
- 材质用 `MeshStandardMaterial`；场景是暖白棚拍光，ACES 色调映射，有阴影。三角面总数控制在 15 万以内。
- 不加载任何外部文件、贴图或字体。文字标识（Canon、EOS、按钮字样）不需要，可用凹槽或色块示意。

部件清单及中文说明见 `src/parts.json`；每个部件的 `side` 字段说明它在哪一面。

## 参考图

`public/reference-images/`：

- `canon-manual/UG-00_i0080.png`：**官方部件图·正面**，编号对应：(1) 模式转盘 (2) 电源/锁开关 (3) 主拨盘 (4) M-Fn (5) 快门 (6) 短片按钮 (7) 自拍灯/AF 辅助光 (8) 握柄 (9) DC 线孔 (10) 景深预览 (11) 触点 (12) 卡口 (13) 靴盖 (14) 闪光同步触点 (15) 热靴 (16) 卡口标记 (17) 照片/短片开关 (18) 焦平面标记 (19) 背带环 (20) 录制指示灯 (21) 麦克风 (22) 快门帘/传感器 (23) 镜头释放 (24) 镜头锁销 (25) 机身盖
- `canon-manual/UG-00_i0090.png`：**官方部件图·背面**：(1) 眼罩 (2) 取景器目镜 (3) MENU (4) 扬声器 (5) 端子盖 (6) AF-ON (7) 速控转盘 2 (8) 多功能控制钮 (9) 放大 (10) Q (11) 速控转盘 1 (12) SET (13) 回放 (14) INFO (15) 眼感应器 (16) RATE/COLOR (17) 麦克风端子 (18) USB (19) 耳机 (20) HDMI (21) 遥控端子
- `canon-manual/UG-00_i0100.png`：**官方部件图·屏幕翻开 + 右侧/底部**：(1) 屈光度旋钮 (2) 屏幕 (3) 配件定位孔 (4) 三脚架孔 (5) 序列号 (6) 删除 (7) AE 锁 (8) 对焦点选择 (9) 背带环 (10) 存取灯 (11) 卡槽盖 (12) 卡槽 1 (13) 卡槽 2 (14) 电池盖锁 (15) 电池盖 (16) 定位孔
- `canon-press/back.jpg`：官方背面正投影照片（1600px）
- `canon-press/top.jpg`：官方顶部正投影照片
- `canon-press/back-right-card-slot.jpg`：背面右侧特写，卡槽盖打开
- `front-three-quarter-sketchfab-render.jpeg`：第三方渲染的正面 3/4 视角（1920px），比例参考
- `front-three-quarter-canon-ca.png`、`front-three-quarter-small.jpeg`：正面 3/4 小图

## 形体要点（按重要性）

1. **机身主体**：横向长方体，正面左侧（−X）较薄，右侧（+X）是向前突出的深握柄，握柄顶部向前倾斜放快门。顶部中央有取景器隆起（"军舰部"），隆起顶部是热靴，隆起后方是眼罩。
2. **卡口**：正面中央偏左，直径约 5.4 cm 的金属环，内部有黑色腔体、传感器矩形和下方一排触点。卡口右侧（+X 方向，靠握柄）有镜头释放按钮，右下有景深预览按钮。
3. **顶面**：左肩是照片/短片切换拨杆（小圆盘加杆）；右肩从左到右：模式转盘（带外圈电源拨杆，OFF/ON/LOCK）、短片按钮（红点）、再往前握柄顶部是快门、M-Fn、主拨盘（横向滚轮，嵌在握柄前缘）。速控转盘 2 是右肩后缘的一个竖立滚轮（顶视图右上角的花纹轮）。
4. **背面**：左上 RATE 和 MENU 两个圆按钮；中央眼罩下方是 3 英寸侧翻屏（占背面左侧 2/3）；右侧竖向排列：多功能控制钮（摇杆）与 AF-ON 并排在上，其右是 AE 锁（*）和对焦点选择两个小按钮；往下是放大、INFO、Q 三个按钮；再往下是速控转盘 1 大圆盘中央 SET；最下面回放、删除两个按钮和存取指示灯。
5. **侧面**：左侧（−X）有橡胶端子盖，下面从上到下 MIC、USB-C、耳机、HDMI、遥控；右侧（+X 握柄外侧）是滑开的卡槽盖，内部两条竖槽（CFexpress 在前，SD 在后）。
6. **底部**：三脚架孔在光轴正下方；握柄底部是电池盖及锁扣。
7. 表面：机身哑光黑，握柄蒙皮略带纹理感（可用较高 roughness 与稍浅的颜色区分），转盘为深灰金属、带滚花（可用多边形圆柱或 TorusKnot 省略），热靴与卡口为银色金属。

## 工作流

```sh
npm run check:model        # 契约检查：缺失部件、尺寸、NaN、控制件；退出码 0 才算通过
npm test                   # 含上面的检查
npm run dev                # http://127.0.0.1:4319 ，看图
```

看图可用 Playwright（`../mechanical-explainer/node_modules/playwright` 已安装浏览器）：打开页面后点击 `.viewbar [data-view=front|back|top|left|right]` 截图，与 `canon-press/*.jpg` 及部件图对照。契约通过且六个视角与参考图的部件布局一致后即可交付。请逐轮把改动记录在 `docs/MODELING_LOG.md`。

## 第二期任务：按钮标识还原 + RF 24-105mm F4L IS USM 镜头

用户看图反馈：背面按钮上的标识（目前是"|||"一类的示意条纹）不像真机。第二期要做两件事。

### A. 按钮与转盘标识

- 对照 `canon-press/back.jpg` 与 `canon-press/top.jpg`，把标识做成真实文字或图标：背面 RATE（蓝字）/ COLOR、MENU、AF-ON、星号 ✱、对焦区域框图标、放大镜、INFO、Q（方框内 Q）、SET、回放 ▶（蓝色）、垃圾桶（蓝色）；顶部 M-Fn、OFF / LOCK / ON、模式转盘的 Fv P Tv Av M B C1 C2 C3 SCN A+、红点录像钮上的相机切换图标、照片/短片开关的相机与摄影机图标。
- 允许用 **`CanvasTexture` 在代码里画文字和图标**（不加载任何外部文件或字体，用系统 sans-serif 即可），贴在按钮顶面或转盘顶面的一层薄片上。仍然使用 `MeshStandardMaterial`（`map` 或 `emissiveMap`）。
- **Node 里没有 `document`**：`npm run check:model` 与 `npm test` 在 Node 运行，所以生成贴图的代码必须判断 `typeof document === 'undefined'` 时退回到无贴图的同色材质，保证契约脚本照常通过。
- 标识字号要在正投影背面截图（1400 宽）里可读，颜色对照照片：大部分为白色/浅灰，RATE、回放、删除为青蓝色，录像钮红色。

### B. 镜头

- 型号：**Canon RF 24-105mm F4 L IS USM**（套机镜头）。尺寸 **长 10.7 cm、直径 8.4 cm**，77mm 滤镜口径。参考 `canon-press/with-rf24-105-f4l.jpg`（装在 R6 III 上的正面官方照片）。
- 新增部件 id 已写入 `src/parts.json`（`side: "lens"`），全部必需：`lens`（整支镜头的 Group，其余镜头部件都是它的子对象）、`lens_mount_ring`、`lens_barrel`（伸缩内筒）、`lens_zoom_ring`、`lens_focus_ring`、`lens_red_ring`、`lens_control_ring`、`lens_front_element`、`lens_af_mf_switch`、`lens_is_switch`。
- 布局从卡口向前（−Z）：卡口环（金属、带红点） → 固定镜身 → 宽变焦环（橡胶，带 24/35/50/70/105 刻度） → 窄对焦环 → 红环 → 前端银色滚花控制环 → 前镜组（深色玻璃，有同心反射环）。AF/MF 与 IS 拨杆在镜身左侧（−X）。
- 契约新增两个控制件：`lens_attached(t)`（1 装在卡口上，0 沿光轴前移约 6 cm 露出卡口与传感器）与 `lens_zoom(t)`（0 = 24mm 镜筒收回，1 = 105mm 内筒伸出约 2.5 cm）。`validateCamera` 会单独测量镜头包围盒的长度与直径（±25%），机身尺寸检查已排除镜头。
- 镜头默认装上并显示。`body_cap` 保持隐藏。
- 面数预算：加镜头后总三角面可放宽到 **200,000**，请把 `tests/` 里的面数上限测试同步改到 200,000。

验收：`npm run check:model` 与 `npm test` 全过；六视角 + `lens_attached(0)`、`lens_zoom(1)` 截图存到 `artifacts/round-6/` 起的新目录；背面截图里的按钮文字能与 `canon-press/back.jpg` 逐个对上。继续在 `docs/MODELING_LOG.md` 追加记录。

## 第三期任务：细节与联动

1. **机身字样**：用 CanvasTexture 在取景器隆起正面加 "Canon" 白色字标，右侧机身正面加 "EOS R6 / Mark III" 徽标（对照 `canon-press/with-rf24-105-f4l.jpg` 与 `canon-press/top.jpg` 的位置和比例），镜头前端已有的环形文字保持。
2. **卡与电池**（新部件，非必需但请实现）：`card_1`（CFexpress Type B 卡，插在卡槽 1，露出约 5mm）、`card_2`（SD 卡，插在卡槽 2，露出约 3mm）、`battery`（LP-E6P，装在握柄内部）。新增控制件 `battery_cover_open(t)`：底部电池仓盖绕铰链打开，t=1 时电池部分滑出 1.5cm 可见。
3. **镜头拨杆联动**：新增控制件 `lens_af_mf(t)`（0 AF 1 MF）和 `lens_is(t)`（0 OFF 1 ON），分别拨动 `lens_af_mf_switch` 与 `lens_is_switch` 的拨片位置；拨杆旁用小贴图标出 AF / MF、STABILIZER ON / OFF 字样。
4. 契约 `CONTROLS` 已加入这三个控制件；`REQUIRED_PART_IDS` 不含 card_1/card_2/battery。`npm test` 当前 14 项必须保持通过。
