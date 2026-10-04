import { invoke } from '@tauri-apps/api/core';
import type { AppSettings, DownloadRequest, EngineUpdateInfo, Environment, NetworkOptions, VideoInfo } from '../types';

/** Build network options from settings; a bare number for the rate limit means MB/s */
export function networkOptions(settings: AppSettings): NetworkOptions {
  const rate = settings.limitRate.trim().match(/^(\d*\.?\d+)\s*([KMG]?)/i);
  return {
    proxy: settings.proxy,
    cookieEnabled: settings.cookieEnabled,
    cookieSource: settings.cookieSource,
    cookieFile: settings.cookieFile,
    limitRate: rate ? `${rate[1]}${(rate[2] || 'M').toUpperCase()}` : '',
    retries: settings.retries,
    concurrentFragments: settings.concurrentFragments,
  };
}

/**
 * Parse video information from URL.
 * With allowPlaylist, playlist URLs return `_type: 'playlist'` with flat `entries`.
 */
export async function parseVideo(url: string, network: NetworkOptions, allowPlaylist = false): Promise<VideoInfo> {
  return await invoke<VideoInfo>('parse_video', { url, network, allowPlaylist });
}

/** Start a download; progress arrives via `download-*` events keyed by taskId */
export async function startDownload(request: DownloadRequest): Promise<void> {
  await invoke('start_download', { request });
}

export async function cancelDownload(taskId: string): Promise<void> {
  await invoke('cancel_download', { taskId });
}

export async function getEnvironment(): Promise<Environment> {
  return await invoke<Environment>('get_environment');
}

/** Check GitHub for a newer official yt-dlp release */
export async function checkEngineUpdate(proxy?: string): Promise<EngineUpdateInfo> {
  return await invoke<EngineUpdateInfo>('check_engine_update', { proxy: proxy || null });
}

/** Download, verify and enable the latest engine; progress via `engine-update-progress` */
export async function updateEngine(proxy?: string): Promise<string> {
  return await invoke<string>('update_engine', { proxy: proxy || null });
}

/** Remove downloaded engines and go back to the bundled one */
export async function resetEngine(): Promise<void> {
  await invoke('reset_engine');
}

export async function openFile(path: string): Promise<void> {
  await invoke('open_file', { path });
}

/** Reveal a file in the file manager, or open a directory */
export async function openFolder(path: string): Promise<void> {
  await invoke('open_folder', { path });
}

/** macOS: open the Full Disk Access pane (needed to read browser cookies) */
export async function openPrivacySettings(): Promise<void> {
  await invoke('open_privacy_settings');
}
