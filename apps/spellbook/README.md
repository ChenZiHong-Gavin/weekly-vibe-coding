# 霍格沃茨魔法咒语练习（Spellbook）

魔法主题的语音练习与互动展示项目。通过前端录音与后端音素识别，比对用户的发音与目标咒语的音素，给出匹配分数，并在页面呈现对应的魔法效果。

## 项目概览
- 前端以卡片形式展示每本书的咒语，支持分类筛选与动画效果
- 练习对话框支持录音、实时波形可视化、结果提示与成功动画
- 后端使用音素识别模型将音频转为音标，再与目标音素进行相似度计算
- 全量支持前端数据集中列出的咒语（含英文拉丁名与中文名称）

## 主要功能
- 语音录制与可视化
  - 浏览器侧统一封装为 `audio/wav`（16kHz/单声道）并上传
  - 实时波形展示，便于确认录音输入
- 音素识别与评分
  - 路由 `POST /cast_spell` 接收 `multipart/form-data`，字段：`file`、`spell_name`
  - 计算用户音素与目标音素的编辑距离相似度，返回百分比分数与成功标记
- 魔法动画与交互
  - 每个咒语拥有专属视觉效果与说明
  - 成功施法仅高亮当前卡片，定时自动恢复

## 技术栈
- 前端
  - `React + Vite + TypeScript`
  - UI：`shadcn/ui`、`TailwindCSS`
  - 动效：`framer-motion`
- 后端
  - `FastAPI`
  - 识别：`allosaurus`（音素识别）
  - 字符串相似度：`Levenshtein`

## 目录结构（摘要）
- `frontend/` 前端工程
  - `src/pages/BookPage.tsx` 书籍页、分类筛选与练习对话框入口
  - `src/components/PracticeDialog.tsx` 练习对话框（录音、波形、结果）
  - `src/components/MiniSpellCard.tsx` 咒语卡片组件
  - `src/components/SpellEffects.tsx` 咒语动画效果集合
  - `src/worklets/pcm-processor.js` 音频 Worklet（低延迟 PCM 收集）
  - `src/hooks/useBackendVoiceRecognition.ts` 录音、WAV 封装与上传逻辑
  - `src/data/spells.ts` 咒语数据源（书卷、分类、触发词）
- `backend/` 后端工程
  - `app.py` FastAPI 应用、`/cast_spell` 路由、评分与目标音素表 `SPELL_BOOK`
  - `requirements.txt` 后端依赖列表

## 运行流程（逻辑）
- 前端
  - 选择咒语卡片 → 打开练习对话框 → 开始录音 → 停止后上传 `recording.wav`
- 后端
  - 接收音频与咒语名 → 识别音素 → 与 `SPELL_BOOK` 目标音素比对 → 返回分数与成功标记
- 前端
  - 显示结果与匹配度，触发成功动画并定时恢复

## 关键点
- 统一音频格式：浏览器侧封装为 `WAV (16kHz/mono)`，与识别端保持一致
- 评分方式：对去空格的音素串进行编辑距离相似度计算（`(1 - dist / max_len) * 100`）
- 只影响当前卡片：成功施法仅激活当前卡片的效果，避免状态泄漏

## 可扩展性
- 新增咒语：在 `frontend/src/data/spells.ts` 中追加条目（包含 `latinName`、`triggerWords`、`effect` 等）
- 目标音素：在 `backend/app.py` 的 `SPELL_BOOK` 中为对应拉丁名追加目标音素串
- 动画效果：在 `frontend/src/components/SpellEffects.tsx` 中为新咒语添加视觉效果分支

## 免责声明
- 识别准确度依赖本地音频设备与环境噪声，以及识别模型能力；建议在安静环境下清晰朗读以获得更高分数
