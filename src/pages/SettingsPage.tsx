import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore, isTaskActive } from '../stores/useAppStore';
import { checkEngineUpdate, getEnvironment, resetEngine, updateEngine } from '../services/ytdlp';
import { formatBytes } from '../lib/formats';
import { ErrorNotice } from '../components/ErrorNotice';
import {
  c, cardStyle, cardTitleStyle, hintStyle, inputStyle, labelStyle, selectStyle, secondaryButtonStyle,
  primaryButtonStyle, PageHeader, Notice, ProgressLine, SwitchRow, Spinner, useToast,
} from '../components/common';
import type { AppSettings, EngineUpdateInfo, EngineUpdateProgress } from '../types';

// limitRate is stored in yt-dlp syntax, e.g. "5M" / "500K"; a bare number means MB/s
function splitRate(rate: string): { value: string; unit: 'M' | 'K' } {
  const m = rate.trim().match(/^([\d.]*)([KkMm]?)$/);
  if (!m) return { value: rate, unit: 'M' };
  return { value: m[1], unit: m[2].toUpperCase() === 'K' ? 'K' : 'M' };
}

const ADVANCED_ITEMS: { key: keyof AppSettings; label: string; desc: string; supported: boolean }[] = [
  { key: 'keepArchive', label: '保留下载记录', desc: '保存下载历史，用于历史查询以及批量下载时跳过已下载的视频', supported: true },
  { key: 'autoUpdate', label: '自动更新 xVideo', desc: '启动时检查并更新到最新版本（暂未支持）', supported: false },
  { key: 'shutdownAfterDownload', label: '下载完成后关机', desc: '所有下载任务完成后自动关闭电脑（暂未支持）', supported: false },
  { key: 'useSystemProxy', label: '使用系统代理', desc: '自动使用系统配置的代理服务器（暂未支持）', supported: false },
];

function EngineCard() {
  const environment = useAppStore((s) => s.environment);
  const setEnvironment = useAppStore((s) => s.setEnvironment);
  const proxy = useAppStore((s) => s.settings.proxy);
  // 正在运行的任务会用到当前引擎目录，更新时会被替换
  const downloading = useAppStore((s) => s.tasks.some(isTaskActive));
  const [busy, setBusy] = useState<'checking' | 'updating' | 'resetting' | null>(null);
  const [update, setUpdate] = useState<EngineUpdateInfo | null>(null);
  const [progress, setProgress] = useState<EngineUpdateProgress | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unlisten = listen<EngineUpdateProgress>('engine-update-progress', ({ payload }) => setProgress(payload));
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(kind); setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage({ tone: 'error', text: String(e) });
    } finally {
      setBusy(null); setProgress(null);
    }
  };

  const refresh = async () => setEnvironment(await getEnvironment());

  const handleCheck = () => run('checking', async () => {
    const info = await checkEngineUpdate(proxy);
    setUpdate(info);
    if (!info.updateAvailable) setMessage({ tone: 'info', text: `已是最新版本（${info.latest}）` });
  });

  const handleUpdate = () => run('updating', async () => {
    const version = await updateEngine(proxy);
    await refresh();
    setUpdate(null);
    setMessage({ tone: 'info', text: `下载引擎已更新到 ${version}` });
  });

  const handleReset = () => run('resetting', async () => {
    await resetEngine();
    await refresh();
    setUpdate(null);
    setMessage({ tone: 'info', text: '已恢复为内置版本' });
  });

  const sourceLabel = environment?.engineSource === 'updated' ? '已在线更新' : '内置';
  const rows = [
    { label: '下载引擎', value: environment?.version ? `yt-dlp ${environment.version}（${sourceLabel}）` : null, title: environment?.ytdlp },
    { label: 'ffmpeg', value: environment?.ffmpeg && environment.ffprobe ? '已内置（含 ffprobe）' : null, title: environment?.ffmpeg },
    { label: 'JS 运行时', value: environment?.jsRuntime ? `${environment.jsRuntime}（已内置）` : null, title: environment?.jsRuntimePath },
  ];
  const percent = progress?.total ? (progress.downloaded / progress.total) * 100 : null;
  const disabled = busy !== null || downloading;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={cardTitleStyle}>下载引擎</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {environment?.engineSource === 'updated' && (
            <button onClick={handleReset} disabled={disabled} style={{ ...secondaryButtonStyle, height: '30px', fontSize: '12px' }}>
              恢复内置版本{environment.bundledVersion ? `（${environment.bundledVersion}）` : ''}
            </button>
          )}
          {update?.updateAvailable ? (
            <button onClick={handleUpdate} disabled={disabled} style={{ ...primaryButtonStyle(disabled), height: '30px', fontSize: '12px', padding: '0 14px' }}>
              {busy === 'updating' && <Spinner size={12} />}
              更新到 {update.latest}
            </button>
          ) : (
            <button onClick={handleCheck} disabled={disabled || !environment?.version}
              style={{ ...secondaryButtonStyle, height: '30px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {busy === 'checking' && <Spinner size={12} />}
              检查更新
            </button>
          )}
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <span style={{ width: '72px', color: c.text2, flexShrink: 0 }}>{row.label}</span>
            <span title={row.title ?? undefined} style={{ flex: 1, minWidth: 0, color: row.value ? c.text : c.error, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {environment ? row.value ?? '缺失，请重新安装 xVideo' : '检测中…'}
            </span>
          </div>
        ))}
      </div>
      {busy === 'updating' && (
        <div style={{ marginTop: '12px' }}>
          <ProgressLine percent={progress?.stage === 'installing' ? 100 : percent} />
          <p style={hintStyle}>
            {progress?.stage === 'installing'
              ? '正在校验并安装…'
              : progress?.total ? `正在下载 ${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)}` : '正在连接…'}
          </p>
        </div>
      )}
      {downloading && <p style={hintStyle}>有任务正在下载，完成后才能更新引擎</p>}
      <p style={hintStyle}>
        引擎更新来自 yt-dlp 官方 GitHub 发布，下载后会校验 SHA256；如果「网络设置」中配置了代理，也会经由代理下载。
      </p>
      {message && (message.tone === 'error'
        ? <ErrorNotice error={message.text} fallbackTitle="引擎更新失败" />
        : <Notice>{message.text}</Notice>)}
    </div>
  );
}

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const resetSettings = useAppStore((s) => s.resetSettings);
  const { toast, show } = useToast();
  const rate = splitRate(settings.limitRate);

  const setRate = (value: string, unit: 'M' | 'K') => setSettings({ limitRate: value.trim() ? `${value.trim()}${unit}` : '' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader title="设置" subtitle="配置下载参数和应用偏好，修改后自动保存" />

      {/* 常规设置 */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>常规设置</h3>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>默认保存路径</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={settings.defaultOutputPath} onChange={(e) => setSettings({ defaultOutputPath: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={async () => {
                const path = await open({ directory: true, title: '选择保存路径' });
                if (typeof path === 'string') setSettings({ defaultOutputPath: path });
              }} style={secondaryButtonStyle}>浏览</button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>文件名模板</label>
            <input type="text" value={settings.filenameTemplate} onChange={(e) => setSettings({ filenameTemplate: e.target.value })} style={inputStyle} />
            <p style={hintStyle}>可用变量: %(title)s, %(id)s, %(uploader)s, %(upload_date)s, %(height)sp；用 / 可建立子目录</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>默认视频格式</label>
              <select value={settings.defaultVideoFormat} onChange={(e) => setSettings({ defaultVideoFormat: e.target.value })} style={selectStyle}>
                <option value="best">最佳质量</option><option value="1080p">1080p</option><option value="720p">720p</option><option value="480p">480p</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>默认音频格式</label>
              <select value={settings.defaultAudioFormat} onChange={(e) => setSettings({ defaultAudioFormat: e.target.value })} style={selectStyle}>
                <option value="mp3">MP3</option><option value="m4a">M4A</option><option value="aac">AAC</option><option value="opus">OPUS</option><option value="flac">FLAC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 网络设置 */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>网络设置</h3>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>代理服务器</label>
            <input type="text" value={settings.proxy} onChange={(e) => setSettings({ proxy: e.target.value })} placeholder="socks5://127.0.0.1:1080" style={inputStyle} />
            <p style={hintStyle}>支持 HTTP/HTTPS/SOCKS5 代理，解析和下载都会使用</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>下载限速</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" inputMode="decimal" value={rate.value} onChange={(e) => setRate(e.target.value, rate.unit)} placeholder="不限制" style={{ ...inputStyle, flex: 1 }} />
                <select value={rate.unit} onChange={(e) => setRate(rate.value, e.target.value as 'M' | 'K')} style={{ ...selectStyle, width: '84px' }}>
                  <option value="M">MB/s</option><option value="K">KB/s</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>重试次数</label>
              <input type="number" min={0} value={settings.retries} onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setSettings({ retries: Number.isNaN(n) ? 10 : Math.max(0, n) });
              }} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>并发分片数</label>
            <select value={String(settings.concurrentFragments)} onChange={(e) => setSettings({ concurrentFragments: parseInt(e.target.value, 10) })} style={selectStyle}>
              <option value="1">1</option><option value="3">3</option><option value="5">5</option><option value="10">10</option>
            </select>
            <p style={hintStyle}>同时下载的视频分片数量（对 HLS/DASH 有效），提高速度但增加带宽占用</p>
          </div>
        </div>
      </div>

      <EngineCard />

      {/* 高级设置 */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>高级设置</h3>
        <div style={{ marginTop: '6px' }}>
          {ADVANCED_ITEMS.map((item, i) => (
            <SwitchRow key={item.key} label={item.label} desc={item.desc} last={i === ADVANCED_ITEMS.length - 1} disabled={!item.supported}
              checked={!!settings[item.key]} onChange={(on) => setSettings({ [item.key]: on })} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => { resetSettings(); show('已恢复默认设置'); }} style={{ ...secondaryButtonStyle, height: '40px', padding: '0 20px', fontSize: '14px' }}>恢复默认</button>
      </div>
      {toast}
    </div>
  );
}
