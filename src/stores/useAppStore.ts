import { create } from 'zustand';
import type { VideoInfo, Format, DownloadTask, PostProcessingOptions, AppSettings, HistoryRecord } from '../types';

interface AppState {
  // Current video
  currentUrl: string;
  videoInfo: VideoInfo | null;
  isParsing: boolean;
  parseError: string | null;

  // Format selection
  selectedFormat: Format | null;
  formatTab: 'video' | 'audio' | 'subtitle';

  // Post-processing
  postProcessing: PostProcessingOptions;

  // Downloads
  downloads: DownloadTask[];
  currentDownload: DownloadTask | null;

  // Batch download
  batchUrls: string;
  batchItems: Array<{ url: string; status: string; title?: string; error?: string }>;

  // History
  history: HistoryRecord[];

  // Settings
  settings: AppSettings;

  // Navigation
  currentPage: 'download' | 'batch' | 'history' | 'subtitle' | 'settings' | 'donate';

  // Actions
  setCurrentUrl: (url: string) => void;
  setVideoInfo: (info: VideoInfo | null) => void;
  setIsParsing: (parsing: boolean) => void;
  setParseError: (error: string | null) => void;
  setSelectedFormat: (format: Format | null) => void;
  setFormatTab: (tab: 'video' | 'audio' | 'subtitle') => void;
  setPostProcessing: (options: Partial<PostProcessingOptions>) => void;
  addDownload: (task: DownloadTask) => void;
  updateDownload: (id: string, updates: Partial<DownloadTask>) => void;
  setCurrentDownload: (task: DownloadTask | null) => void;
  setBatchUrls: (urls: string) => void;
  setBatchItems: (items: Array<{ url: string; status: string; title?: string; error?: string }> | ((prev: Array<{ url: string; status: string; title?: string; error?: string }>) => Array<{ url: string; status: string; title?: string; error?: string }>)) => void;
  addHistory: (record: HistoryRecord) => void;
  setHistory: (records: HistoryRecord[]) => void;
  removeHistory: (id: string) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setCurrentPage: (page: AppState['currentPage']) => void;
}

const defaultSettings: AppSettings = {
  defaultOutputPath: '~/Downloads/xVideo',
  filenameTemplate: '%(title)s.%(ext)s',
  defaultVideoFormat: 'best',
  defaultAudioFormat: 'mp3',
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

// Load saved settings from localStorage
function loadSavedSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('ytdlp-settings');
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch {}
  return defaultSettings;
}

const defaultPostProcessing: PostProcessingOptions = {
  embedSubs: false,
  embedThumbnail: false,
  embedMetadata: true,
  embedChapters: false,
  sponsorblockRemove: false,
};

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentUrl: '',
  videoInfo: null,
  isParsing: false,
  parseError: null,
  selectedFormat: null,
  formatTab: 'video',
  postProcessing: defaultPostProcessing,
  downloads: [],
  currentDownload: null,
  batchUrls: '',
  batchItems: [],
  history: [],
  settings: loadSavedSettings(),
  currentPage: 'download',

  // Actions
  setCurrentUrl: (url) => set({ currentUrl: url }),
  setVideoInfo: (info) => set({ videoInfo: info }),
  setIsParsing: (parsing) => set({ isParsing: parsing }),
  setParseError: (error) => set({ parseError: error }),
  setSelectedFormat: (format) => set({ selectedFormat: format }),
  setFormatTab: (tab) => set({ formatTab: tab }),
  setPostProcessing: (options) =>
    set((state) => ({
      postProcessing: { ...state.postProcessing, ...options },
    })),
  addDownload: (task) =>
    set((state) => ({ downloads: [...state.downloads, task] })),
  updateDownload: (id, updates) =>
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      currentDownload:
        state.currentDownload?.id === id
          ? { ...state.currentDownload, ...updates }
          : state.currentDownload,
    })),
  setCurrentDownload: (task) => set({ currentDownload: task }),
  setBatchUrls: (urls) => set({ batchUrls: urls }),
  setBatchItems: (items) => set((state) => ({
    batchItems: typeof items === 'function' ? items(state.batchItems) : items,
  })),
  addHistory: (record) =>
    set((state) => ({ history: [record, ...state.history] })),
  setHistory: (records) => set({ history: records }),
  removeHistory: (id) =>
    set((state) => ({ history: state.history.filter((r) => r.id !== id) })),
  setSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  setCurrentPage: (page) => set({ currentPage: page }),
}));