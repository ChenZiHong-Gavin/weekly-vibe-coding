# Prompt for Real-to-AI

```
做一个网页工具叫"Real-to-AI"，功能是把真实照片伪装成AI生成的截图。

功能需求：
1. 用户上传一张真实照片
2. 选择AI工具模板：ChatGPT对话、Midjourney（Discord风格）、Stable Diffusion WebUI（含界面截图和img2img对比两种模式）、ComfyUI节点工作流
3. 自动生成对应工具的截图效果，包含完整的UI细节（聊天气泡、参数面板、节点连线等）
4. 支持自定义prompt文字、用户名、时间戳
5. 支持手机截图和桌面截图两种导出尺寸
6. 导出为PNG，支持复制到剪贴板和系统分享
7. 可选水印

技术要点：
- ChatGPT和Midjourney模板需要手机/桌面双布局
- 使用Canvas API做图片滤镜（替代CSS filter，兼容html2canvas导出）
- img2img对比模式用Sobel边缘检测生成素描效果
- ComfyUI模板用SVG贝塞尔曲线画节点连线
```
