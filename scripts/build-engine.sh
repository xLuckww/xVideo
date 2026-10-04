#!/usr/bin/env bash
# 构建 xVideo 自带的下载引擎与工具（macOS Apple Silicon）。
#
#   scripts/build-engine.sh          # 全部
#   scripts/build-engine.sh engine   # 只构建 yt-dlp 引擎
#   scripts/build-engine.sh tools    # 只下载 ffmpeg / ffprobe / deno
#
# 产物（均已 gitignore）：
#   src-tauri/engine/yt-dlp_macos/   从本地 yt-dlp 源码用 PyInstaller --onedir 构建，布局与官方 yt-dlp_macos.zip 一致
#   src-tauri/engine/VERSION         引擎版本号
#   src-tauri/binaries/{ffmpeg,ffprobe,deno}-aarch64-apple-darwin   Tauri externalBin
#
# 可用环境变量覆盖：YTDLP_SRC、FFMPEG_BUILD、DENO_VERSION、PYTHON_VERSION
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
YTDLP_SRC="${YTDLP_SRC:-$ROOT/../yt-dlp}"
FFMPEG_BUILD="${FFMPEG_BUILD:-1789931890_9.0.2}"
DENO_VERSION="${DENO_VERSION:-v2.9.7}"
PYTHON_VERSION="${PYTHON_VERSION:-3.13}"

TARGET="aarch64-apple-darwin"
BUILD="$ROOT/build/engine"
DOWNLOADS="$ROOT/build/downloads"
TAURI="$ROOT/src-tauri"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

[[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]] || {
  echo "目前只支持在 Apple Silicon Mac 上构建" >&2
  exit 1
}

build_engine() {
  command -v uv >/dev/null || { echo "需要 uv：brew install uv" >&2; exit 1; }
  [[ -f "$YTDLP_SRC/yt_dlp/version.py" ]] || { echo "找不到 yt-dlp 源码：$YTDLP_SRC" >&2; exit 1; }

  log "复制 yt-dlp 源码（不改动参考仓库）"
  rm -rf "$BUILD/src"
  mkdir -p "$BUILD"
  rsync -a --exclude .git --exclude test --exclude __pycache__ --exclude dist --exclude build \
    "$YTDLP_SRC/" "$BUILD/src/"

  log "准备 Python $PYTHON_VERSION 构建环境"
  [[ -x "$BUILD/venv/bin/python" ]] || uv venv --python "$PYTHON_VERSION" "$BUILD/venv"
  local py="$BUILD/venv/bin/python"
  local req="$BUILD/src/bundle/requirements"
  uv pip install --python "$py" --require-hashes \
    -r "$req/default.txt" -r "$req/curl-cffi.txt" -r "$req/pyinstaller.txt"

  log "构建引擎"
  (
    cd "$BUILD/src"
    # -U 时提示用户到 xVideo 里更新，而不是让引擎自我替换（会破坏应用签名）
    "$py" devscripts/set-variant.py xvideo -M "请在 xVideo「设置 → 下载引擎」中更新"
    "$py" devscripts/make_lazy_extractors.py
    rm -rf dist build
    "$py" -m bundle.pyinstaller --onedir --target-architecture arm64
  )

  rm -rf "$TAURI/engine"
  mkdir -p "$TAURI/engine"
  cp -R "$BUILD/src/dist/yt-dlp_macos" "$TAURI/engine/yt-dlp_macos"
  local version
  version="$("$TAURI/engine/yt-dlp_macos/yt-dlp_macos" --version)"
  echo "$version" > "$TAURI/engine/VERSION"
  log "引擎就绪：yt-dlp $version（$(du -sh "$TAURI/engine" | cut -f1)）"
}

# download <url> <sha256 文件 url> <保存名>：带缓存和 SHA256 校验
download() {
  local url="$1" sum_url="$2" name="$3"
  mkdir -p "$DOWNLOADS"
  if [[ ! -f "$DOWNLOADS/$name" ]]; then
    curl -fL --retry 3 -o "$DOWNLOADS/$name.part" "$url"
    mv "$DOWNLOADS/$name.part" "$DOWNLOADS/$name"
  fi
  local expected
  expected="$(curl -fsL --retry 3 "$sum_url" | awk '{print $1}')"
  echo "$expected  $DOWNLOADS/$name" | shasum -a 256 -c - >/dev/null || {
    echo "校验失败：$name" >&2
    rm -f "$DOWNLOADS/$name"
    exit 1
  }
}

# install_bin <zip> <zip 内文件名> <目标名>
install_bin() {
  local zip="$1" member="$2" dest="$TAURI/binaries/$3-$TARGET"
  local tmp
  tmp="$(mktemp -d)"
  ditto -x -k "$DOWNLOADS/$zip" "$tmp"
  mkdir -p "$TAURI/binaries"
  mv "$(find "$tmp" -type f -name "$member" | head -1)" "$dest"
  chmod +x "$dest"
  rm -rf "$tmp"
}

fetch_tools() {
  local ff="https://ffmpeg.martin-riedl.de/download/macos/arm64/$FFMPEG_BUILD"
  log "下载 ffmpeg / ffprobe（$FFMPEG_BUILD）"
  download "$ff/ffmpeg.zip" "$ff/ffmpeg.zip.sha256" "ffmpeg-$FFMPEG_BUILD.zip"
  download "$ff/ffprobe.zip" "$ff/ffprobe.zip.sha256" "ffprobe-$FFMPEG_BUILD.zip"
  install_bin "ffmpeg-$FFMPEG_BUILD.zip" ffmpeg ffmpeg
  install_bin "ffprobe-$FFMPEG_BUILD.zip" ffprobe ffprobe

  local deno="https://github.com/denoland/deno/releases/download/$DENO_VERSION/deno-$TARGET.zip"
  log "下载 deno（$DENO_VERSION）"
  download "$deno" "$deno.sha256sum" "deno-$DENO_VERSION.zip"
  install_bin "deno-$DENO_VERSION.zip" deno deno

  "$TAURI/binaries/ffmpeg-$TARGET" -hide_banner -version | head -1
  "$TAURI/binaries/deno-$TARGET" --version | head -1
  log "工具就绪（$(du -sh "$TAURI/binaries" | cut -f1)）"
}

case "${1:-all}" in
  engine) build_engine ;;
  tools) fetch_tools ;;
  all) build_engine; fetch_tools ;;
  *) echo "用法：$0 [engine|tools|all]" >&2; exit 1 ;;
esac
