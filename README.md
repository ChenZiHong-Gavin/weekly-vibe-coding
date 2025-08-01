# weekly-vibe-coding

![Project Status: Active](https://img.shields.io/badge/status-active-success.svg) ![Progress](https://img.shields.io/badge/Ideas-1%2F100-blue)

用提示词实现一百个idea。

## 目录

- [关于项目](#关于项目)
- [已实现的应用](#已实现的应用)
- [技术栈](#技术栈)
- [如何运行](#如何运行)
- [贡献](#贡献)
- [License](#license)

## 关于项目

`weekly-vibe-coding` 是一个实验性项目，旨在通过每周一次Vibe Coding，使用Prompt来快速构建和实现有趣的想法。

每个应用都是一个独立的子项目，存放在 `apps` 目录下。

## 已实现的应用

1.  **[Dice Verse](https://chenzihong-gavin.github.io/weekly-vibe-coding/dice-verse/)** (`apps/dice-verse`)
    - 一个创意写作工具，让你在方格中用AI生成的骰子创作诗歌。


## 如何运行

以 `dice-verse` 应用为例，在本地运行该项目的步骤如下：

1.  克隆仓库:
    ```bash
    git clone https://github.com/chenzihong-gavin/weekly-vibe-coding.git
    cd weekly-vibe-coding
    ```

2.  进入应用目录并安装依赖:
    ```bash
    cd apps/dice-verse
    npm install
    ```

3.  启动开发服务器:
    ```bash
    npm run dev
    ```

## 贡献

无论是提出新的想法、报告Bug，还是提交代码，欢迎任何形式的贡献！

如果您有兴趣贡献，请遵循以下步骤:

1.  Fork 本仓库。
2.  创建一个新的分支: `git checkout -b feature/YourAmazingIdea`。
3.  提交您的更改: `git commit -m 'Add some AmazingIdea'`。
4.  将您的分支推送到远程: `git push origin feature/YourAmazingIdea`。
5.  创建一个 Pull Request。

## License

本项目使用 [MIT License](LICENSE) 授权。
