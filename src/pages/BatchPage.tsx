import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useAppStore } from '../stores/useAppStore';
import { parseBatch, runBatch, stopBatch } from '../services/batch';
import { PRESET_LABELS } from '../lib/formats';
import { extractUrl } from '../lib/url';
import { ErrorInline, ErrorNotice, isCookieAccessError } from '../components/ErrorNotice';
import {
  c, cardStyle, cardTitleStyle, inputStyle, labelStyle, selectStyle, secondaryButtonStyle,
  primaryButtonStyle, PageHeader, Notice, Badge, SwitchRow, ProgressLine, Spinner,
} from '../components/common';
import type { BatchItemStatus, FormatPreset } from '../types';

const statusMap: Record<BatchItemStatus, { color: string; label: string; badge: string }> = {
  parsing: { color: c.accent, label: '解析中', badge: c.accentBg },
  ready: { color: c.success, label: '就绪', badge: c.successBg },
  queued: { color: c.text2, label: '排队中', badge: c.divider },
  downloading: { color: c.accent, label: '下载中', badge: c.accentBg },
  done: { color: c.success, label: '完成', badge: c.successBg },
  error: { color: c.error, label: '失败', badge: c.errorBg },
  skipped: { color: c.text2, label: '已跳过', badge: c.divider },
  cancelled: { color: c.text2, label: '已取消', badge: c.divider },
};

export function BatchPage() {
  const settings = useAppStore((s) => s.settings);
  const urls = useAppStore((s) => s.batchUrls);
  const setUrls = useAppStore((s) => s.setBatchUrls);
  const batchItems = useAppStore((s) => s.batchItems);
  const setBatchItems = useAppStore((s) => s.setBatchItems);
  const batchRunning = useAppStore((s) => s.batchRunning);
  const options = useAppStore((s) => s.batchOptions);
  const setOptions = useAppStore((s) => s.setBatchOptions);
  const tasks = useAppStore((s) => s.tasks);
  const [isParsing, setIsParsing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleParse = async () => {
    const urlList = urls.split('\n').map(extractUrl).filter((u) => u.length > 0);
    if (urlList.length === 0) return;
    setIsParsing(true);
    try {
      await parseBatch(urlList);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportFile = async () => {
    setImportError(null);
    try {
      const file = await open({ filters: [{ name: '文本文件', extensions: ['txt'] }], title: '导入链接文件' });
      if (typeof file === 'string') {
        const content = await readTextFile(file);
        setUrls(urls.trim() ? `${urls.trim()}\n${content.trim()}` : content.trim());
      }
    } catch (error) {
      setImportError(String(error));
    }
  };

  const handleClear = () => {
    setUrls('');
    setBatchItems([]);
  };

  const count = (...statuses: BatchItemStatus[]) => batchItems.filter((i) => statuses.includes(i.status)).length;
  const readyCount = count('ready', 'cancelled');
  const doneCount = count('done');
  const errorCount = count('error');
  const busy = isParsing || batchRunning;
  // 读取 Cookie 的权限问题会让所有链接失败，单独在顶部提示一次
  const cookieAccessError = batchItems.find((i) => i.error && isCookieAccessError(i.error))?.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader title="批量下载" subtitle="同时下载多个视频，播放列表链接会自动展开">
        <Notice>💡 如遇无法解析的情况，请在「下载」页启用 Cookie</Notice>
        {importError && <ErrorNotice error={importError} fallbackTitle="导入文件失败" />}
        {cookieAccessError && <ErrorNotice error={cookieAccessError} />}
      </PageHeader>

      {/* 输入链接 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={cardTitleStyle}>输入链接</h3>
          {batchItems.length > 0 && (
            <Badge color={c.accent} background={c.accentBg}>
              {batchItems.length} 个视频{doneCount > 0 ? ` · ${doneCount} 完成` : ''}{errorCount > 0 ? ` · ${errorCount} 失败` : ''}
            </Badge>
          )}
        </div>
        <textarea value={urls} onChange={(e) => setUrls(e.target.value)} placeholder="每行输入一个视频或播放列表链接..." disabled={busy}
          style={{ ...inputStyle, height: 'auto', minHeight: '120px', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <p style={{ fontSize: '11px', color: c.text3 }}>支持 YouTube、Bilibili、Twitter 等 1000+ 网站</p>
          <button onClick={handleParse} disabled={busy || !urls.trim()} style={primaryButtonStyle(busy || !urls.trim())}>
            {isParsing && <Spinner size={14} />}
            {isParsing ? '解析中...' : '解析链接'}
          </button>
        </div>

        {batchItems.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
            {batchItems.map((item) => {
              const s = statusMap[item.status];
              const task = item.taskId ? tasks.find((t) => t.id === item.taskId) : undefined;
              const percent = item.status === 'downloading' ? task?.progress?.percent ?? null : null;
              return (
                <div key={item.id} style={{ padding: '10px 12px', background: c.input, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.url}</div>
                      {item.title && <div style={{ fontSize: '11px', color: c.text3, marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.url}</div>}
                      {item.error && <ErrorInline error={item.error} fallbackTitle={item.taskId ? '下载失败' : '解析失败'} />}
                    </div>
                    {percent != null && <span style={{ fontSize: '11px', color: c.text2, fontVariantNumeric: 'tabular-nums' }}>{percent.toFixed(0)}%</span>}
                    {item.status === 'downloading' && task?.status === 'processing' && <span style={{ fontSize: '11px', color: c.warning }}>处理中</span>}
                    <Badge color={s.color} background={s.badge}>{s.label}</Badge>
                    {item.status !== 'parsing' && item.status !== 'downloading' && !batchRunning && (
                      <button onClick={() => setBatchItems((prev) => prev.filter((i) => i.id !== item.id))} title="移除"
                        style={{ width: '16px', height: '16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text3, flexShrink: 0, padding: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                  </div>
                  {item.status === 'downloading' && <div style={{ marginTop: '8px' }}><ProgressLine percent={task?.status === 'processing' ? 100 : percent} /></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 批量设置 */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>批量设置</h3>
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>统一格式</label>
            <select value={options.preset} disabled={batchRunning} onChange={(e) => setOptions({ preset: e.target.value as FormatPreset })} style={selectStyle}>
              {(Object.keys(PRESET_LABELS) as FormatPreset[]).map((p) => (
                <option key={p} value={p}>{p === 'audio' ? `仅音频 ${settings.defaultAudioFormat.toUpperCase()}` : PRESET_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>并发下载数</label>
            <select value={options.concurrency} disabled={batchRunning} onChange={(e) => setOptions({ concurrency: parseInt(e.target.value, 10) })} style={selectStyle}>
              {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n} 个</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '6px' }}>
          <SwitchRow label="跳过已下载" desc="自动跳过下载历史中已存在的视频" checked={options.skipDownloaded} disabled={batchRunning}
            onChange={(on) => setOptions({ skipDownloaded: on })} />
          <SwitchRow label="出错时继续" desc="关闭后，任一视频下载失败即停止后续任务" checked={options.continueOnError} disabled={batchRunning} last
            onChange={(on) => setOptions({ continueOnError: on })} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {batchRunning ? (
          <button onClick={stopBatch} style={{ ...primaryButtonStyle(false, 44), flex: 1, background: c.error }}>
            <Spinner />
            停止批量下载
          </button>
        ) : (
          <button onClick={runBatch} disabled={isParsing || readyCount === 0}
            style={{ ...primaryButtonStyle(isParsing || readyCount === 0, 44), flex: 1, boxShadow: '0 2px 8px rgba(0,113,227,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            开始批量下载{readyCount > 0 ? `（${readyCount} 个）` : ''}
          </button>
        )}
        <button onClick={handleImportFile} disabled={busy} style={{ ...secondaryButtonStyle, height: '44px', padding: '0 20px', borderRadius: '10px', fontSize: '14px' }}>导入文件</button>
        <button onClick={handleClear} disabled={busy}
          style={{ height: '44px', padding: '0 16px', background: 'transparent', color: busy ? c.text3 : c.accent, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: busy ? 'not-allowed' : 'pointer' }}>清空</button>
      </div>
    </div>
  );
}
