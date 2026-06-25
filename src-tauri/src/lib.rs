use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub uploader: Option<String>,
    pub duration: Option<f64>,
    pub duration_string: Option<String>,
    pub view_count: Option<u64>,
    pub thumbnail: Option<String>,
    pub webpage_url: Option<String>,
    pub formats: Option<Vec<Format>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Format {
    pub format_id: String,
    pub format_note: Option<String>,
    pub ext: Option<String>,
    pub resolution: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<f64>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub abr: Option<f64>,
    pub filesize: Option<u64>,
    pub filesize_approx: Option<u64>,
    pub tbr: Option<f64>,
    pub format: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubtitleInfo {
    pub ext: String,
    pub name: String,
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostProcessingOptions {
    #[serde(rename = "embedSubs")]
    pub embed_subs: bool,
    #[serde(rename = "embedThumbnail")]
    pub embed_thumbnail: bool,
    #[serde(rename = "embedMetadata")]
    pub embed_metadata: bool,
    #[serde(rename = "embedChapters")]
    pub embed_chapters: bool,
    #[serde(rename = "sponsorblockRemove")]
    pub sponsorblock_remove: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadSettings {
    pub proxy: Option<String>,
    #[serde(rename = "limitRate")]
    pub limit_rate: Option<String>,
    pub retries: Option<u32>,
    #[serde(rename = "concurrentFragments")]
    pub concurrent_fragments: Option<u32>,
    #[serde(rename = "cookieEnabled")]
    pub cookie_enabled: Option<bool>,
    #[serde(rename = "cookieSource")]
    pub cookie_source: Option<String>,
    #[serde(rename = "cookieFile")]
    pub cookie_file: Option<String>,
}

fn get_ytdlp_path() -> PathBuf {
    // Try to find yt-dlp in PATH
    if let Ok(output) = Command::new("which").arg("yt-dlp").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return PathBuf::from(path);
        }
    }

    // Fallback to common locations
    let paths = vec![
        "/usr/local/bin/yt-dlp",
        "/opt/homebrew/bin/yt-dlp",
        "/usr/bin/yt-dlp",
    ];

    for path in paths {
        if std::path::Path::new(path).exists() {
            return PathBuf::from(path);
        }
    }

    // Default
    PathBuf::from("yt-dlp")
}

#[tauri::command]
async fn parse_video(url: String, cookie_source: Option<String>, cookie_enabled: Option<bool>, cookie_file: Option<String>) -> Result<VideoInfo, String> {
    let ytdlp = get_ytdlp_path();
    let mut args = vec!["--js-runtimes".to_string(), "node:/usr/local/bin/node".to_string(), "--dump-json".to_string(), "--no-download".to_string(), url];

    if cookie_enabled.unwrap_or(false) {
        // 优先使用手动选择的 Cookie 文件
        if let Some(file) = &cookie_file {
            if !file.is_empty() {
                args.push("--cookies".to_string());
                args.push(file.clone());
            }
        } else if let Some(cookie) = &cookie_source {
            if !cookie.is_empty() {
                args.push("--cookies-from-browser".to_string());
                args.push(cookie.clone());
            }
        }
    }

    let output = Command::new(&ytdlp)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let video_info: VideoInfo = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse video info: {}", e))?;

    Ok(video_info)
}

#[tauri::command]
async fn get_formats(url: String) -> Result<Vec<Format>, String> {
    let ytdlp = get_ytdlp_path();

    let output = Command::new(&ytdlp)
        .args(["--dump-json", "--no-download", &url])
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let video_info: VideoInfo = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse video info: {}", e))?;

    Ok(video_info.formats.unwrap_or_default())
}

#[tauri::command]
async fn start_download(
    app: tauri::AppHandle,
    url: String,
    format_id: String,
    output_path: String,
    filename_template: String,
    post_processing: PostProcessingOptions,
    settings: DownloadSettings,
) -> Result<String, String> {
    let ytdlp = get_ytdlp_path();
    // 格式选择策略：优先合并视频+音频，失败则回退到纯视频
    let format_arg = if format_id == "best" || format_id.contains("bestvideo") {
        format_id.clone()
    } else {
        format!("{}+bestaudio/bestvideo+bestaudio/best", format_id)
    };
    let mut args = vec![
        "--js-runtimes".to_string(),
        "node:/usr/local/bin/node".to_string(),
        "-f".to_string(),
        format_arg,
        "--merge-output-format".to_string(),
        "mp4".to_string(),
        "-o".to_string(),
        format!("{}/{}", output_path, filename_template),
        // 优先使用原生 HLS/DASH 合并，不依赖 ffmpeg
        "--hls-prefer-native".to_string(),
    ];

    // Post processing
    if post_processing.embed_subs {
        args.push("--embed-subs".to_string());
    }
    if post_processing.embed_thumbnail {
        args.push("--embed-thumbnail".to_string());
    }
    if post_processing.embed_metadata {
        args.push("--embed-metadata".to_string());
    }
    if post_processing.embed_chapters {
        args.push("--embed-chapters".to_string());
    }
    if post_processing.sponsorblock_remove {
        args.push("--sponsorblock-remove".to_string());
        args.push("all".to_string());
    }

    // Network settings
    if let Some(proxy) = &settings.proxy {
        if !proxy.is_empty() {
            args.push("--proxy".to_string());
            args.push(proxy.clone());
        }
    }
    if let Some(limit_rate) = &settings.limit_rate {
        if !limit_rate.is_empty() {
            args.push("-r".to_string());
            args.push(limit_rate.clone());
        }
    }
    if let Some(retries) = settings.retries {
        args.push("-R".to_string());
        args.push(retries.to_string());
    }
    if let Some(concurrent) = settings.concurrent_fragments {
        args.push("-N".to_string());
        args.push(concurrent.to_string());
    }
    if settings.cookie_enabled.unwrap_or(false) {
        // 优先使用手动选择的 Cookie 文件
        if let Some(file) = &settings.cookie_file {
            if !file.is_empty() {
                args.push("--cookies".to_string());
                args.push(file.clone());
            }
        } else if let Some(cookie) = &settings.cookie_source {
            if !cookie.is_empty() {
                args.push("--cookies-from-browser".to_string());
                args.push(cookie.clone());
            }
        }
    }

    args.push(url);

    // Spawn the download process
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut cmd = Command::new(&ytdlp);
        cmd.args(&args);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        match cmd.spawn() {
            Ok(mut child) => {
                // yt-dlp outputs progress to stderr, so we need to read from there
                let app_handle_stderr = app_handle.clone();
                if let Some(stderr) = child.stderr.take() {
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                let _ = app_handle_stderr.emit("download-progress", &line);
                            }
                        }
                    });
                }

                // Also read stdout for any output
                if let Some(stdout) = child.stdout.take() {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            let _ = app_handle.emit("download-progress", &line);
                        }
                    }
                }

                let status = child.wait();
                match status {
                    Ok(s) => {
                        if s.success() {
                            let _ = app_handle.emit("download-complete", "Download finished");
                        } else {
                            let _ = app_handle.emit("download-error", "Download failed");
                        }
                    }
                    Err(e) => {
                        let _ = app_handle.emit("download-error", format!("Process error: {}", e));
                    }
                }
            }
            Err(e) => {
                let _ = app_handle.emit("download-error", format!("Failed to start: {}", e));
            }
        }
    });

    Ok("Download started".to_string())
}

#[tauri::command]
async fn get_subtitles(url: String) -> Result<std::collections::HashMap<String, Vec<SubtitleInfo>>, String> {
    let ytdlp = get_ytdlp_path();

    let output = Command::new(&ytdlp)
        .args(["--dump-json", "--no-download", &url])
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let value: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut subtitles: std::collections::HashMap<String, Vec<SubtitleInfo>> = std::collections::HashMap::new();

    if let Some(subs) = value.get("subtitles").and_then(|s| s.as_object()) {
        for (lang, formats) in subs {
            if let Some(formats_arr) = formats.as_array() {
                let mut sub_infos = Vec::new();
                for fmt in formats_arr {
                    if let (Some(ext), Some(name)) = (
                        fmt.get("ext").and_then(|e| e.as_str()),
                        fmt.get("name").and_then(|n| n.as_str()),
                    ) {
                        sub_infos.push(SubtitleInfo {
                            ext: ext.to_string(),
                            name: name.to_string(),
                            url: fmt.get("url").and_then(|u| u.as_str()).map(|s| s.to_string()),
                        });
                    }
                }
                subtitles.insert(lang.clone(), sub_infos);
            }
        }
    }

    // Also check automatic_captions
    if let Some(caps) = value.get("automatic_captions").and_then(|s| s.as_object()) {
        for (lang, formats) in caps {
            if let Some(formats_arr) = formats.as_array() {
                let mut sub_infos = Vec::new();
                for fmt in formats_arr {
                    if let (Some(ext), Some(name)) = (
                        fmt.get("ext").and_then(|e| e.as_str()),
                        fmt.get("name").and_then(|n| n.as_str()),
                    ) {
                        sub_infos.push(SubtitleInfo {
                            ext: ext.to_string(),
                            name: format!("{} (自动)", name),
                            url: fmt.get("url").and_then(|u| u.as_str()).map(|s| s.to_string()),
                        });
                    }
                }
                subtitles.entry(lang.clone()).or_insert_with(Vec::new).extend(sub_infos);
            }
        }
    }

    Ok(subtitles)
}

#[tauri::command]
async fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;

    #[cfg(target_os = "windows")]
    Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    #[cfg(target_os = "windows")]
    Command::new("explorer")
        .arg("/select,")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new(&path)))
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn select_directory(_app: tauri::AppHandle) -> Result<Option<String>, String> {
    // Use the home directory as default
    let home = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/"))
        .join("Downloads")
        .join("yt-dlp");

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&home).ok();

    Ok(Some(home.to_string_lossy().to_string()))
}

#[tauri::command]
async fn check_update() -> Result<serde_json::Value, String> {
    let ytdlp = get_ytdlp_path();

    let output = Command::new(&ytdlp)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to get version: {}", e))?;

    let current = String::from_utf8_lossy(&output.stdout).trim().to_string();

    Ok(serde_json::json!({
        "current": current,
        "latest": current,
        "needsUpdate": false
    }))
}

#[tauri::command]
async fn update_ytdlp() -> Result<String, String> {
    let ytdlp = get_ytdlp_path();

    let output = Command::new(&ytdlp)
        .arg("-U")
        .output()
        .map_err(|e| format!("Failed to update: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(format!("{}\n{}", stdout, stderr))
    } else {
        Err(format!("Update failed: {}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            parse_video,
            get_formats,
            start_download,
            get_subtitles,
            open_file,
            open_folder,
            select_directory,
            check_update,
            update_ytdlp
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}