# Spin Art

一款基于 React、TypeScript 与 Tailwind CSS 的实时旋转绘画小工具，通过旋转画布轻松创作出绚丽的几何图案。

## 功能亮点
- **实时渲染**：利用 `requestAnimationFrame` 提升动画流畅度。
- **响应式布局**：桌面与移动端均可良好体验，支持触控操作。
- **导出图片**：点击即可将作品保存为 PNG。
- **快速启动**：得益于 Vite，开发环境秒级启动。

## 快速开始

### 环境要求
- Node.js ≥ 18
- 包管理工具：pnpm / npm / yarn

### 安装依赖
```bash
# 任选其一
pnpm install
npm install
yarn install
```

### 启动开发服务器
```bash
pnpm dev    # 或 npm run dev / yarn dev
```
浏览器访问 <http://localhost:5173> 查看效果。

### 生产构建
```bash
pnpm build   # 或 npm run build / yarn build
```

### 本地预览生产包
```bash
pnpm preview # 或 npm run preview / yarn preview
```
