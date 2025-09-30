# 弹幕文字动画 🎆

一个模仿哔哩哔哩弹幕效果的文字动画项目，支持多种绚丽的动画图案展示。

## ✨ 项目特色

- 🎯 **六种动画效果**：烟花、花朵、爱心、螺旋、波浪、星星
- 🎨 **炫彩动画**：彩虹渐变文字、缩放旋转、粒子效果  
- 📱 **响应式设计**：完美适配桌面和移动端
- 🚀 **流畅体验**：CSS3硬件加速动画，60fps流畅运行
- 💡 **实时交互**：输入文字立即生成动画效果
- 🎪 **哔哩哔哩风格**：粉色主题，现代化UI设计

## 🎬 动画效果预览

### 🎆 烟花爆炸
从中心点向外放射状爆炸，模拟真实烟花绽放效果

### 🌸 花朵绽放  
8瓣花朵形状，文字沿花瓣弧线优美展开

### 💝 爱心浪漫
数学参数方程绘制的爱心轮廓，适合表白场景

### 🌀 螺旋展开
阿基米德螺旋线，文字从内到外旋转展开

### 🌊 波浪律动
三层正弦波浪，文字随波起伏律动

### ⭐ 闪耀星星
五角星轮廓，文字沿星形边缘闪耀登场

## 🚀 快速开始

### 在线体验
访问 [Lovable 项目页面](https://lovable.dev/projects/d4f23e7d-57c8-40be-a7c0-3bdcf5561cde) 立即体验

### 本地运行

```bash
# 克隆项目
git clone <YOUR_GIT_URL>

# 进入目录
cd <YOUR_PROJECT_NAME>

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🎮 使用说明

1. **选择图案类型** - 在底部选择器中选择你喜欢的动画效果
2. **输入文字内容** - 在输入框中输入想要展示的文字（最多50字）  
3. **发送弹幕** - 点击发送按钮或按回车键
4. **观赏动画** - 欣赏文字组成的绚丽图案动画

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS + CSS3 动画
- **UI 组件**: Shadcn/UI 
- **图标库**: Lucide React
- **通知组件**: Sonner
- **动画计算**: 数学参数方程 + Canvas 2D

## 📂 项目结构

```
src/
├── components/
│   ├── ui/                 # Shadcn UI 组件库
│   ├── DanmakuText.tsx     # 弹幕文字动画核心组件
│   ├── DanmakuInput.tsx    # 弹幕输入组件
│   └── DanmakuCanvas.tsx   # 弹幕画布容器
├── pages/
│   └── Index.tsx           # 主页面
├── lib/
│   └── utils.ts            # 工具函数
├── hooks/                  # React Hooks
└── index.css              # 全局样式和设计令牌
```

## 🎨 设计系统

项目采用基于 HSL 的设计令牌系统：

```css
/* 弹幕专用颜色 */
--danmaku-pink: 330 81% 60%      /* 粉色主题 */
--danmaku-blue: 213 93% 68%      /* 蓝色点缀 */
--danmaku-yellow: 48 98% 70%     /* 黄色高亮 */
--danmaku-green: 142 71% 45%     /* 绿色自然 */
--danmaku-purple: 263 85% 70%    /* 紫色神秘 */
```

## 🔧 核心算法

### 爱心参数方程
```javascript
x = 16 * sin³(t) * 3
y = -(13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)) * 3
```

### 五角星顶点计算
```javascript
angle = (i * π) / 5
radius = i % 2 === 0 ? 90 : 45  // 外圈内圈半径
x = cos(angle - π/2) * radius
y = sin(angle - π/2) * radius
```

## 🎯 性能优化

- **按需渲染**: 动画完成后自动清理DOM节点
- **硬件加速**: 使用 `transform` 和 `opacity` 触发GPU加速
- **防抖处理**: 避免快速连续发送造成性能问题
- **内存管理**: 及时清理定时器和事件监听器

## 📱 兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+  
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ 移动端 iOS Safari、Chrome Mobile

## 🚀 部署

### Lovable 一键部署
1. 打开 [Lovable 项目](https://lovable.dev/projects/d4f23e7d-57c8-40be-a7c0-3bdcf5561cde)
2. 点击右上角 **Publish** 按钮
3. 获得生产环境链接

### 自定义域名
在 Project > Settings > Domains 中连接你的自定义域名

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目基于 MIT 协议开源。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 灵感来源于 [哔哩哔哩](https://www.bilibili.com) 弹幕效果
- UI 组件基于 [Shadcn/UI](https://ui.shadcn.com/)
- 图标来源于 [Lucide](https://lucide.dev/)

---

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！