//! 自带的下载引擎与工具。
//!
//! 应用包内：
//!   Contents/Resources/engine/yt-dlp_macos/yt-dlp_macos   从本地源码构建的引擎（scripts/build-engine.sh）
//!   Contents/Resources/engine/VERSION
//!   Contents/MacOS/{ffmpeg,ffprobe,deno}                  Tauri externalBin
//! 在线更新的引擎（官方 yt-dlp_macos.zip，布局与自建版相同）：
//!   ~/Library/Application Support/<id>/engine/<version>/yt-dlp_macos
//!   ~/Library/Application Support/<id>/engine/current      当前启用的版本号
//! 更新版比内置版新时才启用；随新版应用发布的内置引擎会自动取代旧的下载版。

use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use tauri::{AppHandle, Emitter};

// 引擎可执行文件名（不含 .exe）与官方 onedir 发布包名，两者布局一致：<包根>/<ENGINE_NAME>[.exe] + _internal/
#[cfg(target_os = "macos")]
const ENGINE_NAME: &str = "yt-dlp_macos";
#[cfg(target_os = "macos")]
const RELEASE_ASSET: &str = "yt-dlp_macos.zip";
#[cfg(target_os = "windows")]
const ENGINE_NAME: &str = "yt-dlp";
#[cfg(target_os = "windows")]
const RELEASE_ASSET: &str = "yt-dlp_win.zip";
#[cfg(target_os = "linux")]
const ENGINE_NAME: &str = "yt-dlp_linux";
#[cfg(target_os = "linux")]
const RELEASE_ASSET: &str = "yt-dlp_linux.zip";

const RELEASE_API: &str = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";
const DOWNLOAD_BASE: &str = "https://github.com/yt-dlp/yt-dlp/releases/download";

struct Dirs {
    resources: PathBuf,
    bin: PathBuf,
    data: PathBuf,
}

static DIRS: OnceLock<Dirs> = OnceLock::new();

pub fn init(resources: PathBuf, data: PathBuf) {
    // externalBin 与主程序放在同一目录（Contents/MacOS 或开发时的 target/debug）
    let bin = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(Path::to_path_buf))
        .unwrap_or_default();
    let data = data.join("engine");
    // 旧版本可能仍被上次运行中的进程使用，所以更新时不删，等到下次启动再清理
    if let Some(current) = read_trimmed(&data.join("current")) {
        remove_other_versions(&data, &current);
    }
    let _ = DIRS.set(Dirs { resources, bin, data });
}

/// xVideo 自带的 yt-dlp 插件目录（如抖音修补）
pub fn plugin_dir() -> Option<PathBuf> {
    let dir = dirs()?.resources.join("yt-dlp-plugins");
    dir.is_dir().then_some(dir)
}

fn dirs() -> Option<&'static Dirs> {
    DIRS.get()
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EngineSource {
    Bundled,
    Updated,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Engine {
    pub path: PathBuf,
    pub version: String,
    pub source: EngineSource,
}

fn exe(dir: &Path, name: &str) -> PathBuf {
    if cfg!(windows) { dir.join(format!("{name}.exe")) } else { dir.join(name) }
}

fn read_trimmed(path: &Path) -> Option<String> {
    std::fs::read_to_string(path).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

/// yt-dlp 版本号形如 2026.08.19 或 2026.08.19.123456（nightly），按数字逐段比较
pub fn parse_version(v: &str) -> Vec<u64> {
    v.trim().trim_start_matches('v').split('.').map(|p| p.parse().unwrap_or(0)).collect()
}

fn bundled_engine() -> Option<Engine> {
    let root = dirs()?.resources.join("engine");
    let path = exe(&root.join(ENGINE_NAME), ENGINE_NAME);
    path.is_file().then(|| Engine {
        version: read_trimmed(&root.join("VERSION")).unwrap_or_default(),
        path,
        source: EngineSource::Bundled,
    })
}

fn updated_engine() -> Option<Engine> {
    let data = &dirs()?.data;
    let version = read_trimmed(&data.join("current"))?;
    let path = exe(&data.join(&version), ENGINE_NAME);
    path.is_file().then_some(Engine { path, version, source: EngineSource::Updated })
}

/// 当前使用的引擎：在线更新的版本更新时优先使用
pub fn active_engine() -> Option<Engine> {
    match (bundled_engine(), updated_engine()) {
        (Some(b), Some(u)) if parse_version(&u.version) > parse_version(&b.version) => Some(u),
        (Some(b), _) => Some(b),
        (None, u) => u,
    }
}

pub fn bundled_version() -> Option<String> {
    bundled_engine().map(|e| e.version)
}

fn bundled_tool(name: &str) -> Option<PathBuf> {
    let path = exe(&dirs()?.bin, name);
    path.is_file().then_some(path)
}

pub fn ffmpeg() -> Option<PathBuf> {
    bundled_tool("ffmpeg")
}

pub fn ffprobe() -> Option<PathBuf> {
    bundled_tool("ffprobe")
}

pub fn deno() -> Option<PathBuf> {
    bundled_tool("deno")
}

/// 子进程只能看到系统目录和自带工具，确保不依赖、也不受用户自行安装的软件影响
pub fn child_path_env() -> std::ffi::OsString {
    let mut paths: Vec<PathBuf> = Vec::new();
    if let Some(d) = dirs() {
        paths.push(d.bin.clone());
    }
    #[cfg(unix)]
    paths.extend(["/usr/bin", "/bin", "/usr/sbin", "/sbin"].map(PathBuf::from));
    #[cfg(windows)]
    if let Some(sys) = std::env::var_os("SystemRoot") {
        let sys = PathBuf::from(sys);
        paths.extend([sys.join("System32"), sys.clone()]);
    }
    std::env::join_paths(paths).unwrap_or_default()
}

// ---------- 在线更新 ----------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub current: Option<String>,
    pub latest: String,
    pub update_available: bool,
    pub release_url: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateProgress {
    stage: &'static str,
    downloaded: u64,
    total: Option<u64>,
}

fn client(proxy: Option<&str>) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .user_agent(concat!("xVideo/", env!("CARGO_PKG_VERSION")))
        .connect_timeout(std::time::Duration::from_secs(15));
    if let Some(p) = proxy.map(str::trim).filter(|p| !p.is_empty()) {
        builder = builder.proxy(reqwest::Proxy::all(p).map_err(|e| format!("代理地址无效: {e}"))?);
    }
    builder.build().map_err(|e| e.to_string())
}

pub async fn check_update(proxy: Option<String>) -> Result<UpdateInfo, String> {
    let release: serde_json::Value = client(proxy.as_deref())?
        .get(RELEASE_API)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("无法获取最新版本: {e}"))?
        .json()
        .await
        .map_err(|e| format!("无法解析版本信息: {e}"))?;
    let latest = release["tag_name"].as_str().ok_or("版本信息缺少 tag_name")?.to_string();
    let current = active_engine().map(|e| e.version);
    let update_available = current
        .as_deref()
        .is_none_or(|c| parse_version(&latest) > parse_version(c));
    Ok(UpdateInfo {
        current,
        latest,
        update_available,
        release_url: release["html_url"].as_str().unwrap_or_default().to_string(),
    })
}

async fn download(
    app: &AppHandle,
    client: &reqwest::Client,
    url: &str,
) -> Result<Vec<u8>, String> {
    let mut resp = client
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("下载失败 {url}: {e}"))?;
    let total = resp.content_length();
    let mut body = Vec::with_capacity(total.unwrap_or(0) as usize);
    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("下载中断: {e}"))? {
        body.extend_from_slice(&chunk);
        let _ = app.emit(
            "engine-update-progress",
            UpdateProgress { stage: "downloading", downloaded: body.len() as u64, total },
        );
    }
    Ok(body)
}

fn expected_sha256(sums: &str, file: &str) -> Option<String> {
    sums.lines().find_map(|line| {
        let mut parts = line.split_whitespace();
        let hash = parts.next()?;
        (parts.next()?.trim_start_matches('*') == file).then(|| hash.to_lowercase())
    })
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// 下载官方最新引擎、校验 SHA256、解压并试运行，成功后启用
static UPDATING: AtomicBool = AtomicBool::new(false);

/// 更新期间置位，结束（含出错）时自动复位
struct UpdateGuard;

impl UpdateGuard {
    fn acquire() -> Result<Self, String> {
        UPDATING
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| UpdateGuard)
            .map_err(|_| "引擎正在更新中".to_string())
    }
}

impl Drop for UpdateGuard {
    fn drop(&mut self) {
        UPDATING.store(false, Ordering::Release);
    }
}

pub async fn update(app: AppHandle, proxy: Option<String>) -> Result<String, String> {
    let _guard = UpdateGuard::acquire()?;
    let data = dirs().ok_or("引擎目录未初始化")?.data.clone();
    let info = check_update(proxy.clone()).await?;
    if !info.update_available {
        return Ok(info.current.unwrap_or(info.latest));
    }
    let tag = info.latest;
    let asset = RELEASE_ASSET;
    let client = client(proxy.as_deref())?;

    let sums = String::from_utf8_lossy(
        &download(&app, &client, &format!("{DOWNLOAD_BASE}/{tag}/SHA2-256SUMS")).await?,
    )
    .into_owned();
    let expected = expected_sha256(&sums, asset).ok_or("校验文件中没有找到引擎压缩包")?;
    let zip = download(&app, &client, &format!("{DOWNLOAD_BASE}/{tag}/{asset}")).await?;
    if hex(&Sha256::digest(&zip)) != expected {
        return Err("引擎压缩包校验失败，已放弃更新".into());
    }

    let _ = app.emit("engine-update-progress", UpdateProgress { stage: "installing", downloaded: 0, total: None });
    let version = tauri::async_runtime::spawn_blocking(move || install(&data, &tag, &zip))
        .await
        .map_err(|e| e.to_string())??;
    Ok(version)
}

fn install(data: &Path, tag: &str, zip: &[u8]) -> Result<String, String> {
    std::fs::create_dir_all(data).map_err(|e| e.to_string())?;
    let staging = data.join(format!("{tag}.partial"));
    let target = data.join(tag);
    let _ = std::fs::remove_dir_all(&staging);
    std::fs::create_dir_all(&staging).map_err(|e| e.to_string())?;

    let zip_path = data.join(format!("{tag}.zip"));
    std::fs::write(&zip_path, zip).map_err(|e| e.to_string())?;
    let unzip = unzip(&zip_path, &staging);
    let _ = std::fs::remove_file(&zip_path);
    unzip?;

    // 官方 zip 的内容就是 onedir 目录本身
    let engine = exe(&staging, ENGINE_NAME);
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&engine, std::fs::Permissions::from_mode(0o755));
    }
    let mut cmd = std::process::Command::new(&engine);
    cmd.arg("--version").env("PATH", child_path_env());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd
        .output()
        .map_err(|e| format!("新引擎无法运行: {e}"))?;
    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !output.status.success() || version.is_empty() {
        let _ = std::fs::remove_dir_all(&staging);
        return Err("新引擎试运行失败，已保留当前版本".into());
    }

    let _ = std::fs::remove_dir_all(&target);
    std::fs::rename(&staging, &target).map_err(|e| e.to_string())?;
    std::fs::write(data.join("current"), tag).map_err(|e| e.to_string())?;
    Ok(version)
}

#[cfg(target_os = "macos")]
fn unzip(zip: &Path, dest: &Path) -> Result<(), String> {
    // ditto 能正确保留可执行权限和符号链接
    let status = std::process::Command::new("/usr/bin/ditto")
        .args(["-x", "-k"])
        .arg(zip)
        .arg(dest)
        .status()
        .map_err(|e| e.to_string())?;
    status.success().then_some(()).ok_or_else(|| "解压引擎失败".to_string())
}

#[cfg(target_os = "windows")]
fn unzip(zip: &Path, dest: &Path) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    // Windows 10 1803 起自带 bsdtar，可直接解压 zip
    let status = std::process::Command::new("tar")
        .arg("-xf")
        .arg(zip)
        .arg("-C")
        .arg(dest)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| e.to_string())?;
    status.success().then_some(()).ok_or_else(|| "解压引擎失败".to_string())
}

#[cfg(target_os = "linux")]
fn unzip(_zip: &Path, _dest: &Path) -> Result<(), String> {
    Err("当前平台暂不支持在线更新引擎".into())
}

/// 删除当前版本以外的引擎目录，以及中断更新留下的 .partial / .zip
fn remove_other_versions(data: &Path, keep: &str) {
    let Ok(entries) = std::fs::read_dir(data) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && entry.file_name() != keep {
            let _ = std::fs::remove_dir_all(path);
        } else if path.extension().is_some_and(|e| e == "zip") {
            let _ = std::fs::remove_file(path);
        }
    }
}

/// 删除所有在线更新的引擎，回到内置版本
pub fn reset() -> Result<(), String> {
    let data = &dirs().ok_or("引擎目录未初始化")?.data;
    match std::fs::remove_dir_all(data) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_versions_numerically() {
        assert!(parse_version("2026.10.02") > parse_version("2026.08.19"));
        assert!(parse_version("2026.08.19.120000") > parse_version("2026.08.19"));
        assert!(parse_version("2026.8.9") < parse_version("2026.08.19"));
    }

    #[test]
    fn finds_checksum_for_asset() {
        let sums = "aaa  yt-dlp\nbbb  yt-dlp_macos\nccc  yt-dlp_macos.zip\n";
        assert_eq!(expected_sha256(sums, "yt-dlp_macos.zip").as_deref(), Some("ccc"));
        assert_eq!(expected_sha256(sums, "missing.zip"), None);
    }
}
