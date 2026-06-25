import { useAppStore } from '../stores/useAppStore';
import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('');

  const handleSave = () => {
    localStorage.setItem('ytdlp-settings', JSON.stringify(settings));
    setToastText('设置已保存');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleReset = () => {
    const defaults = {
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
      cookieSource: 'none',
    };
    setSettings(defaults);
    setToastText('已恢复默认设置');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.01em' }}>设置</h1>
        <p style={{ fontSize: '13px', color: '#86868B', marginTop: '4px' }}>配置下载参数和应用偏好</p>
      </div>

      {/* 常规设置 */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E5EA', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>常规设置</h3>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>默认保存路径</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={settings.defaultOutputPath} onChange={(e) => setSettings({ defaultOutputPath: e.target.value })}
                style={{ flex: 1, height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none' }} />
              <button onClick={async () => {
                const path = await open({ directory: true, title: '选择保存路径' });
                if (path) setSettings({ defaultOutputPath: path as string });
              }} style={{ height: '36px', padding: '0 16px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', cursor: 'pointer' }}>浏览</button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>文件名模板</label>
            <input type="text" value={settings.filenameTemplate} onChange={(e) => setSettings({ filenameTemplate: e.target.value })}
              style={{ width: '100%', height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none' }} />
            <p style={{ marginTop: '6px', fontSize: '11px', color: '#AEAEB2' }}>可用变量: %(title)s, %(id)s, %(uploader)s, %(upload_date)s</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>默认视频格式</label>
              <select value={settings.defaultVideoFormat} onChange={(e) => setSettings({ defaultVideoFormat: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none', cursor: 'pointer' }}>
                <option value="best">最佳质量</option><option value="1080p">1080p</option><option value="720p">720p</option><option value="480p">480p</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>默认音频格式</label>
              <select value={settings.defaultAudioFormat} onChange={(e) => setSettings({ defaultAudioFormat: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none', cursor: 'pointer' }}>
                <option value="mp3">MP3</option><option value="aac">AAC</option><option value="opus">OPUS</option><option value="flac">FLAC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 网络设置 */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E5EA', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>网络设置</h3>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>代理服务器</label>
            <input type="text" value={settings.proxy} onChange={(e) => setSettings({ proxy: e.target.value })} placeholder="socks5://127.0.0.1:1080"
              style={{ width: '100%', height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none' }} />
            <p style={{ marginTop: '6px', fontSize: '11px', color: '#AEAEB2' }}>支持 HTTP/HTTPS/SOCKS5 代理</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>下载限速</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={settings.limitRate} onChange={(e) => setSettings({ limitRate: e.target.value })} placeholder="不限制"
                  style={{ flex: 1, height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none' }} />
                <select style={{ height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
                  <option>MB/s</option><option>KB/s</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>重试次数</label>
              <input type="number" value={settings.retries} onChange={(e) => setSettings({ retries: parseInt(e.target.value) || 10 })}
                style={{ width: '100%', height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1D1D1F', marginBottom: '6px' }}>并发分片数</label>
            <select value={String(settings.concurrentFragments)} onChange={(e) => setSettings({ concurrentFragments: parseInt(e.target.value) })}
              style={{ width: '100%', height: '36px', padding: '0 12px', background: '#F5F5F7', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '13px', color: '#1D1D1F', outline: 'none', cursor: 'pointer' }}>
              <option value="1">1</option><option value="3">3</option><option value="5">5</option><option value="10">10</option>
            </select>
            <p style={{ marginTop: '6px', fontSize: '11px', color: '#AEAEB2' }}>同时下载的视频分片数量，提高速度但增加带宽占用</p>
          </div>
        </div>
      </div>

      {/* 高级设置 */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E5EA', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>高级设置</h3>
        <div style={{ marginTop: '16px' }}>
          {[
            { key: 'autoUpdate' as const, label: '自动更新 xVideo', desc: '启动时检查并更新到最新版本' },
            { key: 'keepArchive' as const, label: '保留下载记录', desc: '记录已下载的视频，避免重复下载' },
            { key: 'shutdownAfterDownload' as const, label: '下载完成后关机', desc: '所有下载任务完成后自动关闭电脑' },
            { key: 'useSystemProxy' as const, label: '使用系统代理', desc: '自动使用系统配置的代理服务器' },
          ].map((item, i) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < 3 ? '1px solid #F2F2F7' : 'none' }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1D1D1F' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: '#86868B', marginTop: '2px' }}>{item.desc}</div>
              </div>
              <button onClick={() => setSettings({ [item.key]: !settings[item.key] })}
                style={{ width: '44px', minWidth: '44px', maxWidth: '44px', height: '26px', minHeight: '26px', maxHeight: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0, appearance: 'none',
                  background: settings[item.key] ? '#0071E3' : '#D1D1D6', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: '2px', left: '2px', width: '22px', height: '22px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s',
                  transform: settings[item.key] ? 'translateX(18px)' : 'translateX(0)' }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={handleSave} style={{ height: '40px', padding: '0 20px', background: '#0071E3', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,113,227,0.3)' }}>保存设置</button>
        <button onClick={handleReset} style={{ height: '40px', padding: '0 20px', background: '#F5F5F7', color: '#1D1D1F', border: '1px solid #D2D2D7', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>恢复默认</button>
      </div>      {/* Toast */}
      {showToast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', background: '#1D1D1F', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          {toastText}
        </div>
      )}
    </div>
  );
}