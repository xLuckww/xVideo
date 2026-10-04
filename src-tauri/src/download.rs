//! 下载任务：每个任务一个 yt-dlp 进程，按 taskId 推送进度事件，支持取消。
//!
//! 进度通过 `--progress-template` / `--print` 输出带前缀的机器可读行：
//!   XVP {json}   下载进度
//!   XVS <stage>  阶段切换（downloading / processing）
//!   XVF "path"   最终输出文件

use crate::ytdlp::{self, NetworkOptions};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet, VecDeque};
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

const PROGRESS_TEMPLATE: &str = "download:XVP %(progress.{status,downloaded_bytes,total_bytes,total_bytes_estimate,speed,eta,fragment_index,fragment_count})j";
const STDERR_TAIL_LINES: usize = 50;

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PostProcessingOptions {
    pub embed_subs: bool,
    pub embed_thumbnail: bool,
    pub embed_metadata: bool,
    pub embed_chapters: bool,
    pub sponsorblock_remove: bool,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SubtitleOptions {
    pub langs: Vec<String>,
    pub include_auto: bool,
    /// srt / vtt / ass / lrc，为空则保留原始格式
    pub convert: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    pub task_id: String,
    pub url: String,
    /// yt-dlp `-f` 格式选择器
    #[serde(default)]
    pub format: Option<String>,
    /// 提取音频的目标格式（mp3/aac/...），"best" 表示保留原始编码
    #[serde(default)]
    pub extract_audio: Option<String>,
    #[serde(default)]
    pub merge_format: Option<String>,
    pub output_dir: String,
    pub filename_template: String,
    /// 只下载字幕等附属文件
    #[serde(default)]
    pub skip_download: bool,
    #[serde(default)]
    pub subtitles: Option<SubtitleOptions>,
    #[serde(default)]
    pub post_processing: PostProcessingOptions,
    #[serde(default)]
    pub network: NetworkOptions,
}

fn non_empty(s: &Option<String>) -> Option<&str> {
    s.as_deref().map(str::trim).filter(|s| !s.is_empty())
}

pub fn build_args(req: &DownloadRequest, output_dir: &Path) -> (Vec<String>, Option<crate::cookies::TempDir>) {
    let mut args: Vec<String> = vec![
        "--newline".into(),
        "--progress".into(),
        "--progress-delta".into(),
        "0.5".into(),
        "--progress-template".into(),
        PROGRESS_TEMPLATE.into(),
        "--print".into(),
        "before_dl:XVS downloading".into(),
        "--print".into(),
        "post_process:XVS processing".into(),
        "--print".into(),
        "after_move:XVF %(filepath)j".into(),
        "--no-playlist".into(),
        "-P".into(),
        output_dir.to_string_lossy().into_owned(),
        "-o".into(),
        req.filename_template.clone(),
    ];

    if let Some(format) = non_empty(&req.format) {
        args.extend(["-f".into(), format.into()]);
    }
    if let Some(audio) = non_empty(&req.extract_audio) {
        args.push("-x".into());
        if audio != "best" {
            args.extend(["--audio-format".into(), audio.into()]);
        }
        args.extend(["--audio-quality".into(), "0".into()]);
    } else if let Some(merge) = non_empty(&req.merge_format) {
        args.extend(["--merge-output-format".into(), merge.into()]);
    }
    if req.skip_download {
        args.push("--skip-download".into());
    }

    if let Some(subs) = &req.subtitles {
        if !subs.langs.is_empty() {
            args.push("--write-subs".into());
            if subs.include_auto {
                args.push("--write-auto-subs".into());
            }
            args.extend(["--sub-langs".into(), subs.langs.join(",")]);
        }
        if let Some(convert) = non_empty(&subs.convert) {
            args.extend(["--convert-subs".into(), convert.into()]);
        }
    }

    let pp = &req.post_processing;
    if !req.skip_download {
        if pp.embed_subs {
            args.push("--embed-subs".into());
        }
        if pp.embed_thumbnail {
            args.push("--embed-thumbnail".into());
        }
        if pp.embed_metadata {
            args.push("--embed-metadata".into());
        }
        if pp.embed_chapters {
            args.push("--embed-chapters".into());
        }
        if pp.sponsorblock_remove {
            args.extend(["--sponsorblock-remove".into(), "all".into()]);
        }
    }

    let cookies = req.network.push_common_args(&mut args);
    req.network.push_download_args(&mut args);

    // "--" 之后的参数一律视为 URL，防止以 "-" 开头的输入被当成选项
    args.push("--".into());
    args.push(req.url.clone());
    (args, cookies)
}

#[derive(Default)]
pub struct DownloadManager {
    running: Mutex<HashMap<String, u32>>,
    cancelled: Mutex<HashSet<String>>,
}

impl DownloadManager {
    pub fn kill_all(&self) {
        let pids: Vec<u32> = self.running.lock().unwrap().values().copied().collect();
        for pid in pids {
            let _ = kill_tree(pid);
        }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressEvent<'a> {
    task_id: &'a str,
    progress: Value,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StageEvent<'a> {
    task_id: &'a str,
    stage: &'a str,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct FinishedEvent<'a> {
    task_id: &'a str,
    status: &'a str,
    error: Option<String>,
    files: Vec<String>,
    total_bytes: Option<u64>,
}

fn for_each_line(reader: impl Read, mut f: impl FnMut(&str)) {
    let mut reader = BufReader::new(reader);
    let mut buf = Vec::new();
    loop {
        buf.clear();
        match reader.read_until(b'\n', &mut buf) {
            Ok(0) | Err(_) => break,
            Ok(_) => {
                let line = String::from_utf8_lossy(&buf);
                f(line.trim_end_matches(['\r', '\n']));
            }
        }
    }
}

fn handle_stdout_line(app: &AppHandle, task_id: &str, line: &str, files: &mut Vec<String>) {
    if let Some(json) = line.strip_prefix("XVP ") {
        if let Ok(progress) = serde_json::from_str::<Value>(json) {
            let _ = app.emit("download-progress", ProgressEvent { task_id, progress });
        }
    } else if let Some(stage) = line.strip_prefix("XVS ") {
        let _ = app.emit("download-stage", StageEvent { task_id, stage: stage.trim() });
    } else if let Some(json) = line.strip_prefix("XVF ") {
        // after_move 可能对同一文件触发多次
        if let Ok(path) = serde_json::from_str::<String>(json) {
            if !files.contains(&path) {
                files.push(path);
            }
        }
    }
}

pub fn start(app: &AppHandle, req: DownloadRequest) -> Result<(), String> {
    let output_dir = ytdlp::expand_home(&req.output_dir);
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("无法创建保存目录 {}: {e}", output_dir.display()))?;

    let (args, cookies) = build_args(&req, &output_dir);
    let mut cmd = ytdlp::command();
    cmd.args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    // 放进独立进程组，取消时可以连同 ffmpeg 子进程一起结束
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }

    let mut child = cmd.spawn().map_err(ytdlp::spawn_error)?;
    let task_id = req.task_id;
    app.state::<DownloadManager>()
        .running
        .lock()
        .unwrap()
        .insert(task_id.clone(), child.id());

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let app = app.clone();

    std::thread::spawn(move || {
        // 临时 Cookie 库在进程结束后再删除
        let _cookies = cookies;
        let tail = Arc::new(Mutex::new(VecDeque::with_capacity(STDERR_TAIL_LINES)));
        let stderr_thread = stderr.map(|stderr| {
            let tail = tail.clone();
            std::thread::spawn(move || {
                for_each_line(stderr, |line| {
                    let mut tail = tail.lock().unwrap();
                    if tail.len() == STDERR_TAIL_LINES {
                        tail.pop_front();
                    }
                    tail.push_back(line.to_string());
                });
            })
        });

        let mut files = Vec::new();
        if let Some(stdout) = stdout {
            for_each_line(stdout, |line| handle_stdout_line(&app, &task_id, line, &mut files));
        }
        let exit = child.wait();
        if let Some(t) = stderr_thread {
            let _ = t.join();
        }

        let manager = app.state::<DownloadManager>();
        manager.running.lock().unwrap().remove(&task_id);
        let cancelled = manager.cancelled.lock().unwrap().remove(&task_id);

        let (status, error) = if cancelled {
            ("cancelled", None)
        } else {
            match exit {
                Ok(s) if s.success() => ("completed", None),
                Ok(_) => {
                    let tail: Vec<String> = tail.lock().unwrap().iter().cloned().collect();
                    ytdlp::write_log("download-error.log", &args, &tail);
                    ("error", Some(ytdlp::summarize_error(&tail)))
                }
                Err(e) => ("error", Some(format!("进程异常: {e}"))),
            }
        };
        let sizes: Vec<u64> = files
            .iter()
            .filter_map(|f| std::fs::metadata(f).ok().map(|m| m.len()))
            .collect();
        let total_bytes = (!sizes.is_empty()).then(|| sizes.iter().sum());
        let _ = app.emit(
            "download-finished",
            FinishedEvent { task_id: &task_id, status, error, files, total_bytes },
        );
    });

    Ok(())
}

pub fn cancel(app: &AppHandle, task_id: &str) -> Result<(), String> {
    let manager = app.state::<DownloadManager>();
    let pid = manager
        .running
        .lock()
        .unwrap()
        .get(task_id)
        .copied()
        .ok_or_else(|| "任务未在运行".to_string())?;
    manager.cancelled.lock().unwrap().insert(task_id.to_string());
    kill_tree(pid)
}

#[cfg(unix)]
fn kill_tree(pid: u32) -> Result<(), String> {
    Command::new("kill")
        .args(["-TERM", &format!("-{pid}")])
        .status()
        .map(|_| ())
        .map_err(|e| format!("取消失败: {e}"))
}

#[cfg(windows)]
fn kill_tree(pid: u32) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map(|_| ())
        .map_err(|e| format!("取消失败: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(json: Value) -> DownloadRequest {
        let mut base = serde_json::json!({
            "taskId": "t1",
            "url": "https://example.com/v",
            "outputDir": "/tmp/out",
            "filenameTemplate": "%(title)s.%(ext)s",
        });
        base.as_object_mut().unwrap().extend(json.as_object().unwrap().clone());
        serde_json::from_value(base).unwrap()
    }

    fn has_pair(args: &[String], flag: &str, value: &str) -> bool {
        args.windows(2).any(|w| w[0] == flag && w[1] == value)
    }

    #[test]
    fn url_comes_last_after_separator() {
        let (args, _) = build_args(&request(serde_json::json!({})), Path::new("/tmp/out"));
        assert_eq!(&args[args.len() - 2..], ["--", "https://example.com/v"]);
        assert!(has_pair(&args, "-P", "/tmp/out"));
        assert!(!args.iter().any(|a| a == "--hls-prefer-native"));
    }

    #[test]
    fn audio_extraction_skips_merge_format() {
        let (args, _) = build_args(
            &request(serde_json::json!({ "format": "ba/b", "extractAudio": "mp3", "mergeFormat": "mp4" })),
            Path::new("/tmp/out"),
        );
        assert!(args.iter().any(|a| a == "-x"));
        assert!(has_pair(&args, "--audio-format", "mp3"));
        assert!(!args.iter().any(|a| a == "--merge-output-format"));
    }

    #[test]
    fn subtitle_only_download() {
        let (args, _) = build_args(
            &request(serde_json::json!({
                "skipDownload": true,
                "subtitles": { "langs": ["en", "zh-Hans"], "includeAuto": true, "convert": "srt" },
                "postProcessing": { "embedSubs": true }
            })),
            Path::new("/tmp/out"),
        );
        assert!(args.iter().any(|a| a == "--skip-download"));
        assert!(args.iter().any(|a| a == "--write-auto-subs"));
        assert!(has_pair(&args, "--sub-langs", "en,zh-Hans"));
        assert!(has_pair(&args, "--convert-subs", "srt"));
        assert!(!args.iter().any(|a| a == "--embed-subs"));
    }
}
