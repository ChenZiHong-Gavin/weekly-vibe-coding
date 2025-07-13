# 诗韵方格 dice-verse

一个创意写作工具，让你在方格中用AI生成的骰子创作诗歌。

[![Vercel Demo](https://img.shields.io/badge/Vercel-black?style=for-the-badge&logo=vercel)](https://weekly-vibe-coding.vercel.app/)
[![GitHub Page Demo](https://img.shields.io/badge/GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://your-username.github.io/dice-verse)

![dice-verse](./images/dice-verse.png)

## 功能特点

- 🎲 **智能连贯词汇生成**: 使用LLM API（如OpenAI GPT）根据主题顺序生成具有连贯性和关联性的诗意词汇
- 🎨 **美观界面**: 现代化的响应式设计，支持移动端和web端
- 🔄 **词汇旋转**: 点击骰子可以切换不同的词汇选项
- 📋 **一键导出**: 完成创作后可以一键复制诗歌到剪贴板

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
yarn install
```

### 2. 配置LLM API（可选）

为了使用AI生成词汇功能，你需要配置LLM API密钥：

1. 复制环境变量示例文件：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，添加你的API密钥：
   ```
   VITE_OPENAI_API_KEY=your_actual_api_key_here
   ```

3. 获取API密钥：
   - **OpenAI**: 访问 [OpenAI API Keys](https://platform.openai.com/api-keys) 获取密钥
   - 其他LLM提供商也可以通过修改 `src/services/llmService.ts` 来支持

**注意**: 如果不配置API密钥，系统会自动使用内置的备用词汇库，仍然可以正常使用。

### 3. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问 `http://localhost:8080` 开始使用。

## 使用说明

1. **设置阶段**: 输入诗歌主题，为每个格子设置需要的字数（1-5字）
2. **生成阶段**: 点击"生成AI词汇骰子"，系统会根据主题顺序生成连贯相关的词汇，后续词汇会参考前面已生成的词汇
3. **创作阶段**: 点击骰子切换词汇，组合成你的诗歌作品
4. **导出作品**: 完成后点击"导出诗歌"复制到剪贴板

## 技术栈

- **前端框架**: React + TypeScript
- **样式**: Tailwind CSS
- **构建工具**: Vite
- **UI组件**: Radix UI + shadcn/ui
- **状态管理**: React Hooks
- **API集成**: 支持OpenAI GPT等LLM服务，具备上下文感知的连贯词汇生成

## 项目结构

```
src/
├── components/          # UI组件
│   ├── Grid.tsx        # 主网格组件
│   ├── TitleGrid.tsx   # 标题网格组件
│   ├── Dice.tsx        # 骰子组件
│   └── ui/             # 基础UI组件
├── services/           # 服务层
│   └── llmService.ts   # LLM API服务
├── pages/              # 页面组件
│   └── Index.tsx       # 主页面
└── hooks/              # 自定义Hooks
```

## 自定义配置

### 修改LLM提供商

编辑 `src/services/llmService.ts` 文件，修改API配置：

```typescript
const LLM_CONFIG = {
  apiUrl: 'your_llm_api_endpoint',
  apiKey: import.meta.env.VITE_YOUR_API_KEY,
  model: 'your_model_name'
};
```

### 自定义备用词汇

在 `llmService.ts` 的 `generateFallbackWords` 函数中修改备用词汇库。

### 词汇生成连贯性

系统采用顺序生成策略，确保词汇之间的连贯性：

1. **上下文感知**: 每次生成新词汇时，会参考之前已生成的词汇作为上下文
2. **意境呼应**: 新词汇与已有词汇在意境、情感或主题上形成关联
3. **进度可视**: 实时显示生成进度，让用户了解当前状态
4. **错误恢复**: 单个词汇生成失败时自动使用备用方案，不影响整体流程

## 部署

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License

---

**项目信息**
- **Lovable URL**: https://lovable.dev/projects/0c629b81-7c38-4527-96f5-95356e675c64
