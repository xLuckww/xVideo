mod cookies;
mod download;
mod engine;
mod info;
mod ytdlp;

use download::{DownloadManager, DownloadRequest};
use std::process::Command;
use tauri::Manager;
use ytdlp::NetworkOptions;

async fn blocking<T: Send + 'static>(
    f: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("后台任务失败: {e}"))?
}

#[tauri::command]
async fn parse_video(
    url: String,
    network: Option<NetworkOptions>,
    allow_playlist: Option<bool>,
) -> Result<serde_json::Value, String> {
    blocking(move || {
        info::parse_video(&url, &network.unwrap_or_default(), allow_playlist.unwrap_or(false))
    })
    .await
}

#[tauri::command]
fn start_download(app: tauri::AppHandle, request: DownloadRequest) -> Result<(), String> {
    download::start(&app, request)
}

#[tauri::command]
fn cancel_download(app: tauri::AppHandle, task_id: String) -> Result<(), String> {
    download::cancel(&app, &task_id)
}

#[tauri::command]
async fn get_environment() -> Result<serde_json::Value, String> {
    blocking(|| {
        let tools = ytdlp::tools();
        let version = tools.ytdlp.as_ref().and_then(|_| {
            ytdlp::command()
                .arg("--version")
                .output()
                .ok()
                .filter(|o| o.status.success())
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        });
        let mut env = serde_json::to_value(tools).map_err(|e| e.to_string())?;
        env["version"] = serde_json::json!(version);
        Ok(env)
    })
    .await
}

#[tauri::command]
async fn check_engine_update(proxy: Option<String>) -> Result<engine::UpdateInfo, String> {
    engine::check_update(proxy).await
}

#[tauri::command]
async fn update_engine(app: tauri::AppHandle, proxy: Option<String>) -> Result<String, String> {
    engine::update(app, proxy).await
}

#[tauri::command]
fn reset_engine() -> Result<(), String> {
    engine::reset()
}

#[cfg(target_os = "macos")]
const OPENER: &str = "open";
#[cfg(target_os = "windows")]
const OPENER: &str = "explorer";
#[cfg(target_os = "linux")]
const OPENER: &str = "xdg-open";

#[tauri::command]
async fn open_file(path: String) -> Result<(), String> {
    Command::new(OPENER)
        .arg(ytdlp::expand_home(&path))
        .spawn()
        .map_err(|e| format!("无法打开文件: {e}"))?;
    Ok(())
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    let path = ytdlp::expand_home(&path);
    #[cfg(target_os = "macos")]
    let mut cmd = {
        let mut c = Command::new("open");
        // 文件则在 Finder 中选中，目录则直接打开
        if path.is_dir() {
            c.arg(&path);
        } else {
            c.arg("-R").arg(&path);
        }
        c
    };
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("explorer");
        if path.is_dir() {
            c.arg(&path);
        } else {
            c.arg("/select,").arg(&path);
        }
        c
    };
    #[cfg(target_os = "linux")]
    let mut cmd = {
        let mut c = Command::new("xdg-open");
        let dir = if path.is_dir() { path.as_path() } else { path.parent().unwrap_or(&path) };
        c.arg(dir);
        c
    };
    cmd.spawn().map_err(|e| format!("无法打开文件夹: {e}"))?;
    Ok(())
}

/// 打开「完全磁盘访问权限」设置页：读取浏览器 Cookie 需要该权限
#[tauri::command]
async fn open_privacy_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles")
            .spawn()
            .map_err(|e| format!("无法打开系统设置: {e}"))?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    Err("仅 macOS 需要此设置".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(DownloadManager::default())
        .setup(|app| {
            if let Ok(dir) = app.path().app_log_dir() {
                ytdlp::set_log_dir(dir);
            }
            let resources = app.path().resource_dir()?;
            ytdlp::set_plugin_dir(resources.join("yt-dlp-plugins"));
            engine::init(resources, app.path().app_data_dir()?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            parse_video,
            start_download,
            cancel_download,
            get_environment,
            check_engine_update,
            update_engine,
            reset_engine,
            open_file,
            open_folder,
            open_privacy_settings,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // 下载进程在独立进程组中，退出应用时需要显式结束
            if let tauri::RunEvent::Exit = event {
                app.state::<DownloadManager>().kill_all();
            }
        });
}
