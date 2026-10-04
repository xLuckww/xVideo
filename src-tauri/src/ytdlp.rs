//! 构造统一的 yt-dlp 命令：只使用应用自带的引擎、ffmpeg 和 deno（见 engine.rs），
//! 并忽略用户本机的 yt-dlp 配置和插件，保证行为一致。

use crate::{cookies, engine};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

/// 自带组件的检测结果，供界面展示
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tools {
    pub ytdlp: Option<PathBuf>,
    pub engine_source: Option<engine::EngineSource>,
    pub bundled_version: Option<String>,
    pub ffmpeg: Option<PathBuf>,
    pub ffprobe: Option<PathBuf>,
    pub js_runtime: Option<String>,
    pub js_runtime_path: Option<PathBuf>,
}

pub fn tools() -> Tools {
    let active = engine::active_engine();
    let deno = engine::deno();
    Tools {
        ytdlp: active.as_ref().map(|e| e.path.clone()),
        engine_source: active.map(|e| e.source),
        bundled_version: engine::bundled_version(),
        ffmpeg: engine::ffmpeg(),
        ffprobe: engine::ffprobe(),
        js_runtime: deno.as_ref().map(|_| "deno".to_string()),
        js_runtime_path: deno,
    }
}

/// 构造一个已配置好自带工具的 yt-dlp 命令。
pub fn command() -> Command {
    let engine = engine::active_engine();
    let mut cmd = Command::new(engine.as_ref().map_or(Path::new("yt-dlp"), |e| e.path.as_path()));
    cmd.env("PATH", engine::child_path_env());
    cmd.env("PYTHONIOENCODING", "utf-8");
    // 插件位于签名过的应用包内，不能让 Python 往里写 __pycache__
    cmd.env("PYTHONDONTWRITEBYTECODE", "1");
    // 不读取用户的 yt-dlp 配置；更新由「设置 → 下载引擎」负责
    cmd.args(["--ignore-config", "--no-update"]);

    cmd.arg("--no-plugin-dirs");
    if let Some(dir) = PLUGIN_DIR.get() {
        cmd.arg("--plugin-dirs").arg(dir);
    }
    if let Some(ffmpeg) = engine::ffmpeg() {
        cmd.arg("--ffmpeg-location").arg(ffmpeg);
    }
    if let Some(deno) = engine::deno() {
        cmd.arg("--no-js-runtimes").arg("--js-runtimes").arg(format!("deno:{}", deno.display()));
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

pub fn spawn_error(e: std::io::Error) -> String {
    if e.kind() == std::io::ErrorKind::NotFound {
        "下载引擎缺失，请重新安装 xVideo".to_string()
    } else {
        format!("无法启动下载引擎: {e}")
    }
}

/// 从 stderr 中提取对用户有用的错误信息。
pub fn summarize_error<S: AsRef<str>>(lines: &[S]) -> String {
    let errors: Vec<&str> = lines
        .iter()
        .map(|l| l.as_ref().trim())
        .filter(|l| l.starts_with("ERROR:"))
        .collect();
    if !errors.is_empty() {
        // Cookie 解密、YouTube JS 校验失败时 yt-dlp 只给警告并继续，真正原因常藏在这里
        let cookie_warnings = lines.iter().map(|l| l.as_ref().trim()).filter(|l| {
            let lower = l.to_lowercase();
            l.starts_with("WARNING:")
                && ["cookie", "keyring", "keychain", "decrypt", "challenge"]
                    .iter()
                    .any(|k| lower.contains(k))
        });
        return cookie_warnings.chain(errors).collect::<Vec<_>>().join("\n");
    }
    let tail: Vec<&str> = lines
        .iter()
        .map(|l| l.as_ref().trim())
        .filter(|l| !l.is_empty())
        .collect();
    let start = tail.len().saturating_sub(5);
    let msg = tail[start..].join("\n");
    if msg.is_empty() { "yt-dlp 执行失败".to_string() } else { msg }
}

static LOG_DIR: OnceLock<PathBuf> = OnceLock::new();
static PLUGIN_DIR: OnceLock<PathBuf> = OnceLock::new();

/// xVideo 自带的 yt-dlp 插件目录（如抖音修补），随应用资源打包
pub fn set_plugin_dir(dir: PathBuf) {
    if dir.is_dir() {
        let _ = PLUGIN_DIR.set(dir);
    }
}

pub fn set_log_dir(dir: PathBuf) {
    let _ = std::fs::create_dir_all(&dir);
    let _ = LOG_DIR.set(dir);
}

/// 把一次 yt-dlp 调用的完整输出写入日志目录，便于排查（覆盖同名旧日志）
pub fn write_log<S: AsRef<str>>(name: &str, args: &[String], lines: &[S]) {
    let Some(dir) = LOG_DIR.get() else { return };
    let mut content = format!("args: {:?}\n\n", args);
    for line in lines {
        content.push_str(line.as_ref());
        content.push('\n');
    }
    let _ = std::fs::write(dir.join(name), content);
}

fn non_empty(s: &Option<String>) -> Option<&str> {
    s.as_deref().map(str::trim).filter(|s| !s.is_empty())
}

/// 网络 / Cookie 相关的选项，解析与下载共用。
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NetworkOptions {
    pub proxy: Option<String>,
    pub cookie_enabled: bool,
    pub cookie_source: Option<String>,
    pub cookie_file: Option<String>,
    // 以下仅在下载时使用
    pub limit_rate: Option<String>,
    pub retries: Option<u32>,
    pub concurrent_fragments: Option<u32>,
}

impl NetworkOptions {
    /// 返回的临时目录守卫需要保持到 yt-dlp 进程结束
    #[must_use]
    pub fn push_common_args(&self, args: &mut Vec<String>) -> Option<cookies::TempDir> {
        if let Some(proxy) = non_empty(&self.proxy) {
            args.extend(["--proxy".into(), proxy.into()]);
        }
        if !self.cookie_enabled {
            return None;
        }
        // 手动选择的 Cookie 文件优先，其次从浏览器读取
        if let Some(file) = non_empty(&self.cookie_file) {
            args.extend(["--cookies".into(), file.into()]);
            return None;
        }
        let browser = non_empty(&self.cookie_source)?;
        match cookies::prepare_profile(browser) {
            Some((profile, guard)) => {
                args.extend(["--cookies-from-browser".into(), format!("{browser}:{}", profile.display())]);
                Some(guard)
            }
            None => {
                args.extend(["--cookies-from-browser".into(), browser.into()]);
                None
            }
        }
    }

    pub fn push_download_args(&self, args: &mut Vec<String>) {
        if let Some(rate) = non_empty(&self.limit_rate) {
            args.extend(["-r".into(), rate.into()]);
        }
        if let Some(retries) = self.retries {
            args.extend(["-R".into(), retries.to_string()]);
        }
        if let Some(n) = self.concurrent_fragments {
            args.extend(["-N".into(), n.to_string()]);
        }
    }
}

pub fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/").or_else(|| path.strip_prefix("~\\")) {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    } else if path == "~" {
        if let Some(home) = dirs::home_dir() {
            return home;
        }
    }
    PathBuf::from(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_cookie_file_falls_back_to_browser() {
        let opts = NetworkOptions {
            cookie_enabled: true,
            cookie_source: Some("firefox".into()),
            cookie_file: Some("".into()),
            ..Default::default()
        };
        let mut args = vec![];
        let _guard = opts.push_common_args(&mut args);
        assert_eq!(args, ["--cookies-from-browser", "firefox"]);
    }

    #[test]
    fn cookie_file_takes_priority() {
        let opts = NetworkOptions {
            cookie_enabled: true,
            cookie_source: Some("chrome".into()),
            cookie_file: Some("/tmp/c.txt".into()),
            ..Default::default()
        };
        let mut args = vec![];
        let _guard = opts.push_common_args(&mut args);
        assert_eq!(args, ["--cookies", "/tmp/c.txt"]);
    }

    #[test]
    fn cookies_disabled_adds_nothing() {
        let opts = NetworkOptions {
            cookie_source: Some("chrome".into()),
            ..Default::default()
        };
        let mut args = vec![];
        let _guard = opts.push_common_args(&mut args);
        assert!(args.is_empty());
    }

    #[test]
    fn summarize_keeps_cookie_warnings() {
        let lines = [
            "WARNING: foo",
            "WARNING: cannot decrypt v10 cookies: no key found",
            "ERROR: Sign in to confirm",
        ];
        assert_eq!(
            summarize_error(&lines),
            "WARNING: cannot decrypt v10 cookies: no key found\nERROR: Sign in to confirm"
        );
    }

    #[test]
    fn summarize_prefers_error_lines() {
        let lines = ["WARNING: foo", "ERROR: [youtube] abc: Video unavailable", "bar"];
        assert_eq!(summarize_error(&lines), "ERROR: [youtube] abc: Video unavailable");
    }
}
