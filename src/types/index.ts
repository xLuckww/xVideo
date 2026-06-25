// Video information from yt-dlp -j
export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  uploader: string;
  uploader_id: string;
  upload_date: string;
  duration: number;
  duration_string: string;
  view_count: number;
  like_count: number;
  thumbnail: string;
  thumbnails: Thumbnail[];
  formats: Format[];
  subtitles: Record<string, SubtitleInfo[]>;
  webpage_url: string;
  original_url: string;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface Format {
  format_id: string;
  format_note: string;
  ext: string;
  resolution: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  vcodec: string;
  acodec: string;
  abr: number | null;
  vbr: number | null;
  filesize: number | null;
  filesize_approx: number | null;
  tbr: number | null;
  quality: number | null;
  format: string;
}

export interface SubtitleInfo {
  ext: string;
  url: string;
  name: string;
}

// Download progress from yt-dlp stdout
export interface DownloadProgress {
  status: 'downloading' | 'merging' | 'finished' | 'error';
  percent: number;
  downloaded: string;
  total: string;
  speed: string;
  eta: string;
}

// Download task
export interface DownloadTask {
  id: string;
  url: string;
  videoInfo: VideoInfo | null;
  selectedFormat: Format | null;
  status: 'pending' | 'parsing' | 'downloading' | 'completed' | 'error';
  progress: DownloadProgress | null;
  outputPath: string;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// Post-processing options
export interface PostProcessingOptions {
  embedSubs: boolean;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  embedChapters: boolean;
  sponsorblockRemove: boolean;
}

// App settings
export interface AppSettings {
  // General
  defaultOutputPath: string;
  filenameTemplate: string;
  defaultVideoFormat: string;
  defaultAudioFormat: string;

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
export interface BatchItem {
  url: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

// History record
export interface HistoryRecord {
  id: string;
  title: string;
  url: string;
  format: string;
  size: string;
  date: string;
}