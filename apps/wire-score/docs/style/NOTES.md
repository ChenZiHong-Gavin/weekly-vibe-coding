# 電線譜｜四款風格稿與 Canvas 2D 實作筆記

四張均為 **1400 × 900 PNG**，沿用原截圖的天空／電線／古琴比例。圖片是風格參考；下列參數是程序重繪的起點，色碼是建議調色板，不是生成圖逐像素的色彩規格。所有尺寸均為 1400 × 900 畫布上的邏輯像素，實際繪製再乘 DPR。

| 稿件 | 主要方向 | 著色上限 | 預覽 |
| --- | --- | --- | --- |
| A · 淡墨留白 | 淡墨、細線、紙本色；夕陽一點赭石 | 一種礦物色 | [A.png](A.png) |
| B · 礦物色塊 | 石青遠山、赭石琴面、朱砂夕陽；掃筆破邊 | 三種礦物色 | [B.png](B.png) |
| C · 枯筆焦墨 | 焦墨、分叉筆鋒、大量飛白；淡藤黃天空 | 兩種礦物色 | [C.png](C.png) |
| D · 水暈氤氳 | 雲山、杆、琴與手緣洇開；鳥和線清楚 | 兩種礦物色 | [D.png](D.png) |

紙色與中性墨色不計入礦物色數量。A 刻意只用一種礦物色，以符合「只有夕陽一點赭石」。原畫已有的小音名及演奏狀態標記若保留，沿用該稿的墨／礦物色，不另開新色。

## 共用構圖：四稿不靠搬動元素區分

| 元素 | 固定位置／比例 |
| --- | --- |
| 天空與地景區 | y=0–632；上方大面積空白維持原樣 |
| 電線杆 | x=140、1260；y 約 215–635；每杆兩道短橫擔，約 y=242、313 |
| 五根電線 | 端點 y 約 270、331、392、454、515；跨 x=140–1260；中點下垂約 11 |
| 鳥 | 約 20 隻；18–32 寬；保留原截圖疏密，最上線留空，其餘錯落 |
| 夕陽 | 圓心約 (952,207)，半徑約 40；單色墨／礦物色面 |
| 雲 | y 約 70、120、170、212；幾筆扁長橫掃，不增厚成大片雲海 |
| 遠山 | 只在 y 約 555–632；低矮、寬闊，不拉高成山水主景 |
| 古琴 | 外框約 (210,693)–(1190,847)；俯視、尾左首右 |
| 琴的結構 | 七弦；十三徽沿上側一排；岳山 x 約 1121；龍齦 x 約 234 |
| 左手／右手 | 左掌約 (645,798)，右掌約 (1102,770)；手腕從下緣進入 |
| 題字 | 琴右側空白，x 約 1305，y 約 747–865；豎排「電」「線」「譜」 |

電線繼續使用現有的 `wireYAt()`：
`y = y0 + sag * 4 * u * (1-u)`。筆觸擾動只改輪廓，不改這條中軸或命中判定。琴弦和徽位沿用現有 `L.sy`、`HUI`，不用目測圖片重新擺。

十三徽的位置使用：
`[1/8, 1/6, 1/5, 1/4, 1/3, 2/5, 1/2, 3/5, 2/3, 3/4, 4/5, 5/6, 7/8]`，
`x = yueX - (yueX-longX) * ratio`。七徽略大，其餘點不要等距排列。

## A · 淡墨留白

### 調色板

| 用途 | 色名 | Hex | 用法 |
| --- | --- | --- | --- |
| 紙 | 暖白宣紙 | `#F2EDE1` | 鋪底；保留為大部分畫面的主色 |
| 淡墨 | 紙灰 | `#D5D0C4` | 遠山、雲、琴面極淡底、手掌 |
| 中墨 | 暖灰墨 | `#9D9A90` | 電線、杆與琴的主要筆線、鳥身 |
| 濃墨 | 灰黑 | `#57574F` | 鳥頭、岳山、少量手指與題字 |
| 礦物色 1 | 淡赭石 | `#B68E74` | 只作夕陽主色，不鋪天空暖光 |

### 筆觸與邊緣

- 電線寬 **0.55–1.15**；電杆 **2–4**；琴緣 **0.7–1.8**；手指 **1–2.6**。每 18–40 長度才有一次緩慢提按，避免細密鋸齒。
- 枯／潤約 **20／80**；枯筆內露紙面積 **8–15%**，主要在杆尾、琴邊收筆和鳥尾。不是每條線都斷。
- 鳥頭為 2–3 半徑的小墨點，邊緣輕微失圓；鳥身用一段首重尾輕的 4–9 寬掃筆；尾尖收至 0.3–0.6。
- 鳥頭、線、徽與岳山相對硬；雲、山、掌心暈邊 **1–3**。山不描邊，山底讓回紙色。夕陽用微微毛邊的單色面，內部不做球體明暗。
- 濃墨只占極少面積；不要為了「看得清」把所有線統一加黑。

### 紙紋

全幅鋪微粒，粒徑 **0.4–1.2**；稀疏纖維長 **2–6**、寬 **0.2–0.5**。亮度擾動約 **±2–3/255**；每 1000 平方像素約 2–4 條可辨纖維。留白與墨下都有紋理，墨區再以吸墨量調制，不能只把紋理畫在空白裡。

### 畫法與構圖各自負責什麼

**靠畫法：** 淡墨透明度、少量飛白、落筆壓力及紙的吸墨差異，讓細杆與小鳥有筆意。**靠構圖：** 巨大空天、遠山壓低、孤立的小夕陽、最上線的空白，形成安靜。重繪時沿用共用座標，只調墨量，不縮小鳥群或古琴去製造留白。

## B · 礦物色塊

### 調色板

| 用途 | 色名 | Hex | 用法 |
| --- | --- | --- | --- |
| 紙 | 米宣 | `#F1E9D9` | 全幅底色 |
| 淡墨 | 米灰 | `#CBC6B9` | 雲、手掌、琴面下的淡筆 |
| 中墨 | 草灰墨 | `#85867C` | 杆、鳥身、琴弦、徽 |
| 濃墨 | 深灰墨 | `#494D46` | 鳥頭、岳山、指尖、題字 |
| 礦物色 1 | 淡石青 | `#899C9F` | 低矮遠山，薄塗約 25–45% |
| 礦物色 2 | 灰赭石 | `#B4987C` | 琴面，薄塗約 35–55% |
| 礦物色 3 | 淡朱砂 | `#BA8172` | 夕陽；原有極小音名可共用 |

### 筆觸與邊緣

- 電線寬 **0.8–1.6**；電杆 **2.8–5**；琴緣 **1–2.8**，但不把色面四周完整勾成框。
- 枯／潤約 **40／60**；色塊內露紙面積 **15–25%**。山與琴面使用 **18–45** 寬的橫掃筆束，幾筆彼此搭接；每筆有 3–8 長的缺口與不齊筆鋒。
- **山頂、琴面上下緣**是可辨的破邊；**色塊內部搭接、手掌**用 1–3 的薄滲邊。色面不做整齊的剪影填色，也不隨機噴成斑點。
- 夕陽可留幾處小紙缺，保持整體圓勢。琴的七弦最後單獨繪製，避免被赭石的厚度吞掉。
- 同一筆內色料有濃淡堆積，採「薄色底＋少量較乾的同色掃痕」，不用額外棕色陰影或高光。

### 紙紋

粒徑 **0.6–1.8**，亮度擾動 **±3–5/255**；纖維長 **3–9**、寬 **0.25–0.65**，全幅均有。石青、赭石內額外加入 **2–5** 尺度的低對比顏料沉積，墨量相對變化 **5–9%**；沉積由色塊遮罩限制，不污染整片天空。

### 畫法與構圖各自負責什麼

**靠畫法：** 色塊是數筆重疊掃出，破邊與紙缺形成繪本感。**靠構圖：** 山、琴、日這三個原有區域承擔三種顏色，水平節奏與原有空白維持一致。色塊更醒目不代表要擴大山或加厚琴。

## C · 枯筆焦墨

### 調色板

| 用途 | 色名 | Hex | 用法 |
| --- | --- | --- | --- |
| 紙 | 熟宣暖米 | `#EFE7D5` | 全幅底色 |
| 淡墨 | 土灰 | `#C8C1AE` | 低山、掌心、琴面極薄掃痕 |
| 中墨 | 煙灰 | `#77756A` | 鳥身、琴弦與指節 |
| 濃墨 | 焦墨 | `#343A34` | 杆、橫擔、鳥頭、琴緣、岳山、題字 |
| 礦物色 1 | 淡藤黃 | `#D7C792` | 天空一層極淡染，透明度約 6–12% |
| 礦物色 2 | 灰赭 | `#AF8B66` | 夕陽；少量原有小音名可共用 |

### 筆觸與邊緣

- 電線寬 **0.65–1.6**；杆與橫擔 **3–6**；琴緣 **1.5–3.5**；指尖 **1.2–3.5**，頓筆處可短暫增寬至基準的 1.5 倍。
- 枯／潤約 **80／20**；粗筆內露紙面積 **35–50%**。以 **4–9 條不等寬筆毫**組成杆與琴邊，每條筆毫有 1–6 長的連續缺墨段。缺口沿筆勢走，不用均勻虛線或橫向刮擦濾鏡。
- 杆頂、橫擔端、鳥尾、琴角的邊要硬、有斷續；僅山底、掌心與淡藤黃染有 **0.5–2** 的輕滲邊。
- 五根電線比杆少飛白，仍然能連續讀出線形，不能因「枯」而消失成五排短點。
- 琴大部分留紙白，主要靠枯墨邊與岳山成立，不把琴塗成一塊黑。鳥仍是三筆，焦墨主要落在頭和收筆，不增加羽毛細節。
- 藤黃染用極淡、不均勻的面狀筆觸，不能替夕陽加光暈；夕陽也可帶少量同方向飛白。

### 紙紋

粒徑 **0.7–2.0**，亮度擾動 **±3–5/255**；纖維長 **3–10**、寬 **0.3–0.8**，全幅鋪。枯筆遮罩中讓纖維方向影響缺墨概率，將墨的空隙拉長成筆毫狀；紙底本身不刻意加深，以免整張變成粗砂紙。

### 畫法與構圖各自負責什麼

**靠畫法：** 筆毫分叉、焦墨密度、停頓與刮出的飛白產生硬朗感。**靠構圖：** 垂直兩杆對照水平五線和琴弦，形成骨架；線的位置與原稿相同。對比增強來自墨色和露紙，不靠把杆畫粗成樹或把鳥放大。

## D · 水暈氤氳

### 調色板

| 用途 | 色名 | Hex | 用法 |
| --- | --- | --- | --- |
| 紙 | 暖白生宣 | `#F1ECE1` | 全幅底色 |
| 淡墨 | 水灰 | `#D2D2C8` | 琴面、雲的淡底、掌與腕 |
| 中墨 | 青灰墨 | `#929A91` | 杆、手指、山腳積墨、題字 |
| 濃墨 | 花青灰黑 | `#4F5A52` | 鳥頭、線、岳山與徽的少量清楚筆芯 |
| 礦物色 1 | 淡花青 | `#A8B6B4` | 雲與遠山的濕染，約 10–25% |
| 礦物色 2 | 淡赭石 | `#BA9782` | 小夕陽；原有動態提示可用同色低透明度 |

### 筆觸與邊緣

- 電線寬 **0.55–1.1**；鳥身 **4–9**，保持筆芯可辨。杆的實際筆芯 **2.2–4.5**，外側吸水擴散 **4–10**；不要把擴散寬度當成實心杆寬。
- 枯／潤約 **5／95**；飛白不超過 **3–5%**。飛白只在尾尖、少量收筆，主要肌理來自濕墨移動。
- 雲與山的過渡寬 **8–25**，局部淡水痕可達 **30**；琴面與掌緣 **5–14**。邊緣有不均勻的暈散、淡水圈和少量積墨，不能整個物體均勻套模糊。
- 鳥頭與五線最清楚；琴弦、徽、岳山保留可讀筆芯，外緣可有 **0.5–1.5** 的微滲；杆、琴框與手掌則讓一部分輪廓融入紙色。
- 夕陽只有 **1–3** 的吸水毛邊，內部保持平色，不做徑向亮心。雲山的暈染不擴成包圍夕陽的光。

### 紙紋

粒徑 **0.4–1.4**，亮度擾動 **±2–3/255**；纖維長 **2–7**、寬 **0.2–0.5**，全幅低對比。濕染區的吸墨場再加 **12–35** 尺度、強度約 **3–7%** 的緩慢起伏；留白保持清潔，不能把「氤氳」做成覆蓋全圖的霧層。

### 畫法與構圖各自負責什麼

**靠畫法：** 局部濕度、顏料擴散、水痕與邊緣積墨，拉開清晰線鳥和濕雲山的層次。**靠構圖：** 遠山仍貼下緣、雲仍扁長、琴仍在底部，留白位置不變。柔和來自選擇性洇墨，不靠搬遠主體、加雲或換成霧景。

## Canvas 2D：不用圖片或外部紋理的做法

### 1. 毛筆是一段有壓力的路徑

對現有貝塞爾路徑按弧長每 **0.7–1.4** 取樣。每點求切線及法線，將中心線左右各偏移半個筆寬，連成可填色的帶狀 `Path2D`。筆寬可用：

`w(t) = baseWidth * pressure(t) * (1 + 0.12 * slowNoise(t))`

其中 `pressure(t)` 是少數幾個控制值插值的提按曲線，起筆稍頓、行筆展開、末端收尖；`slowNoise` 是固定種子、每 12–40 長度才明顯變化的連續噪聲。再加入 **0.15–0.6** 的微小輪廓偏移，不能抖動中軸到影響電線音高和點擊位置。

枯筆用多條窄筆毫沿同一路徑繪製，每條的偏移、載墨量與缺墨段皆固定。缺墨直接不落墨，露出下面的真紙色；不能用「白色線」覆蓋，否則會擦掉下層山色或琴色。濃墨點也使用少量失圓的輪廓，不畫光滑正圓加描邊。

### 2. 紙紋由數值生成，並參與落墨

啟動或 resize 時計算一次固定種子噪聲：細粒 **0.4–2**、纖維 **2–10**、緩慢紙密度起伏 **12–40**。可用 `ImageData` 改變底色亮度，再以稀疏短線畫纖維。這些全部由程序產生，沒有 PNG 紙紋、照片、外部筆刷 stamp 或生成稿貼圖。

同一紙密度場也調制墨的沉積，例如 `inkAlpha *= 1 - grain * absorbency`。墨下也有紙的作用，避免變成乾淨色面上另疊一張噪點。紙場和筆毫缺口在動畫中不換 seed，鳥移動時也保留自己的筆觸 seed，防止每幀閃爍。

### 3. 濕墨採局部擴散，保留乾筆焦點

先把該筆的覆蓋量寫入局部浮點遮罩；在筆芯之外生成更大的濕紙遮罩。濕紙內按上下左右鄰點擴散顏料：

`aNext = a + k * (aLeft + aRight + aUp + aDown - 4*a)`

使用 `k = 0.10–0.20`，以紙密度和濕度調制局部擴散速度；阻隔處理也要保持每格穩定係數。A/B 的暈邊只需少量迭代；D 用更多迭代或較低解析度的局部遮罩，直到達到上文的像素擴散寬度。濕度逐步下降時，讓水邊保留少量色料形成淡水痕；擴散外緣用噪聲調制，不能是一圈均勻光暈。

此處可用 Canvas 2D 的像素讀寫；運算範圍限於雲、山、杆、琴等各自的包圍盒加滲邊。**不要對整個場景設定 blur，也不要對鳥頭和五線做濕墨擴散。** 七弦、徽與岳山在濕面完成後再畫筆芯；D 的微滲只在筆芯外薄薄處理。

### 4. 圖層、題字與既有函式的接點

繪製次序為：紙 → 天空薄染（僅 C）→ 雲／山 → 單色夕陽 → 原有極淡掃風痕 → 杆 → 五線 → 鳥 → 琴面 → 七弦／十三徽／岳山 → 雙手 → 題字。濕墨渲染先完成，再畫清楚的鳥與線。

- `layoutScene()`、`wireYAt()`、`L.sy`、`HUI` 及手的控制點繼續負責幾何，不改交互與樂理位置。
- `drawSun()` 改為毛邊單色面；目前的兩個 `createRadialGradient()` 不用於這四種方向。
- `drawClouds()` 的橢圓改為寬扁掃筆；`drawDistantWash()` 保留低山路徑，換各稿的色料沉積方式。
- `drawPoles()`、`drawWires()`、`drawBird()`、`drawPiano()` 與 `drawHand()` 共享壓力筆觸，但各自傳入乾濕參數。
- 題字三字可事先以少量貝塞爾中軸筆畫資料描述，再走相同壓力筆刷，不用字圖貼上；放在琴右側，不占用天空或琴面。臨時用字體驗位時，逐字 `fillText` 只作位置校對，筆意交付用程序筆畫。
- 紙、雲山與琴面等靜態程序結果只在尺寸或風格變動時重算；動態鳥、線與手沿用固定噪聲和筆畫資料。

上述是實作建議，這次交付沒有改動應用程式。PNG 用作風格稿，程序版也不應載入它們當畫面底圖。

## 生成與交付記錄

- 使用 **內建 image_gen**；以 `docs/screenshots/wire-score.png` 為構圖參考，四個方向分別生成。
- D 在初稿後額外做了一次「只增強濕墨暈散」的定向修訂，交付的是修訂稿。
- 原生輸出為 1564 × 1006；用 macOS `sips` 重採樣為指定的 **1400 × 900 PNG**，沒有裁切、補景、手動繪畫或合成新增物件。
- 各稿目視核對：兩杆及橫擔、五線、約二十隻線上鳥、夕陽、雲、低山、俯視古琴、七弦、十三徽、岳山、雙手、豎排「電線譜」。
- 生成圖的細小輪廓會有筆墨變化；若後續要求逐像素一致的幾何，以本文件的座標與既有程式佈局為準。

<details>
<summary>完整生成提示詞：共用構圖、四個方向與 D 的修訂</summary>

共用提示詞與各方向提示詞組合後，分別交給內建生成工具；最後一段是 D 的第二次提示詞。


### 共用提示詞

```text
Use case: style-transfer.
Asset type: one PNG style study for the existing Canvas 2D application 電線譜.
Input image: the supplied 1400×900 screenshot is the composition reference and edit target. Repaint it, preserving its exact layout and all requested subjects. Output one landscape image, exactly 1400×900, aspect ratio 14:9, edge-to-edge paper, no border, no presentation mat.
Composition is LOCKED in pixel coordinates on a 1400×900 canvas:
- Huge empty sky above and behind the wires, occupying the upper 630 pixels; bottom instrument region begins at y=635. Do not shrink this empty sky or raise the instrument.
- Two slender telephone poles at x=140 and x=1260, from y=215 to y=635. Each has two short horizontal crossarms centered around y=242 and y=313, little insulator dots; rough humble brush marks, not trees.
- EXACTLY FIVE parallel thin wires span x=140 to x=1260. Their attachment heights are y=270,331,392,454,515. Each bows gently DOWN by only 11 pixels at its midpoint. Keep those exact spacings; do not bundle the wires or add extra wires.
- About 20 tiny perched birds distributed just as in the reference across the middle and lower wires, each only 18–32px wide. Leave top wire empty. A bird is just three economical brush marks: dark ink dot head, pale ink swept body, a tapered tail flick. No feathers, realistic anatomy, eyes, or decorative outlines. Keep the two tiny distant flying-bird ticks in the upper sky.
- Small flat sunset disc at (952,207), radius 40. No glow or halo or shading. A few long, almost disappearing, horizontal cloud brush washes around y=70,120,170,212; keep their placements from the screenshot.
- Extremely low broad distant hills with tops around y=555–600 and bottoms at y=632. Preserve the low silhouettes and huge blank sky; no tall mountains, trees, buildings, water, figures, rocks, or added scenery.
- Bottom: ONE very long narrow GUQIN viewed straight from above, tail left and head right, extent x=210–1190, y=693–847. It must occupy the same width and height as the reference, not be rotated or given perspective. Rough simplified guqin body, gently irregular contour; EXACTLY SEVEN horizontal thin strings across its whole length, EXACTLY THIRTEEN small hui marker dots in a SINGLE row near the far upper edge; place them nonuniformly at the traditional proportional locations. One dark vertical 岳山 bridge near x=1121, y=702–838 and thin 龍齦 at x=234. Keep seven strings separately legible.
- Two disembodied expressive ink-painted hands on the guqin, not full people: left pressing hand at approximately (645,798), wrist entering from the bottom at x=615; right plucking hand around (1102,770), wrist entering from bottom at x=1160. Stylized pale palm sweeps and a few imperfect finger strokes, no realistic skin or nails, no sleeves or accessories.
- Keep the existing tiny faded pitch glyphs at the left of the five wires and left end of the qin if present, without adding labels or instructions. Add the requested exact traditional Chinese calligraphy 電線譜 vertically down the far lower-right blank margin around x=1305, y=747–865: 電 on top, 線 in middle, 譜 bottom. Those three characters only, no seal or signature.
Overall medium: new Chinese ink-wash picture book, inspired by the sparse hand-painted ink animation of 1980s Shanghai Animation Film Studio, Feeling from Mountain and Water, The Cowboy's Flute, The Deer's Bell. Utterly simple, awkwardly graceful brush shorthand, broad unpainted xuan paper; expressive variable pressure, dry splits, wet feathering, visible ink/paper interaction. Shapes are summarized with few brush gestures. Paper texture should be delicate fibers and fine uneven grain, never noisy dirt.
ABSOLUTE AVOIDS: photorealism, 3D, digital vector cleanliness, uniform polished paths, smooth filled ellipses, airbrush gradients, sun glow, lens effects, high saturation, extra colored accents, elaborate Chinese landscape scenery, added people, extra text, caption, variant letter, explanatory text, panels. Keep all exact layout proportions. This is a full scene repaint, not a four-up sheet.
```

### A 方向

```text
Direction for THIS image only:
A · 淡墨留白. 90% pale warm ink and natural nearly white xuan paper. Palette: paper #F2EDE1; light ink #D5D0C4, middle ink #9D9A90, concentrated ink #57574F used sparingly. ONLY chromatic pigment: pale muted ochre #B68E74 for the small flat sunset; all clouds, hills, hands and instrument are neutral ink/paper. Preserve enormous clear negative space. Poles and guqin edges are delicate, gently pressure-varying pale brush lines, not geometric borders; tiny bird heads give the darkest marks. Broad distant hill washes barely appear at 8–13% ink. Very subtle 0.5–2px xuan fibers. Most like the restraint and quiet breath of Feeling from Mountain and Water.
```

### B 方向

```text
Direction for THIS image only:
B · 礦物色塊. A sparse ink picture-book painting with exactly THREE desaturated mineral hues: low distant hill masses in pale stone blue #899C9F, guqin top in muted ochre #B4987C, small flat sun in pale cinnabar #BA8172. Paper #F1E9D9; three neutral ink densities #CBC6B9 #85867C #494D46. All pigment patches are horizontal broad brush sweeps with irregular broken edges, paper gaps and uneven deposits, never clean solid fills. The hills stay as LOW broad simple mounds at y=555–632. The narrow qin at y=693–847 is a flat top view, its ochre wash under the seven clear strings and thirteen tiny hui. Few colors, large paper reserve, more graphic picture-book rhythm, no realistic grain of wood, no decorative carving.
```

### C 方向

```text
Direction for THIS image only:
C · 枯筆焦墨. The most firm and spare direction: charcoal-black DRY BRUSH for the two poles, small birds and guqin perimeter. Paper #EFE7D5; neutral inks #C8C1AE #77756A #343A34. Brush strokes have conspicuous split hairs and paper-white dry gaps, pressure changes and abrupt starts/stops, not thick generic outlines. Keep wires fine, 0.7–1.6px, tautly legible with gentle downward sag. Sky has a single extremely faint uneven gamboge wash #D7C792, with a small muted ochre sunset #AF8B66. Maximum two pigments plus ink. Sky wash must be paper-like dilute pigment with irregular density, NOT gradient light. Low hills in pale dry dragged ink, qin surface largely paper with dry side sweeps; hands simplified in medium ink. Strongest contrast among the four, yet at least 70% empty quiet paper.
```

### D 方向

```text
Direction for THIS image only:
D · 水暈氤氳. The softest direction: wet-on-wet pale ink washes, low hills and clouds bleed irregularly into warm xuan paper with water tide edges. Paper #F1ECE1; light ink #D2D2C8, middle ink #929A91, dark ink #4F5A52. Tiny amount of blue-gray 花青 #A8B6B4 only in the low distant hills and clouds, small muted ochre sunset #BA9782. At most two chromatic pigment families. No bright color, no sun glow, no photographic mist or smooth digital Gaussian fog. Sun has a softly ragged wet edge but flat interior. Birds and the FIVE wires are the only truly crisp things; poles, hands and guqin body have restrained water-feathered margins while seven qin strings and thirteen hui remain readable. Softness must come from irregular pooling, blooms and paper absorption with blank paper between washes, never uniform blur across the scene.
```

### D 定向修訂（以上次 D 為輸入）

```text
Use case: style-transfer. Edit target: image 1, the D ink-wash 電線譜 style study just generated. Preserve the exact composition, all shapes, positions and all subjects, its 14:9 landscape aspect, five sagging wires, twenty tiny birds, seven guqin strings, thirteen marker dots, two hands and the exact 電線譜 calligraphy in the lower right. Make ONE focused style correction: this is the WETTEST, SOFTEST wash direction, so significantly soften the clouds, low distant hills, pole edges, guqin body and pale hand palms into wet ink on damp xuan paper. Use dilute gray-blue ink washes with irregular feathery bleed, transparent blooms, occasional light water tide marks and pooling; let clouds and low hills partly dissolve into large empty paper. The poles remain in the same two positions with visible crossarms, but have slightly absorbed ink edges, not hard dark borders. The qin edges fade into paper while all seven strings, thirteen dots and 岳山 remain readable. Bird heads, tiny swept bodies and five wires are the clearest focal marks. Keep the little sunset a flat pale ochre disc with water-soft edge, NO halo or radial gradient. Keep only two chromatic pigment families, gray-blue 花青 #A8B6B4 in hills/clouds and dilute ochre #BA9782 for the sun; any small active string color and original tiny pitch glyphs should use that same ochre family, not red. Paper #F1ECE1; neutral ink steps #D2D2C8 #929A91 #4F5A52. Paper fiber texture must be subtle, finer and lower contrast than the current image. Preserve huge blank sky and exact low hill silhouettes; do not add scenery, dots, seal, captions, decorative strokes, people or buildings. No 3D, no vector edges, no uniform digital blur. Output exactly 1400×900 PNG, full-bleed paper, no crop or border.
```

</details>

