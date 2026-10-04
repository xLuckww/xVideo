import { useAppStore, isTaskActive } from '../stores/useAppStore';
import { cancelDownload, openFile, openFolder } from '../services/ytdlp';
import { formatBytes, formatEta, formatSpeed } from '../lib/formats';
import { c, cardStyle, cardTitleStyle, linkButtonStyle, Badge, ProgressLine } from './common';
import { ErrorInline } from './ErrorNotice';
import type { DownloadTask } from '../types';

const statusBadge: Record<DownloadTask['status'], { label: string; color: string; background: string }> = {
  starting: { label: '准备中', color: c.accent, background: c.accentBg },
  downloading: { label: '下载中', color: c.accent, background: c.accentBg },
  processing: { label: '处理中', color: c.warning, background: c.warningBg },
  completed: { label: '完成', color: c.success, background: c.successBg },
  error: { label: '失败', color: c.error, background: c.errorBg },
  cancelled: { label: '已取消', color: c.text2, background: c.divider },
};

function progressText(task: DownloadTask): string {
  const p = task.progress;
  if (task.status === 'processing') return '合并 / 转码中…';
  if (!p) return task.status === 'starting' ? '正在连接…' : '';
  const parts: string[] = [];
  if (p.percent != null) parts.push(`${p.percent.toFixed(1)}%`);
  if (p.totalBytes) parts.push(`${formatBytes(p.downloadedBytes)} / ${formatBytes(p.totalBytes)}`);
  else if (p.downloadedBytes) parts.push(formatBytes(p.downloadedBytes));
  const speed = formatSpeed(p.speed);
  if (speed) parts.push(speed);
  const eta = formatEta(p.eta);
  if (eta) parts.push(`剩余 ${eta}`);
  return parts.join(' · ');
}

function TaskRow({ task, last }: { task: DownloadTask; last: boolean }) {
  const removeTask = useAppStore((s) => s.removeTask);
  const badge = statusBadge[task.status];
  const active = isTaskActive(task);
  const file = task.files[0];

  return (
    <div style={{ padding: '12px 20px', borderBottom: last ? 'none' : `1px solid ${c.divider}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
          <div style={{ fontSize: '11px', color: c.text3, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[task.formatLabel, active ? progressText(task) : file?.split(/[\\/]/).pop()].filter(Boolean).join(' · ')}
          </div>
          {task.error && <ErrorInline error={task.error} fallbackTitle="下载失败" />}
        </div>
        <Badge color={badge.color} background={badge.background}>{badge.label}</Badge>
        {active ? (
          <button onClick={() => cancelDownload(task.id).catch(() => {})} style={{ ...linkButtonStyle, color: c.error }}>取消</button>
        ) : (
          <>
            {task.status === 'completed' && file && task.kind !== 'subtitle' && (
              <button onClick={() => openFile(file)} style={linkButtonStyle}>打开</button>
            )}
            {task.status === 'completed' && (
              <button onClick={() => openFolder(file ?? task.outputDir)} style={linkButtonStyle}>所在位置</button>
            )}
            <button onClick={() => removeTask(task.id)} title="移除" style={{ ...linkButtonStyle, color: c.text3 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </>
        )}
      </div>
      {active && <div style={{ marginTop: '8px' }}><ProgressLine percent={task.status === 'processing' ? 100 : task.progress?.percent ?? null} color={task.status === 'processing' ? c.warning : c.accent} /></div>}
    </div>
  );
}

export function TaskList({ title = '下载任务', filter }: { title?: string; filter?: (task: DownloadTask) => boolean }) {
  const allTasks = useAppStore((s) => s.tasks);
  const clearFinishedTasks = useAppStore((s) => s.clearFinishedTasks);
  const tasks = filter ? allTasks.filter(filter) : allTasks;
  if (tasks.length === 0) return null;

  const activeCount = tasks.filter(isTaskActive).length;
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${c.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={cardTitleStyle}>{title}</h3>
          {activeCount > 0 && <Badge color={c.accent} background={c.accentBg}>{activeCount} 个进行中</Badge>}
        </div>
        {activeCount < tasks.length && <button onClick={clearFinishedTasks} style={linkButtonStyle}>清除已结束</button>}
      </div>
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {tasks.map((task, i) => <TaskRow key={task.id} task={task} last={i === tasks.length - 1} />)}
      </div>
    </div>
  );
}
