import { invoke } from '@tauri-apps/api/core';
import type { VideoInfo, Format, PostProcessingOptions } from '../types';

/**
 * Parse video information from URL
 */
export async function parseVideo(url: string, cookieSource?: string): Promise<VideoInfo> {
  return await invoke<VideoInfo>('parse_video', { url, cookieSource: cookieSource || 'none' });
}

/**
 * Get available formats for a video
 */
export async function getFormats(url: string): Promise<Format[]> {
  return await invoke<Format[]>('get_formats', { url });
}

/**
 * Start downloading a video
 */
export async function startDownload(
  url: string,
  formatId: string,
  outputPath: string,
  filenameTemplate: string,
  postProcessing: PostProcessingOptions,
  settings: {
    proxy?: string;
    limitRate?: string;
    retries?: number;
    concurrentFragments?: number;
    cookieSource?: string;
  }
): Promise<string> {
  return await invoke<string>('start_download', {
    url,
    formatId,
    outputPath,
    filenameTemplate,
    postProcessing,
    settings,
  });
}

/**
 * Get available subtitles for a video
 */
export async function getSubtitles(url: string): Promise<Record<string, { ext: string; name: string }[]>> {
  return await invoke<Record<string, { ext: string; name: string }[]>>('get_subtitles', { url });
}

/**
 * Open file in system file manager
 */
export async function openFile(path: string): Promise<void> {
  await invoke('open_file', { path });
}

/**
 * Open folder in system file manager
 */
export async function openFolder(path: string): Promise<void> {
  await invoke('open_folder', { path });
}

/**
 * Select output directory
 */
export async function selectDirectory(): Promise<string | null> {
  return await invoke<string | null>('select_directory');
}

/**
 * Save settings to config file
 */
export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await invoke('save_settings', { settings });
}

/**
 * Load settings from config file
 */
export async function loadSettings(): Promise<Record<string, unknown>> {
  return await invoke<Record<string, unknown>>('load_settings');
}

/**
 * Check for yt-dlp updates
 */
export async function checkUpdate(): Promise<{ current: string; latest: string; needsUpdate: boolean }> {
  return await invoke('check_update');
}

/**
 * Update yt-dlp to latest version
 */
export async function updateYtdlp(): Promise<string> {
  return await invoke<string>('update_ytdlp');
}

/**
 * Cancel an ongoing download
 */
export async function cancelDownload(taskId: string): Promise<void> {
  await invoke('cancel_download', { taskId });
}