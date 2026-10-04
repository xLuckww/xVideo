// Video / playlist information from `parse_video` (a trimmed `yt-dlp -J`)
export interface VideoInfo {
  _type?: string;
  id: string;
  title: string;
  uploader?: string;
  uploader_id?: string;
  channel?: string;
  upload_date?: string;
  duration?: number;
  duration_string?: string;
  view_count?: number;
  like_count?: number;
  thumbnail?: string;
  webpage_url?: string;
  original_url?: string;
  extractor_key?: string;
  playlist_count?: number;
  is_live?: boolean;
  formats?: Format[];
  entries?: PlaylistEntry[];
  subtitles?: Record<string, SubtitleTrack[]>;
  automatic_captions?: Record<string, SubtitleTrack[]>;
}

export interface PlaylistEntry {
  id?: string;
  title?: string;
  url?: string;
  webpage_url?: string;
  duration?: number;
  uploader?: string;
  channel?: string;
}

export interface Format {
  format_id: string;
  format_note?: string;
  ext?: string;
  resolution?: string;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  abr?: number;
  vbr?: number;
  tbr?: number;
  filesize?: number;
  filesize_approx?: number;
  format?: string;
  dynamic_range?: string;
  language?: string;
}

export interface SubtitleTrack {
  ext?: string;
  name?: string;
}

// Options passed to the Rust side
export interface NetworkOptions {
  proxy: string;
  cookieEnabled: boolean;
  cookieSource: string;
  cookieFile: string;
  limitRate?: string;
  retries?: number;
  concurrentFragments?: number;
}

export interface PostProcessingOptions {
  embedSubs: boolean;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  embedChapters: boolean;
  sponsorblockRemove: boolean;
}

export interface SubtitleOptions {
  langs: string[];
  includeAuto: boolean;
  convert?: string;
}

export interface DownloadRequest {
  taskId: string;
  url: string;
  format?: string;
  extractAudio?: string;
  mergeFormat?: string;
  outputDir: string;
  filenameTemplate: string;
  skipDownload?: boolean;
  subtitles?: SubtitleOptions;
  postProcessing: PostProcessingOptions;
  network: NetworkOptions;
}

// Download tasks
export type TaskKind = 'video' | 'audio' | 'subtitle';
export type TaskStatus = 'starting' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';
export type FinishedStatus = 'completed' | 'error' | 'cancelled';

export interface TaskProgress {
  percent: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
  speed: number | null;
  eta: number | null;
}

export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  kind: TaskKind;
  formatLabel: string;
  sizeLabel: string;
  /** Free-form marker so a page can find the tasks it started */
  tag?: string;
  status: TaskStatus;
  progress: TaskProgress | null;
  outputDir: string;
  files: string[];
  error: string | null;
  createdAt: number;
  finishedAt: number | null;
}

export interface TaskResult {
  taskId: string;
  status: FinishedStatus;
  error: string | null;
  files: string[];
  totalBytes: number | null;
}

// App settings
export interface AppSettings {
  // General
  defaultOutputPath: string;
  filenameTemplate: string;
  defaultVideoFormat: string;
  defaultAudioFormat: string;
  subtitleFormat: string;

  // Network
  proxy: string;
  limitRate: string;
  retries: number;
  concurrentFragments: number;

  // Advanced
  autoUpdate: boolean;
  keepArchive: boolean;
  shutdownAfterDownload: boolean;
  useSystemProxy: boolean;
  cookieEnabled: boolean;
  cookieSource: string;
  cookieFile: string;
}

// Batch download
export type FormatPreset = 'best' | '1080' | '720' | '480' | 'audio';

export interface BatchOptions {
  preset: FormatPreset;
  concurrency: number;
  skipDownloaded: boolean;
  continueOnError: boolean;
}

export type BatchItemStatus = 'parsing' | 'ready' | 'queued' | 'downloading' | 'done' | 'error' | 'skipped' | 'cancelled';

export interface BatchItem {
  id: string;
  url: string;
  status: BatchItemStatus;
  title?: string;
  error?: string;
  taskId?: string;
}

// History record
export interface HistoryRecord {
  id: string;
  title: string;
  url: string;
  kind?: TaskKind;
  format: string;
  size: string;
  date: string;
  files?: string[];
  outputDir?: string;
}

// Bundled engine and tools from `get_environment`
export interface Environment {
  ytdlp: string | null;
  /** bundled = built into the app, updated = downloaded via engine update */
  engineSource: 'bundled' | 'updated' | null;
  bundledVersion: string | null;
  ffmpeg: string | null;
  ffprobe: string | null;
  jsRuntime: string | null;
  jsRuntimePath: string | null;
  version: string | null;
}

export interface EngineUpdateInfo {
  current: string | null;
  latest: string;
  updateAvailable: boolean;
  releaseUrl: string;
}

export interface EngineUpdateProgress {
  stage: 'downloading' | 'installing';
  downloaded: number;
  total: number | null;
}
