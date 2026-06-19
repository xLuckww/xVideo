<div align="center">

# xVideo

### 简洁高效的视频下载工具

[![Build Windows](https://github.com/xLuckww/xVideo-windows/actions/workflows/build-windows.yml/badge.svg)](https://github.com/xLuckww/xVideo-windows/actions/workflows/build-windows.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/xLuckww/xVideo-windows)](https://github.com/xLuckww/xVideo-windows/releases)

[下载安装](#下载安装) · [功能特性](#功能特性) · [使用说明](#使用说明) · [常见问题](#常见问题)

</div>

---

## 简介

xVideo 是一款基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的图形化视频下载工具，支持从 YouTube、Bilibili、Twitter 等 1000+ 网站下载视频。

**核心特点：**
- 🎯 简洁直观的界面，粘贴链接即可下载
- 🎬 支持多种视频格式和质量选择
- 📦 支持批量下载，一次处理多个视频
- 🎵 支持提取纯音频（MP3/AAC/FLAC）
- 📝 支持下载和嵌入字幕
- 🚫 支持 SponsorBlock 自动跳过广告片段

## 下载安装

前往 [Releases](https://github.com/xLuckww/xVideo-windows/releases) 页面下载最新版本：

| 平台 | 文件 | 大小 |
|------|------|------|
| Windows | `xVideo_1.0.0_x64.msi` | ~23 MB |
| macOS (Apple Silicon) | `xVideo_1.0.0_aarch64.dmg` | ~4 MB |

**系统要求：**
- Windows 10 或更高版本
- macOS 11.0 或更高版本（Apple Silicon）

## 功能特性

### 📥 单个下载
- 粘贴视频链接，一键解析
- 自动获取视频信息（标题、封面、时长）
- 支持选择视频质量（1080p/720p/480p/360p）
- 支持提取纯音频
- 下载完成后自动合并视频和音频

### 📦 批量下载
- 支持一次输入多个链接
- 支持从文本文件导入链接
- 支持播放列表下载
- 可设置并发下载数量
- 跳过已下载的视频

### 🎬 后处理选项
- **嵌入字幕** - 将字幕嵌入视频文件
- **嵌入封面** - 将缩略图作为视频封面
- **嵌入元数据** - 添加标题、作者等信息
- **嵌入章节** - 添加视频章节标记
- **去除广告** - 通过 SponsorBlock 自动跳过赞助内容

### ⚙️ 高级设置
- Cookie 来源配置（支持 Chrome/Firefox/Safari/Edge）
- 代理服务器设置
- 下载限速
- 自动更新
- 自定义文件名模板

## 使用说明

### 基本下载
1. 复制视频链接
2. 粘贴到输入框
3. 点击「解析」
4. 选择格式和质量
5. 点击「开始下载」

### 批量下载
1. 切换到「批量下载」页面
2. 每行输入一个视频链接
3. 点击「解析链接」
4. 点击「开始批量下载」

### 遇到问题？
如果无法解析某些视频，请前往 **设置** → **Cookie 来源**，选择你常用的浏览器。这将使用你浏览器中的登录信息来访问受限内容。

## 技术栈

| 技术 | 说明 |
|------|------|
| [Tauri 2.0](https://tauri.app/) | 跨平台桌面应用框架 |
| [React](https://react.dev/) | 前端 UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全的 JavaScript |
| [Rust](https://www.rust-lang.org/) | Tauri 后端语言 |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 视频下载引擎 |

## 从源码构建

### 前置要求
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (latest stable)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Windows)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/) (macOS)

### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/xLuckww/xVideo-windows.git
cd xVideo-windows

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建发布版本
npm run tauri build
```

构建产物位于：
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`

## 赞赏

如果 xVideo 对你有帮助，可以请作者喝杯咖啡 ☕

<div align="center">

| 支付宝 | 微信支付 |
|:------:|:--------:|
| ![支付宝](public/donate/alipay.png) | ![微信支付](public/donate/wechat.png) |

</div>

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载引擎
- [Tauri](https://tauri.app/) - 优秀的跨平台应用框架
- [React](https://react.dev/) - 用户界面构建库

---

<div align="center">

**如果觉得好用，请给个 ⭐ Star 支持一下！**

</div>
