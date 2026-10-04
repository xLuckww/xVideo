# xVideo

基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的桌面视频下载工具（Tauri 2 + React + TypeScript）。

应用自带全部运行组件，用户无需安装 Python、yt-dlp 或 ffmpeg：

| 组件 | 来源 | 位置（应用包内） |
|------|------|------------------|
| 下载引擎 yt-dlp | 从本地 yt-dlp 源码用 PyInstaller `--onedir` 构建 | `Contents/Resources/engine/yt-dlp_macos/` |
| ffmpeg / ffprobe | martin-riedl.de 静态构建 | `Contents/MacOS/` |
| deno（YouTube JS 运行时） | denoland/deno 官方发布 | `Contents/MacOS/` |
| yt-dlp 插件（抖音修补等） | `src-tauri/resources/yt-dlp-plugins/` | `Contents/Resources/yt-dlp-plugins/` |

引擎可在「设置 → 下载引擎」中在线更新：从 yt-dlp 官方 GitHub 发布下载 `yt-dlp_macos.zip`，
校验 SHA256 后安装到 `~/Library/Application Support/com.xvideo.desktop/engine/`。
内置版本更新时（发布新版 xVideo）会自动取代旧的下载版。

## 开发

目前支持在 Apple Silicon Mac 上构建。需要：Node.js、Rust、[uv](https://github.com/astral-sh/uv)，
以及与本仓库同级的 yt-dlp 源码目录（`../yt-dlp`，可用 `YTDLP_SRC` 指定）。

```bash
npm install
npm run engine          # 构建引擎并下载 ffmpeg / deno（首次或升级引擎时运行）
npm run tauri dev       # 开发运行
npx tauri build         # 打包；设置 APPLE_SIGNING_IDENTITY 可用开发者证书签名
```

`npm run engine -- engine` 只重建引擎，`npm run engine -- tools` 只下载工具。产物位于
`src-tauri/engine/` 和 `src-tauri/binaries/`（已 gitignore）。

读取浏览器 Cookie 需要在「系统设置 → 隐私与安全性 → 完全磁盘访问权限」中授权 xVideo。
解析时 yt-dlp 的完整日志写在 `~/Library/Logs/com.xvideo.desktop/`。
