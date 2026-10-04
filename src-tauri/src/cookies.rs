//! 为 Chromium 系浏览器准备正确的 Cookie 数据库。
//!
//! yt-dlp 会递归搜索浏览器目录下所有名为 `Cookies` 的文件并取最新的一个，
//! 但新版 Chrome 的组件（如 `Default/Storage/ext/glic/*/Cookies`）也有同名小数据库，
//! 经常被误选，导致登录态全部丢失。这里自行定位 profile 的主 Cookie 库，
//! 复制到只包含它的临时目录，再以 profile 路径的形式交给 yt-dlp。

use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::SystemTime;

/// 临时目录守卫，离开作用域时删除
pub struct TempDir(PathBuf);

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn browser_dir(browser: &str) -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    let (base, rel) = (
        dirs::home_dir()?.join("Library/Application Support"),
        match browser {
            "chrome" => "Google/Chrome",
            "chromium" => "Chromium",
            "edge" => "Microsoft Edge",
            "brave" => "BraveSoftware/Brave-Browser",
            _ => return None,
        },
    );
    #[cfg(target_os = "windows")]
    let (base, rel) = (
        dirs::data_local_dir()?,
        match browser {
            "chrome" => r"Google\Chrome\User Data",
            "chromium" => r"Chromium\User Data",
            "edge" => r"Microsoft\Edge\User Data",
            "brave" => r"BraveSoftware\Brave-Browser\User Data",
            _ => return None,
        },
    );
    #[cfg(target_os = "linux")]
    let (base, rel) = (
        dirs::config_dir()?,
        match browser {
            "chrome" => "google-chrome",
            "chromium" => "chromium",
            "edge" => "microsoft-edge",
            "brave" => "BraveSoftware/Brave-Browser",
            _ => return None,
        },
    );
    Some(base.join(rel))
}

fn mtime(path: &Path) -> Option<SystemTime> {
    std::fs::metadata(path).and_then(|m| m.modified()).ok()
}

/// profile 内的主 Cookie 库：新版在 Network/ 下，旧版直接在 profile 根目录
fn profile_cookie_db(profile_dir: &Path) -> Option<PathBuf> {
    [profile_dir.join("Network").join("Cookies"), profile_dir.join("Cookies")]
        .into_iter()
        .filter(|p| p.is_file())
        .max_by_key(|p| mtime(p))
}

/// 返回 (profile 目录名, Cookie 库路径)。优先最近使用的 profile，否则取 Cookie 库最新的 profile
pub fn find_cookie_db(browser_dir: &Path) -> Option<(String, PathBuf)> {
    let local_state: Option<Value> = std::fs::read(browser_dir.join("Local State"))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok());
    let profile_info = local_state.as_ref().and_then(|v| v.get("profile"));

    if let Some(last) = profile_info.and_then(|p| p.get("last_used")).and_then(Value::as_str) {
        if let Some(db) = profile_cookie_db(&browser_dir.join(last)) {
            return Some((last.to_string(), db));
        }
    }

    let mut names: Vec<String> = profile_info
        .and_then(|p| p.get("info_cache"))
        .and_then(Value::as_object)
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();
    if !names.iter().any(|n| n == "Default") {
        names.push("Default".into());
    }
    names
        .into_iter()
        .filter_map(|name| profile_cookie_db(&browser_dir.join(&name)).map(|db| (name, db)))
        .max_by_key(|(_, db)| mtime(db))
}

/// 复制主 Cookie 库到临时目录，返回传给 `--cookies-from-browser` 的 profile 路径和目录守卫。
/// 无法准备时返回 None，调用方回退为让 yt-dlp 自行查找。
pub fn prepare_profile(browser: &str) -> Option<(PathBuf, TempDir)> {
    static COUNTER: AtomicU32 = AtomicU32::new(0);

    let dir = browser_dir(browser)?;
    let (profile, db) = find_cookie_db(&dir)?;

    let root = std::env::temp_dir().join(format!(
        "xvideo-cookies-{}-{}",
        std::process::id(),
        COUNTER.fetch_add(1, Ordering::Relaxed)
    ));
    let guard = TempDir(root.clone());
    let profile_dir = root.join(&profile);
    std::fs::create_dir_all(&profile_dir).ok()?;
    std::fs::copy(&db, profile_dir.join("Cookies")).ok()?;
    // Windows 上解密密钥存放在浏览器目录的 Local State 中，yt-dlp 会到 profile 的上级目录找
    let _ = std::fs::copy(dir.join("Local State"), root.join("Local State"));
    Some((profile_dir, guard))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn touch(path: &Path) {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, b"x").unwrap();
    }

    #[test]
    fn ignores_component_cookie_databases() {
        let root = std::env::temp_dir().join(format!("xvideo-test-{}", std::process::id()));
        let _guard = TempDir(root.clone());
        touch(&root.join("Default/Cookies"));
        std::thread::sleep(std::time::Duration::from_millis(20));
        // 组件的同名数据库更新，但不应被选中
        touch(&root.join("Default/Storage/ext/glic/66A8/Cookies"));

        let (profile, db) = find_cookie_db(&root).unwrap();
        assert_eq!(profile, "Default");
        assert_eq!(db, root.join("Default/Cookies"));
    }

    #[test]
    fn prefers_last_used_profile() {
        let root = std::env::temp_dir().join(format!("xvideo-test2-{}", std::process::id()));
        let _guard = TempDir(root.clone());
        touch(&root.join("Default/Cookies"));
        touch(&root.join("Profile 1/Network/Cookies"));
        std::fs::write(
            root.join("Local State"),
            r#"{"profile":{"last_used":"Profile 1","info_cache":{"Default":{},"Profile 1":{}}}}"#,
        )
        .unwrap();

        let (profile, db) = find_cookie_db(&root).unwrap();
        assert_eq!(profile, "Profile 1");
        assert_eq!(db, root.join("Profile 1/Network/Cookies"));
    }
}
