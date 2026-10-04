//! 解析视频 / 播放列表信息，并裁剪成前端需要的字段。
//!
//! yt-dlp 的 -J 输出很大（分片、请求头、上百种自动字幕的 URL），
//! 这里按字段白名单挑选，而不是用强类型反序列化，避免个别网站字段类型不一致导致整体解析失败。

use crate::ytdlp::{self, NetworkOptions};
use serde_json::{Map, Value};

const VIDEO_KEYS: &[&str] = &[
    "_type", "id", "title", "uploader", "uploader_id", "channel", "upload_date",
    "duration", "duration_string", "view_count", "like_count", "thumbnail",
    "webpage_url", "original_url", "extractor_key", "playlist_count", "is_live",
];
const FORMAT_KEYS: &[&str] = &[
    "format_id", "format_note", "ext", "resolution", "width", "height", "fps",
    "vcodec", "acodec", "abr", "vbr", "tbr", "filesize", "filesize_approx",
    "format", "dynamic_range", "language",
];
const ENTRY_KEYS: &[&str] = &["id", "ie_key", "title", "url", "webpage_url", "duration", "uploader", "channel"];
const SUBTITLE_KEYS: &[&str] = &["ext", "name"];

fn pick(src: &Value, keys: &[&str]) -> Map<String, Value> {
    keys.iter()
        .filter_map(|k| src.get(*k).filter(|v| !v.is_null()).map(|v| (k.to_string(), v.clone())))
        .collect()
}

fn pick_list(src: Option<&Value>, keys: &[&str]) -> Option<Value> {
    src.and_then(Value::as_array).map(|items| {
        items
            .iter()
            .filter(|v| v.is_object())
            .map(|v| Value::Object(pick(v, keys)))
            .collect()
    })
}

pub fn project(info: &Value) -> Value {
    let mut out = pick(info, VIDEO_KEYS);
    if let Some(formats) = pick_list(info.get("formats"), FORMAT_KEYS) {
        out.insert("formats".into(), formats);
    }
    if let Some(entries) = pick_list(info.get("entries"), ENTRY_KEYS) {
        out.insert("entries".into(), entries);
    }
    for key in ["subtitles", "automatic_captions"] {
        if let Some(map) = info.get(key).and_then(Value::as_object) {
            let tracks: Map<String, Value> = map
                .iter()
                .filter_map(|(lang, list)| pick_list(Some(list), SUBTITLE_KEYS).map(|l| (lang.clone(), l)))
                .collect();
            out.insert(key.into(), Value::Object(tracks));
        }
    }
    Value::Object(out)
}

pub fn parse_video(url: &str, network: &NetworkOptions, allow_playlist: bool) -> Result<Value, String> {
    // -v 的调试信息只写日志，用于排查 Cookie / 代理 / JS 运行时问题
    let mut args: Vec<String> = vec!["-v".into(), "-J".into(), "--flat-playlist".into()];
    if !allow_playlist {
        args.push("--no-playlist".into());
    }
    let _cookies = network.push_common_args(&mut args);
    args.push("--".into());
    args.push(url.to_string());

    let output = ytdlp::command().args(&args).output().map_err(ytdlp::spawn_error)?;
    let stderr = String::from_utf8_lossy(&output.stderr);
    let lines: Vec<&str> = stderr.lines().collect();
    ytdlp::write_log("parse.log", &args, &lines);
    if !output.status.success() {
        return Err(ytdlp::summarize_error(&lines));
    }
    let info: Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("无法解析 yt-dlp 输出: {e}"))?;
    Ok(project(&info))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn projects_whitelisted_fields() {
        let info = json!({
            "id": "abc", "title": "t", "http_headers": {"a": "b"}, "uploader": null,
            "formats": [{"format_id": "18", "height": 360, "url": "https://x", "fragments": []}],
            "automatic_captions": {"en": [{"ext": "vtt", "name": "English", "url": "https://x"}]},
        });
        let out = project(&info);
        assert_eq!(out["id"], "abc");
        assert!(out.get("http_headers").is_none());
        assert!(out.get("uploader").is_none());
        assert_eq!(out["formats"][0], json!({"format_id": "18", "height": 360}));
        assert_eq!(out["automatic_captions"]["en"][0], json!({"ext": "vtt", "name": "English"}));
    }

    #[test]
    fn projects_playlist_entries() {
        let info = json!({
            "_type": "playlist", "title": "list", "playlist_count": 2,
            "entries": [{"id": "1", "url": "https://a", "title": "A", "ie_key": "Youtube"}, null],
        });
        let out = project(&info);
        assert_eq!(out["entries"].as_array().unwrap().len(), 1);
        assert_eq!(out["entries"][0], json!({"id": "1", "ie_key": "Youtube", "url": "https://a", "title": "A"}));
    }
}
