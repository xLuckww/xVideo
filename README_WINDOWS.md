# xVideo - Windows 版

一个基于 yt-dlp 的图形化视频下载工具，支持从 YouTube、Bilibili 等 1000+ 网站下载视频。

## 功能特性

- 粘贴链接即可下载视频
- 支持选择视频格式和质量
- 支持批量下载
- 支持下载字幕
- 支持提取音频
- 支持嵌入元数据、封面、字幕
- 支持 SponsorBlock 去广告

## 构建 Windows 版本

### 方法一：使用 GitHub Actions（推荐）

1. 将此文件夹推送到 GitHub 仓库
2. 在 GitHub Actions 页面点击 "Run workflow"
3. 等待构建完成（约 10-15 分钟）
4. 下载 Artifacts 中的 `.msi` 安装包

### 方法二：在 Windows 电脑上本地构建

#### 前置要求

1. **Node.js** - https://nodejs.org/
2. **Rust** - https://rustup.rs/
3. **Visual Studio Build Tools** - https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - 安装时选择 "C++ build tools" 工作负载

#### 构建步骤

```bash
# 双击运行 build.bat
# 或手动执行：
npm install
npm run tauri build
```

构建完成后，安装包在：`src-tauri/target/release/bundle/msi/`

## 系统要求

- Windows 10 或更高版本
- WebView2 运行时（Windows 10/11 通常已预装）

## 技术栈

- 前端：React + TypeScript
- 后端：Rust (Tauri 2.0)
- 下载引擎：yt-dlp
