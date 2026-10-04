import type { Format, FormatPreset } from '../types';

export const BEST_VIDEO_SELECTOR = 'bv*+ba/b';
export const BEST_AUDIO_SELECTOR = 'ba/b';

const isStoryboard = (f: Format) => f.ext === 'mhtml' || f.format_note === 'storyboard';
export const isAudioOnly = (f: Format) => f.vcodec === 'none' && !!f.acodec && f.acodec !== 'none';

/** Formats that contain video (vcodec unknown counts as video), best first */
export function videoFormats(formats: Format[]): Format[] {
  return formats
    .filter((f) => !isStoryboard(f) && f.vcodec !== 'none')
    .sort((a, b) =>
      (b.height ?? 0) - (a.height ?? 0) ||
      (b.fps ?? 0) - (a.fps ?? 0) ||
      (b.tbr ?? 0) - (a.tbr ?? 0));
}

export function audioFormats(formats: Format[]): Format[] {
  return formats
    .filter(isAudioOnly)
    .sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0));
}

/** `-f` selector for a concrete video format; video-only formats get the best audio merged in */
export function videoSelector(f: Format | null): string {
  if (!f) return BEST_VIDEO_SELECTOR;
  return f.acodec === 'none' ? `${f.format_id}+ba/${f.format_id}` : f.format_id;
}

export function audioSelector(f: Format | null): string {
  return f ? f.format_id : BEST_AUDIO_SELECTOR;
}

export function presetSelector(preset: FormatPreset): string {
  if (preset === 'best') return BEST_VIDEO_SELECTOR;
  if (preset === 'audio') return BEST_AUDIO_SELECTOR;
  return `bv*[height<=${preset}]+ba/b[height<=${preset}]/${BEST_VIDEO_SELECTOR}`;
}

export const PRESET_LABELS: Record<FormatPreset, string> = {
  best: '最佳质量',
  '1080': '1080p',
  '720': '720p',
  '480': '480p',
  audio: '仅音频',
};

/** Pick the format matching the "default video format" setting; null means auto best */
export function pickDefaultVideo(formats: Format[], preference: string): Format | null {
  const maxHeight = parseInt(preference, 10);
  if (!maxHeight) return null;
  return videoFormats(formats).find((f) => f.height && f.height <= maxHeight) ?? null;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSize(f: Format | null | undefined): string {
  if (!f) return '-';
  if (f.filesize) return formatBytes(f.filesize);
  if (f.filesize_approx) return `~${formatBytes(f.filesize_approx)}`;
  return '-';
}

export function formatSpeed(bytesPerSecond: number | null): string {
  return bytesPerSecond ? `${formatBytes(bytesPerSecond)}/s` : '';
}

export function formatEta(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds)) return '';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export function formatLabel(f: Format): string {
  if (isAudioOnly(f)) {
    const kbps = f.abr ?? f.tbr;
    return kbps ? `${Math.round(kbps)} kbps` : f.format_note || f.format_id;
  }
  if (f.height) return `${f.height}p${f.fps && f.fps > 30 ? Math.round(f.fps) : ''}`;
  return f.format_note || f.resolution || f.format_id;
}

const shortCodec = (codec?: string) => codec?.split('.')[0];

export function formatDetail(f: Format): string {
  const parts: string[] = [];
  if (f.ext) parts.push(f.ext.toUpperCase());
  if (f.vcodec && f.vcodec !== 'none') parts.push(shortCodec(f.vcodec)!);
  if (f.acodec && f.acodec !== 'none') parts.push(shortCodec(f.acodec)!);
  if (f.dynamic_range && f.dynamic_range !== 'SDR') parts.push(f.dynamic_range);
  if (f.vcodec !== 'none' && f.acodec === 'none') parts.push('需合并音频');
  return parts.join(' · ');
}
