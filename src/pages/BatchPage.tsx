import { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { parseVideo, startDownload } from '../services/ytdlp';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';

const c = { bg: '#fff', border: '#E5E5EA', text: '#1D1D1F', text2: '#86868B', text3: '#AEAEB2', input: '#F5F5F7', inputBorder: '#D2D2D7', accent: '#0071E3' };

export function BatchPage() {
  const settings = useAppStore((s) => s.settings);
  const postProcessing = useAppStore((s) => s.postProcessing);
  const urls = useAppStore((s) => s.batchUrls);
  const setUrls = useAppStore((s) => s.setBatchUrls);
  const batchItems = useAppStore((s) => s.batchItems);
  const setBatchItems = useAppStore((s) => s.setBatchItems);
  const addHistory = useAppStore((s) => s.addHistory);
  const [isParsing, setIsParsing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const statusMap = {
    parsing: { color: c.accent, label: '解析中', badge: 'rgba(0,113,227,0.1)' },
    completed: { color: '#34C759', label: '就绪', badge: 'rgba(52,199,89,0.1)' },
    error: { color: '#FF3B30', label: '失败', badge: 'rgba(255,59,48,0.1)' },
    downloading: { color: c.accent, label: '下载中', badge: 'rgba(0,113,227,0.1)' },
    done: { color: '#34C759', label: '完成', badge: 'rgba(52,199,89,0.1)' },
  };

  const handleParse = async () => {
    if (!urls.trim()) return;
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urlList.length === 0) return;

    setIsParsing(true);
    setBatchItems(urlList.map(url => ({ url, status: 'parsing' })));

    for (let i = 0; i < urlList.length; i++) {
      try {
        const info = await parseVideo(urlList[i], settings.cookieSource);
        setBatchItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'completed', title: info.title } : item
        ));
      } catch (error) {
        setBatchItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: error as string } : item
        ));
      }
    }
    setIsParsing(false);
  };

  const handleBatchDownload = async () => {
    const readyItems = batchItems.filter(i => i.status === 'completed');
    if (readyItems.length === 0) return;

    setIsDownloading(true);

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status !== 'completed') continue;

      setBatchItems(prev => prev.map((it, idx) =>
        idx === i ? { ...it, status: 'downloading' } : it
      ));

      try {
        const info = await parseVideo(item.url, settings.cookieSource);
        let bestFormat = null;
        if (info.formats && info.formats.length > 0) {
          bestFormat = info.formats.find(f => f.format_note === '1080p')
            || info.formats.find(f => f.height && f.height >= 720)
            || info.formats[info.formats.length - 1];

          await startDownload(item.url, bestFormat.format_id, settings.defaultOutputPath, settings.filenameTemplate, postProcessing, {
            proxy: settings.proxy, limitRate: settings.limitRate, retries: settings.retries,
            concurrentFragments: settings.concurrentFragments, cookieSource: settings.cookieSource,
          });
        }

        setBatchItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'done' } : it
        ));

        // 添加到历史记录
        addHistory({
          id: Date.now().toString() + '-' + i,
          title: info.title || item.url,
          url: item.url,
          format: bestFormat ? (bestFormat.format_note || bestFormat.resolution || bestFormat.format_id) : '-',
          size: bestFormat ? (bestFormat.filesize ? `${(bestFormat.filesize / 1024 / 1024).toFixed(1)} MB` : (bestFormat.filesize_approx ? `~${(bestFormat.filesize_approx / 1024 / 1024).toFixed(1)} MB` : '-')) : '-',
          date: new Date().toISOString().split('T')[0],
        });
      } catch (error) {
        setBatchItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'error', error: error as string } : it
        ));
      }
    }
    setIsDownloading(false);
  };

  const handleImportFile = async () => {
    try {
      const file = await open({ filters: [{ name: '文本文件', extensions: ['txt'] }], title: '导入链接文件' });
      if (file) {
        const content = await readTextFile(file as string);
        setUrls(urls.trim() ? urls.trim() + '\n' + content.trim() : content.trim());
      }
    } catch (error) {
      console.error('导入文件失败:', error);
    }
  };

  const handleClear = () => {
    setUrls('');
    setBatchItems([]);
  };

  const removeItem = (index: number) => {
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const completedCount = batchItems.filter(i => i.status === 'completed' || i.status === 'done').length;
  const errorCount = batchItems.filter(i => i.status === 'error').length;
  const readyCount = batchItems.filter(i => i.status === 'completed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>批量下载</h1>
        <p style={{ fontSize: '13px', color: c.text2, marginTop: '4px' }}>同时下载多个视频，支持播放列表</p>
      </div>

      {/* 输入链接 */}
      <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text }}>输入链接</h3>
          {batchItems.length > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: 'rgba(0,113,227,0.1)', color: c.accent }}>
              {batchItems.length} 个链接{completedCount > 0 ? ` · ${completedCount} 成功` : ''}{errorCount > 0 ? ` · ${errorCount} 失败` : ''}
            </span>
          )}
        </div>
        <textarea value={urls} onChange={(e) => setUrls(e.target.value)} placeholder="每行输入一个视频链接..."
          style={{ width: '100%', minHeight: '120px', padding: '10px 12px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', color: c.text, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <p style={{ fontSize: '11px', color: c.text3 }}>支持 YouTube、Bilibili、Twitter 等 1000+ 网站</p>
          <button onClick={handleParse} disabled={isParsing || !urls.trim()}
            style={{ height: '36px', padding: '0 20px', background: c.accent, color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: isParsing || !urls.trim() ? 'not-allowed' : 'pointer', opacity: isParsing || !urls.trim() ? 0.5 : 1 }}>
            {isParsing ? '解析中...' : '解析链接'}
          </button>
        </div>

        {batchItems.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {batchItems.map((item, i) => {
              const s = statusMap[item.status as keyof typeof statusMap] || statusMap.parsing;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: c.input, borderRadius: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: c.text2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.url}</div>
                    {item.title && <div style={{ fontSize: '11px', color: c.text3, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>}
                    {item.error && <div style={{ fontSize: '11px', color: '#FF3B30', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.error}</div>}
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: s.badge, color: s.color, flexShrink: 0 }}>{s.label}</span>
                  {item.status !== 'parsing' && item.status !== 'downloading' && (
                    <button onClick={() => removeItem(i)}
                      style={{ width: '16px', height: '16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text3, flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 批量设置 */}
      <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text }}>批量设置</h3>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: c.text, marginBottom: '6px' }}>统一格式</label>
              <select style={{ width: '100%', height: '36px', padding: '0 12px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', color: c.text, outline: 'none', cursor: 'pointer' }}>
                <option>最佳质量</option><option>1080p MP4</option><option>720p MP4</option><option>480p MP4</option><option>仅音频 MP3</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: c.text, marginBottom: '6px' }}>并发下载数</label>
              <select style={{ width: '100%', height: '36px', padding: '0 12px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', color: c.text, outline: 'none', cursor: 'pointer' }}>
                <option>1 个</option><option>3 个</option><option>5 个</option><option>10 个</option>
              </select>
            </div>
          </div>
          {[
            { label: '跳过已下载', desc: '自动跳过历史记录中已存在的视频', on: true },
            { label: '出错时继续', desc: '某个视频下载失败时继续处理下一个', on: true },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: i === 0 ? '0' : '14px', borderTop: i === 0 ? 'none' : `1px solid #F2F2F7` }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: c.text2, marginTop: '2px' }}>{item.desc}</div>
              </div>
              <button style={{ width: '44px', minWidth: '44px', maxWidth: '44px', height: '26px', minHeight: '26px', maxHeight: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: '0', appearance: 'none' as any, background: item.on ? c.accent : '#D1D1D6' }}>
                <span style={{ position: 'absolute', top: '2px', left: '2px', width: '22px', height: '22px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transform: item.on ? 'translateX(18px)' : 'translateX(0)' }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={handleBatchDownload} disabled={isDownloading || readyCount === 0}
          style={{ flex: 1, height: '44px', background: c.accent, color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: 600, border: 'none', cursor: isDownloading || readyCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,113,227,0.3)', opacity: isDownloading || readyCount === 0 ? 0.5 : 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          {isDownloading ? '下载中...' : '开始批量下载'}
        </button>
        <button onClick={handleImportFile}
          style={{ height: '44px', padding: '0 20px', background: c.input, color: c.text, border: `1px solid ${c.inputBorder}`, borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>导入文件</button>
        <button onClick={handleClear}
          style={{ height: '44px', padding: '0 16px', background: 'transparent', color: c.accent, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>清空</button>
      </div>
    </div>
  );
}