# 📖 Paper2Novel — 将 arXiv 论文变成小说

将任意 arXiv 学术论文转化为引人入胜的小说，支持 10 种文学风格。**纯前端实现，无需后端服务器。**

## ✨ 特性

- 🔗 粘贴 arXiv 链接，浏览器直接提取全文（通过 ar5iv HTML 版本，内置多层 CORS 代理 fallback）
- ✂️ 智能分块：论文按段落边界切分，保证每块语义完整
- ✍️ SSE 流式输出：浏览器直连 OpenAI API，实时看到 AI 逐章创作
- 📚 10 种小说风格：科幻、奇幻、悬疑推理、武侠、言情、恐怖、幽默讽刺、童话、仙侠修真、战争史诗
- 💡 知识点注释：每章自动标注论文核心知识点，以侧边栏 marginalia 形式展示，兼顾趣味与学习
- 📖 内置完整示例：预置《注意力法则》（基于 *Attention Is All You Need*）科幻改写，无需 API Key 即可体验阅读
- 🌐 多语言输出：中文 / English / 日本語
- 🔒 隐私安全：API Key 仅存储在浏览器 localStorage，数据不经过任何中间服务器
- 🎨 Claymorphism Landing Page：完整的产品着陆页，包含 Hero、工作原理、风格展示、用户评价、Demo 阅读器、转换器等模块
- 📋 一键复制：生成完成后可一键复制全文

## 🚀 快速开始

### 方式一：本地服务器

```bash
# 用任意静态服务器打开项目根目录，比如：
python -m http.server 3000
# 或
npx serve .
```

然后浏览器打开 `http://localhost:3000`

### 方式二：直接双击

直接在浏览器中打开 `index.html` 即可（部分浏览器可能因 CORS 限制需要使用本地服务器）。

### 配置 API Key

1. 点击右上角 ⚙️ **API 设置**
2. 输入你的 OpenAI API Key
3. 可选：修改 API Base URL（支持兼容 OpenAI 格式的第三方 API）
4. 可选：修改模型名称（默认 gpt-4o）
5. 点击保存 — 设置保存在浏览器 localStorage 中

> 💡 不配置 API Key 也能体验内置的《注意力法则》示例小说。

## 🏗️ 项目结构

```
arxiv-to-novel/
├── index.html          # 主页面（完整 Landing Page）
├── style.css           # Claymorphism 样式 + Marginalia 知识点注释布局
├── app.js              # 核心逻辑（论文抓取、CORS 代理、分块、LLM 流式调用、UI 渲染）
├── demo-novel.js       # 内置示例小说数据（《注意力法则》6 章完整内容）
└── README.md
```

## ⚙️ 工作原理

1. **论文提取**：浏览器从 ar5iv.labs.arxiv.org 获取 HTML 版论文，使用 DOMParser 解析提取全文。内置多层 CORS 代理（直连 → allorigins → corsproxy.io）自动 fallback
2. **智能分块**：按段落边界切分，保证每个 chunk 不超过指定字符数（默认 6000）
3. **流式改写**：浏览器直连 OpenAI API，每个 chunk 通过 LLM 改写成对应风格的小说章节，SSE 实时推送
4. **叙事连贯**：开篇建世界观、中间推进情节、终章升华主题
5. **知识点标注**：AI 在每个段落末尾自动添加 `[[知识点：...]]` 注释，前端以侧边栏形式渲染

## 📝 配置说明

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| API Key | OpenAI API 密钥 | 必填 |
| Base URL | API 基础 URL（支持第三方兼容接口） | `https://api.openai.com/v1` |
| 模型 | 使用的模型 | `gpt-4o` |
| Chunk 大小 | 每块文本的字符数上限 | `6000` |
| 输出语言 | 小说输出语言 | 中文 |

> ⚠️ 注意：ar5iv 通常只收录 2019 年后的论文。如果遇到无法提取全文的情况，请尝试较新的论文。

## License

MIT
