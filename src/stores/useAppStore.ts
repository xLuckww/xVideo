import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  VideoInfo, DownloadTask, PostProcessingOptions, AppSettings, HistoryRecord,
  BatchItem, BatchOptions, Environment,
} from '../types';

export type FormatTab = 'video' | 'audio' | 'subtitle';
/** formatId null = let yt-dlp pick the best */
export interface MediaSelection {
  kind: 'video' | 'audio';
  formatId: string | null;
}
type Updater<T> = T | ((prev: T) => T);

interface AppState {
  // Single download
  currentUrl: string;
  videoInfo: VideoInfo | null;
  isParsing: boolean;
  parseError: string | null;
  formatTab: FormatTab;
  selection: MediaSelection;
  audioTarget: string;
  subtitleKeys: string[];

  // Post-processing
  postProcessing: PostProcessingOptions;

  // Download tasks (not persisted)
  tasks: DownloadTask[];

  // Batch download
  batchUrls: string;
  batchItems: BatchItem[];
  batchRunning: boolean;
  batchOptions: BatchOptions;

  // Subtitle page
  subtitleUrl: string;
  subtitleInfo: VideoInfo | null;

  // History
  history: HistoryRecord[];

  // Settings
  settings: AppSettings;
  environment: Environment | null;

  // Navigation
  currentPage: 'download' | 'batch' | 'history' | 'subtitle' | 'settings' | 'donate';

  // Actions
  setCurrentUrl: (url: string) => void;
  setVideoInfo: (info: VideoInfo | null) => void;
  setIsParsing: (parsing: boolean) => void;
  setParseError: (error: string | null) => void;
  setFormatTab: (tab: FormatTab) => void;
  setSelection: (selection: MediaSelection) => void;
  setAudioTarget: (format: string) => void;
  setSubtitleKeys: (keys: string[]) => void;
  setPostProcessing: (options: Partial<PostProcessingOptions>) => void;
  addTask: (task: DownloadTask) => void;
  updateTask: (id: string, updates: Partial<DownloadTask>) => void;
  removeTask: (id: string) => void;
  clearFinishedTasks: () => void;
  setBatchUrls: (urls: string) => void;
  setBatchItems: (items: Updater<BatchItem[]>) => void;
  updateBatchItem: (id: string, updates: Partial<BatchItem>) => void;
  setBatchRunning: (running: boolean) => void;
  setBatchOptions: (options: Partial<BatchOptions>) => void;
  setSubtitleUrl: (url: string) => void;
  setSubtitleInfo: (info: VideoInfo | null) => void;
  addHistory: (record: HistoryRecord) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  setEnvironment: (env: Environment | null) => void;
  setCurrentPage: (page: AppState['currentPage']) => void;
}

export const DEFAULT_OUTPUT_PATH = '~/Downloads/xVideo';
// localStorage 容量有限（约 5MB），只保留最近的记录
const MAX_HISTORY = 1000;
export const DEFAULT_FILENAME_TEMPLATE = '%(title)s.%(ext)s';

export const defaultSettings: AppSettings = {
  defaultOutputPath: DEFAULT_OUTPUT_PATH,
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  defaultVideoFormat: 'best',
  defaultAudioFormat: 'mp3',
  subtitleFormat: 'srt',
  proxy: '',
  limitRate: '',
  retries: 10,
  concurrentFragments: 3,
  autoUpdate: true,
  keepArchive: true,
  shutdownAfterDownload: false,
  useSystemProxy: false,
  cookieEnabled: false,
  cookieSource: 'chrome',
  cookieFile: '',
};

const defaultPostProcessing: PostProcessingOptions = {
  embedSubs: false,
  embedThumbnail: false,
  embedMetadata: true,
  embedChapters: false,
  sponsorblockRemove: false,
};

const defaultBatchOptions: BatchOptions = {
  preset: 'best',
  concurrency: 3,
  skipDownloaded: true,
  continueOnError: true,
};

// Settings saved by versions before the persisted store
function loadLegacySettings(): AppSettings {
  try {
    const saved = localStorage.getItem('ytdlp-settings');
    if (saved) {
      const legacy = { ...defaultSettings, ...JSON.parse(saved) };
      if (legacy.cookieSource === 'none') legacy.cookieSource = defaultSettings.cookieSource;
      return legacy;
    }
  } catch {}
  return defaultSettings;
}

export const isTaskActive = (t: Pick<DownloadTask, 'status'>) => t.status === 'starting' || t.status === 'downloading' || t.status === 'processing';

export const useAppStore = create<AppState>()(persist((set) => ({
  // Initial state
  currentUrl: '',
  videoInfo: null,
  isParsing: false,
  parseError: null,
  formatTab: 'video',
  selection: { kind: 'video', formatId: null },
  audioTarget: loadLegacySettings().defaultAudioFormat,
  subtitleKeys: [],
  postProcessing: defaultPostProcessing,
  tasks: [],
  batchUrls: '',
  batchItems: [],
  batchRunning: false,
  batchOptions: defaultBatchOptions,
  subtitleUrl: '',
  subtitleInfo: null,
  history: [],
  settings: loadLegacySettings(),
  environment: null,
  currentPage: 'download',

  // Actions
  setCurrentUrl: (url) => set({ currentUrl: url }),
  setVideoInfo: (info) => set({ videoInfo: info }),
  setIsParsing: (parsing) => set({ isParsing: parsing }),
  setParseError: (error) => set({ parseError: error }),
  setFormatTab: (tab) => set({ formatTab: tab }),
  setSelection: (selection) => set({ selection }),
  setAudioTarget: (format) => set({ audioTarget: format }),
  setSubtitleKeys: (keys) => set({ subtitleKeys: keys }),
  setPostProcessing: (options) =>
    set((state) => ({ postProcessing: { ...state.postProcessing, ...options } })),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) =>
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
  clearFinishedTasks: () => set((state) => ({ tasks: state.tasks.filter(isTaskActive) })),
  setBatchUrls: (urls) => set({ batchUrls: urls }),
  setBatchItems: (items) => set((state) => ({
    batchItems: typeof items === 'function' ? items(state.batchItems) : items,
  })),
  updateBatchItem: (id, updates) =>
    set((state) => ({ batchItems: state.batchItems.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
  setBatchRunning: (running) => set({ batchRunning: running }),
  setBatchOptions: (options) =>
    set((state) => ({ batchOptions: { ...state.batchOptions, ...options } })),
  setSubtitleUrl: (url) => set({ subtitleUrl: url }),
  setSubtitleInfo: (info) => set({ subtitleInfo: info }),
  addHistory: (record) => set((state) => ({ history: [record, ...state.history].slice(0, MAX_HISTORY) })),
  removeHistory: (id) => set((state) => ({ history: state.history.filter((r) => r.id !== id) })),
  clearHistory: () => set({ history: [] }),
  setSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
  resetSettings: () => set({ settings: defaultSettings }),
  setEnvironment: (env) => set({ environment: env }),
  setCurrentPage: (page) => set({ currentPage: page }),
}), {
  name: 'xvideo-state',
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    settings: state.settings,
    postProcessing: state.postProcessing,
    batchOptions: state.batchOptions,
    audioTarget: state.audioTarget,
    // "保留下载记录" 关闭时不落盘
    history: state.settings.keepArchive ? state.history : [],
  }),
  merge: (persisted, current) => {
    const p = (persisted ?? {}) as Partial<AppState>;
    return {
      ...current,
      ...p,
      settings: { ...current.settings, ...p.settings },
      postProcessing: { ...current.postProcessing, ...p.postProcessing },
      batchOptions: { ...current.batchOptions, ...p.batchOptions },
    };
  },
}));
