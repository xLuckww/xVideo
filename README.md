<div align="center">

# xVideo

### 简洁高效的视频下载工具

[![Build Windows](https://github.com/xLuckww/xVideo/actions/workflows/build-windows.yml/badge.svg)](https://github.com/xLuckww/xVideo/actions/workflows/build-windows.yml)
[![Release](https://img.shields.io/github/v/release/xLuckww/xVideo)](https://github.com/xLuckww/xVideo/releases)

[下载安装](#下载安装) · [功能特性](#功能特性) · [使用说明](#使用说明) · [从源码构建](#从源码构建)

</div>

---

## 简介

xVideo 是一款基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的图形化视频下载工具，支持从 YouTube、Bilibili、抖音、Twitter 等 1000+ 网站下载视频。

**开箱即用**：应用自带下载引擎、ffmpeg 和 JavaScript 运行时，无需安装 Python、yt-dlp 或 Node.js。

- 🎯 粘贴链接（或整段分享文案）即可解析下载
- 🎬 自由选择画质、格式，或一键提取音频（MP3 / M4A / FLAC 等）
- 📦 批量下载，播放列表自动展开，可设置并发和跳过已下载
- 📝 单独下载字幕，或在下载视频时嵌入字幕
- 🔄 下载引擎可在应用内一键更新
- 💬 报错全部为中文，并附处理建议

## 下载安装

前往 [Releases](https://github.com/xLuckww/xVideo/releases) 下载最新版本：

| 平台 | 文件 |
|------|------|
| macOS（Apple Silicon） | `xVideo_<版本>_aarch64.dmg` |
| Windows x64 | `xVideo_<版本>_x64-setup.exe` 或 `xVideo_<版本>_x64_en-US.msi` |

**系统要求**：macOS 11 及以上（Apple Silicon）；Windows 10 及以上。

> macOS 版目前未经 Apple 公证，首次打开如提示"无法验证开发者"，请在 Finder 中右键点击 xVideo →「打开」，
> 或在「系统设置 → 隐私与安全性」中点击「仍要打开」。

## 功能特性

### 📥 单个下载
- 自动获取标题、封面、时长等信息
- 视频格式列表按画质排序，或选择「最佳质量」自动合并最佳音轨
- 仅音频：可转换为 MP3 / M4A / AAC / OPUS / FLAC / WAV
- 下载任务列表：实时进度、速度、剩余时间，可随时取消

### 📦 批量下载
- 每行一个链接，或从文本文件导入；播放列表链接自动展开
- 统一格式、并发下载数、跳过已下载、出错时继续

### 🎬 后处理
- 嵌入字幕、封面、元数据、章节
- 通过 SponsorBlock 移除赞助片段（YouTube）

### ⚙️ 设置
- 浏览器 Cookie（Chrome / Firefox / Safari / Edge / Brave）或手动选择 cookies.txt
- 代理、限速、重试次数、并发分片数、文件名模板
- 下载引擎版本查看与在线更新

## 使用说明

1. 复制视频链接（抖音等可直接复制整段分享文案）
2. 粘贴到「下载」页的输入框，点击「解析」
3. 选择格式，点击下载，在任务列表查看进度

**遇到无法解析的情况？** 在「下载」页启用 Cookie，选择已登录该网站的浏览器。
macOS 首次读取浏览器 Cookie 需要在「系统设置 → 隐私与安全性 → 完全磁盘访问权限」中授权 xVideo。
更多问题见 [产品文档](docs/产品文档.md#4-常见问题)。

## 技术栈

| 组件 | 说明 |
|------|------|
| [Tauri 2](https://tauri.app/) + Rust | 桌面框架与后端（进程管理、Cookie 处理、引擎更新） |
| React + TypeScript | 界面 |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 下载引擎，从源码以 PyInstaller onedir 构建并随应用发布 |
| ffmpeg / ffprobe | 合并音视频、转码、嵌入字幕和封面 |
| [deno](https://deno.com/) | YouTube 页面校验所需的 JavaScript 运行时 |

应用包内的组件：

| 组件 | macOS 位置 |
|------|-----------|
| 下载引擎 | `Contents/Resources/engine/yt-dlp_macos/` |
| ffmpeg / ffprobe / deno | `Contents/MacOS/` |
| yt-dlp 插件（抖音修补等） | `Contents/Resources/yt-dlp-plugins/` |

在线更新的引擎来自 yt-dlp 官方 GitHub 发布，校验 SHA256 后安装到应用数据目录；新版 xVideo 自带的引擎会自动取代旧的下载版。

## 从源码构建

### macOS（Apple Silicon）

需要 Node.js、Rust、[uv](https://github.com/astral-sh/uv)，以及与本仓库同级的 yt-dlp 源码目录（`../yt-dlp`，可用 `YTDLP_SRC` 指定）。

```bash
npm install
npm run engine          # 构建引擎并下载 ffmpeg / deno（首次或升级引擎时运行）
npm run tauri dev       # 开发运行
npx tauri build         # 打包；设置 APPLE_SIGNING_IDENTITY 可用开发者证书签名
```

`npm run engine -- engine` 只重建引擎，`npm run engine -- tools` 只下载工具。产物位于
`src-tauri/engine/` 和 `src-tauri/binaries/`（已 gitignore）。

### Windows

由 GitHub Actions 工作流 [build-windows.yml](.github/workflows/build-windows.yml) 构建：在 Actions 页面手动运行，
可指定 yt-dlp 的提交，填写 Release 标签时会把安装包上传到该 Release。

### 日志

解析时 yt-dlp 的完整日志位于 `~/Library/Logs/com.xvideo.desktop/`（Windows：`%LOCALAPPDATA%\com.xvideo.desktop\logs`）。

## 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp)（Unlicense）
- [FFmpeg](https://ffmpeg.org/)（随应用分发的构建为 GPL 许可）
- [deno](https://deno.com/)（MIT）
