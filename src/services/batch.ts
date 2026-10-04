import { useAppStore } from '../stores/useAppStore';
import { networkOptions, parseVideo } from './ytdlp';
import { cancelTask, startTask } from './downloads';
import { presetSelector, PRESET_LABELS } from '../lib/formats';
import { videoKey } from '../lib/video';
import type { BatchItem } from '../types';

const PARSE_CONCURRENCY = 3;
let itemCounter = 0;
let stopRequested = false;

const newItem = (url: string, extra: Partial<BatchItem> = {}): BatchItem =>
  ({ id: `b${Date.now()}-${++itemCounter}`, url, status: 'parsing', ...extra });

async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

/** Parse every URL; playlists are expanded into their entries */
export async function parseBatch(urls: string[]) {
  const store = useAppStore.getState();
  const unique = [...new Set(urls)];
  const items = unique.map((url) => newItem(url));
  store.setBatchItems(items);
  const network = networkOptions(store.settings);

  await runPool(items, PARSE_CONCURRENCY, async (item) => {
    try {
      const info = await parseVideo(item.url, network, true);
      if (info._type === 'playlist') {
        const entries = (info.entries ?? [])
          .map((e) => ({ url: e.url || e.webpage_url, title: e.title, key: videoKey(e.ie_key, e.id) }))
          .filter((e) => !!e.url);
        const expanded = entries.length
          ? entries.map((e) => newItem(e.url!, { status: 'ready', title: e.title, videoKey: e.key }))
          : [{ ...item, status: 'error' as const, error: '播放列表为空' }];
        useAppStore.getState().setBatchItems((prev) => prev.flatMap((i) => (i.id === item.id ? expanded : [i])));
      } else {
        useAppStore.getState().updateBatchItem(item.id, {
          status: 'ready', title: info.title, videoKey: videoKey(info.extractor_key, info.id),
        });
      }
    } catch (error) {
      useAppStore.getState().updateBatchItem(item.id, { status: 'error', error: String(error) });
    }
  });
}

export async function runBatch() {
  const store = useAppStore.getState();
  if (store.batchRunning) return;
  const { preset, concurrency, skipDownloaded, continueOnError } = store.batchOptions;
  // 同一视频可能以不同链接形式出现，按链接或视频标识任一匹配即视为已下载
  const media = store.history.filter((h) => h.kind !== 'subtitle');
  const downloaded = new Set([...media.map((h) => h.url), ...media.flatMap((h) => (h.videoKey ? [h.videoKey] : []))]);
  const isDownloaded = (i: BatchItem) => downloaded.has(i.url) || (!!i.videoKey && downloaded.has(i.videoKey));

  stopRequested = false;
  let failed = false;
  store.setBatchRunning(true);
  store.setBatchItems((prev) => prev.map((i) => {
    if (i.status !== 'ready' && i.status !== 'cancelled') return i;
    return skipDownloaded && isDownloaded(i)
      ? { ...i, status: 'skipped' }
      : { ...i, status: 'queued', error: undefined };
  }));

  const worker = async () => {
    while (!stopRequested && !(failed && !continueOnError)) {
      const item = useAppStore.getState().batchItems.find((i) => i.status === 'queued');
      if (!item) return;
      // Claim synchronously so other workers skip this item
      useAppStore.getState().updateBatchItem(item.id, { status: 'downloading' });

      const { taskId, done } = startTask({
        url: item.url,
        title: item.title || item.url,
        videoKey: item.videoKey,
        kind: preset === 'audio' ? 'audio' : 'video',
        formatLabel: preset === 'audio' ? `仅音频 → ${store.settings.defaultAudioFormat.toUpperCase()}` : PRESET_LABELS[preset],
        options: preset === 'audio'
          ? { format: presetSelector(preset), extractAudio: store.settings.defaultAudioFormat }
          : { format: presetSelector(preset), mergeFormat: 'mp4' },
      });
      useAppStore.getState().updateBatchItem(item.id, { taskId });

      const result = await done;
      if (result.status === 'error') failed = true;
      useAppStore.getState().updateBatchItem(item.id, {
        status: result.status === 'completed' ? 'done' : result.status,
        error: result.error ?? undefined,
      });
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  // Anything not started (stopped, or halted after an error) goes back to ready
  useAppStore.getState().setBatchItems((prev) => prev.map((i) => (i.status === 'queued' ? { ...i, status: 'ready' } : i)));
  useAppStore.getState().setBatchRunning(false);
}

export async function stopBatch() {
  stopRequested = true;
  const { batchItems } = useAppStore.getState();
  await Promise.all(batchItems
    .filter((i) => i.status === 'downloading' && i.taskId)
    .map((i) => cancelTask(i.taskId!)));
}
