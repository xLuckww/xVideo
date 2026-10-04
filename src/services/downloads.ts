import { listen } from '@tauri-apps/api/event';
import { useAppStore, DEFAULT_OUTPUT_PATH, DEFAULT_FILENAME_TEMPLATE } from '../stores/useAppStore';
import { cancelDownload, networkOptions, startDownload } from './ytdlp';
import { formatBytes } from '../lib/formats';
import type { DownloadRequest, PostProcessingOptions, TaskKind, TaskProgress, TaskResult } from '../types';

interface RawProgress {
  status?: string;
  downloaded_bytes?: number;
  total_bytes?: number;
  total_bytes_estimate?: number;
  speed?: number;
  eta?: number;
  fragment_index?: number;
  fragment_count?: number;
}

export interface TaskSpec {
  url: string;
  title: string;
  kind: TaskKind;
  formatLabel: string;
  sizeLabel?: string;
  tag?: string;
  videoKey?: string;
  options: Pick<DownloadRequest, 'format' | 'extractAudio' | 'mergeFormat' | 'skipDownload' | 'subtitles'>;
  postProcessing?: PostProcessingOptions;
}

const waiters = new Map<string, (result: TaskResult) => void>();
// Cancels requested before the backend registered the process (still 'starting')
const pendingCancels = new Set<string>();
let taskCounter = 0;

function toProgress(raw: RawProgress): TaskProgress {
  const total = raw.total_bytes ?? raw.total_bytes_estimate ?? null;
  const downloaded = raw.downloaded_bytes ?? null;
  let percent: number | null = null;
  if (raw.status === 'finished') percent = 100;
  else if (total && downloaded != null) percent = (downloaded / total) * 100;
  else if (raw.fragment_count && raw.fragment_index != null) percent = (raw.fragment_index / raw.fragment_count) * 100;
  return {
    percent: percent == null ? null : Math.min(100, percent),
    downloadedBytes: downloaded,
    totalBytes: total,
    speed: raw.speed ?? null,
    eta: raw.eta ?? null,
  };
}

function finishTask(result: TaskResult) {
  const state = useAppStore.getState();
  const task = state.tasks.find((t) => t.id === result.taskId);
  state.updateTask(result.taskId, {
    status: result.status,
    error: result.error,
    files: result.files,
    finishedAt: Date.now(),
  });

  if (task && result.status === 'completed') {
    state.addHistory({
      id: task.id,
      title: task.title,
      url: task.url,
      videoKey: task.videoKey,
      kind: task.kind,
      format: task.formatLabel,
      size: result.totalBytes ? formatBytes(result.totalBytes) : task.sizeLabel,
      date: new Date().toISOString().split('T')[0],
      files: result.files,
      outputDir: task.outputDir,
    });
  }

  waiters.get(result.taskId)?.(result);
  waiters.delete(result.taskId);
}

/** Subscribe to backend download events once for the whole app; returns the unsubscribe function */
export async function initDownloadEvents(): Promise<() => void> {
  const unlisteners = await Promise.all([
    listen<{ taskId: string; progress: RawProgress }>('download-progress', ({ payload }) => {
      useAppStore.getState().updateTask(payload.taskId, {
        status: 'downloading',
        progress: toProgress(payload.progress),
      });
    }),
    listen<{ taskId: string; stage: string }>('download-stage', ({ payload }) => {
      // Each stream (e.g. video then audio) restarts from 0%
      useAppStore.getState().updateTask(payload.taskId, payload.stage === 'processing'
        ? { status: 'processing' }
        : { status: 'downloading', progress: null });
    }),
    listen<TaskResult>('download-finished', ({ payload }) => finishTask(payload)),
  ]);
  return () => unlisteners.forEach((fn) => fn());
}

/** Create a task and start it; `done` resolves when yt-dlp exits */
export function startTask(spec: TaskSpec): { taskId: string; done: Promise<TaskResult> } {
  const state = useAppStore.getState();
  const { settings } = state;
  const taskId = `${Date.now()}-${++taskCounter}`;
  const outputDir = settings.defaultOutputPath.trim() || DEFAULT_OUTPUT_PATH;

  state.addTask({
    id: taskId,
    url: spec.url,
    title: spec.title,
    kind: spec.kind,
    formatLabel: spec.formatLabel,
    sizeLabel: spec.sizeLabel ?? '-',
    tag: spec.tag,
    videoKey: spec.videoKey,
    status: 'starting',
    progress: null,
    outputDir,
    files: [],
    error: null,
    createdAt: Date.now(),
    finishedAt: null,
  });

  const done = new Promise<TaskResult>((resolve) => waiters.set(taskId, resolve));

  startDownload({
    taskId,
    url: spec.url,
    ...spec.options,
    outputDir,
    filenameTemplate: settings.filenameTemplate.trim() || DEFAULT_FILENAME_TEMPLATE,
    postProcessing: spec.postProcessing ?? state.postProcessing,
    network: networkOptions(settings),
  }).then(() => {
    if (pendingCancels.delete(taskId)) cancelDownload(taskId).catch(() => {});
  }).catch((error) => {
    finishTask({ taskId, status: 'error', error: String(error), files: [], totalBytes: null });
  });

  return { taskId, done };
}

/** Cancel a task; if its process is not registered yet, cancel as soon as it is */
export async function cancelTask(taskId: string): Promise<void> {
  const task = useAppStore.getState().tasks.find((t) => t.id === taskId);
  if (task?.status === 'starting') {
    pendingCancels.add(taskId);
  }
  try {
    await cancelDownload(taskId);
    pendingCancels.delete(taskId);
  } catch {
    // Not running yet (handled by pendingCancels) or already finished
  }
}
