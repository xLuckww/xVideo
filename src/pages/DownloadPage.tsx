import { useAppStore } from '../stores/useAppStore';
import { parseVideo, startDownload } from '../services/ytdlp';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';
import type { DownloadProgress, Format } from '../types';

export function DownloadPage() {
  const {
    currentUrl, setCurrentUrl, videoInfo, setVideoInfo,
    isParsing, setIsParsing, parseError, setParseError,
    selectedFormat, setSelectedFormat,
    formatTab, setFormatTab,
    postProcessing, setPostProcessing,
    settings, setSettings, setCurrentDownload,
  } = useAppStore();

  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const unlistenProgress = listen<string>('download-progress', (event) => {
      const line = event.payload;
      const match1 = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+~?(\d+\.?\d*\w+)\s+at\s+(\d+\.?\d*\w+\/s)\s+ETA\s+(\S+)/);
      const match2 = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+~?(\d+\.?\d*\w+)(?:\s*,?\s*ETA\s+(\S+))?/);
      const match3 = line.match(/\[download\]\s+100%\s+of\s+(\d+\.?\d*\w+)/);

      if (match1) {
        setDownloadProgress({ status: 'downloading', percent: parseFloat(match1[1]), downloaded: '', total: match1[2], speed: match1[3], eta: match1[4] });
      } else if (match2) {
        setDownloadProgress({ status: 'downloading', percent: parseFloat(match2[1]), downloaded: '', total: match2[2], speed: '-', eta: match2[3] || '-' });
      } else if (match3) {
        setDownloadProgress({ status: 'downloading', percent: 100, downloaded: match3[1], total: match3[1], speed: '-', eta: '00:00' });
      }
    });

    const unlistenComplete = listen<string>('download-complete', () => {
      setShowToast(true);
      // 从 store 获取最新状态（避免闭包问题）
      const state = useAppStore.getState();
      const vi = state.videoInfo;
      const sf = state.selectedFormat;
      const url = state.currentUrl;
      if (vi && sf) {
        state.addHistory({
          id: Date.now().toString(),
          title: vi.title,
          url: url,
          format: sf.format_note || sf.resolution || sf.format_id,
          size: sf.filesize ? `${(sf.filesize / 1024 / 1024).toFixed(1)} MB` : (sf.filesize_approx ? `~${(sf.filesize_approx / 1024 / 1024).toFixed(1)} MB` : '-'),
          date: new Date().toISOString().split('T')[0],
        });
      }
      setTimeout(() => {
        setDownloadProgress(null);
        setIsDownloading(false);
        setShowToast(false);
      }, 3000);
    });

    const unlistenError = listen<string>('download-error', () => {
      setIsDownloading(false);
    });

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  const allFormats = videoInfo?.formats || [];
  const filteredFormats = allFormats.filter((f) => {
    if (formatTab === 'audio') return f.vcodec === 'none' || f.acodec !== 'none';
    if (formatTab === 'video') return f.vcodec !== 'none';
    return true;
  }).sort((a, b) => {
    // Recommended formats (1080p) first, then sort by height descending
    const aRecommended = a.format_note === '1080p' || a.height === 1080;
    const bRecommended = b.format_note === '1080p' || b.height === 1080;
    if (aRecommended && !bRecommended) return -1;
    if (!aRecommended && bRecommended) return 1;
    return (b.height || 0) - (a.height || 0);
  });

  const formatFileSize = (f: Format) => {
    if (f.filesize) return `${(f.filesize / 1024 / 1024).toFixed(1)} MB`;
    if (f.filesize_approx) return `~${(f.filesize_approx / 1024 / 1024).toFixed(1)} MB`;
    return '-';
  };

  const formatDetail = (f: Format) => {
    const p = [];
    if (f.ext) p.push(f.ext.toUpperCase());
    if (f.vcodec && f.vcodec !== 'none') p.push(f.vcodec);
    if (f.acodec && f.acodec !== 'none') p.push(f.acodec);
    return p.join(' · ');
  };

  const handleParse = async () => {
    if (!currentUrl) return;
    setIsParsing(true); setParseError(null); setVideoInfo(null); setSelectedFormat(null);
    try {
      const info = await parseVideo(currentUrl, settings.cookieSource);
      setVideoInfo(info);
      if (info.formats?.length) {
        const best = info.formats.find(f => f.format_note === '1080p') || info.formats.find(f => f.height && f.height >= 720) || info.formats[info.formats.length - 1];
        setSelectedFormat(best);
      }
    } catch (error) { setParseError(error as string); }
    finally { setIsParsing(false); }
  };

  const handleDownload = async () => {
    if (!currentUrl || !selectedFormat) return;
    setIsDownloading(true); setDownloadProgress(null);
    try {
      const outputPath = settings.defaultOutputPath || '~/Downloads/xVideo';
      const taskId = await startDownload(currentUrl, selectedFormat.format_id, outputPath, settings.filenameTemplate, postProcessing, { proxy: settings.proxy, limitRate: settings.limitRate, retries: settings.retries, concurrentFragments: settings.concurrentFragments, cookieSource: settings.cookieSource });
      setCurrentDownload({ id: taskId, url: currentUrl, videoInfo, selectedFormat, status: 'downloading', progress: downloadProgress, outputPath, error: null, createdAt: new Date(), completedAt: null });
    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
    }
    // 注意：不在 finally 里重置 isDownloading，让 download-complete 事件来处理
  };

  const c = { bg: '#fff', border: '#E5E5EA', text: '#1D1D1F', text2: '#86868B', text3: '#AEAEB2', input: '#F5F5F7', inputBorder: '#D2D2D7', accent: '#0071E3' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>下载视频</h1>
        <p style={{ fontSize: '13px', color: c.text2, marginTop: '4px' }}>粘贴视频链接，选择格式，开始下载</p>
        <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(0,113,227,0.06)', borderRadius: '8px', fontSize: '12px', color: c.text2, lineHeight: '1.6' }}>
          💡 如遇无法解析的情况，请前往<strong style={{ color: c.accent }}> 设置 </strong>中配置 Cookie 来源
        </div>
      </div>

      {/* URL Input */}
      <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input type="text" value={currentUrl} onChange={(e) => setCurrentUrl(e.target.value)} placeholder="输入 YouTube、Bilibili 等视频链接..."
            onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            style={{ flex: 1, height: '40px', padding: '0 16px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', color: c.text, outline: 'none' }} />
          <button onClick={handleParse} disabled={isParsing || !currentUrl}
            style={{ height: '40px', padding: '0 20px', background: c.accent, color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: isParsing ? 0.5 : 1 }}>
            {isParsing ? '解析中...' : '解析'}
          </button>
        </div>
        {parseError && <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(255,59,48,0.06)', borderRadius: '8px', fontSize: '12px', color: '#FF3B30' }}>{parseError}</div>}
      </div>

      {/* Video Info */}
      {videoInfo && (
        <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '160px', height: '90px', background: c.input, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
              {videoInfo.thumbnail ? <img src={videoInfo.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{videoInfo.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: c.text2 }}>
                <span>{videoInfo.uploader}</span><span style={{ width: '3px', height: '3px', borderRadius: '50%', background: c.text3 }} /><span>{videoInfo.duration_string}</span><span style={{ width: '3px', height: '3px', borderRadius: '50%', background: c.text3 }} /><span>{videoInfo.view_count?.toLocaleString()} 次观看</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Format Selection */}
      {videoInfo && (
        <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid #F2F2F7` }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text }}>选择格式</h3>
            <div style={{ display: 'inline-flex', gap: '2px', padding: '2px', background: '#F2F2F7', borderRadius: '8px' }}>
              {(['video', 'audio', 'subtitle'] as const).map(tab => (
                <button key={tab} onClick={() => setFormatTab(tab)}
                  style={{ height: '28px', padding: '0 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: formatTab === tab ? '#fff' : 'transparent', color: formatTab === tab ? c.text : c.text3,
                    boxShadow: formatTab === tab ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                  {{ video: '视频', audio: '仅音频', subtitle: '字幕' }[tab]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filteredFormats.length > 0 ? filteredFormats.map((format) => {
              const isSel = selectedFormat?.format_id === format.format_id;
              return (
                <div key={format.format_id} onClick={() => setSelectedFormat(format)}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', cursor: 'pointer', background: isSel ? 'rgba(0,113,227,0.04)' : 'transparent' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${isSel ? c.accent : '#D1D1D6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSel && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.accent }} />}
                  </div>
                  <div style={{ width: '80px', fontSize: '13px', fontWeight: 600, color: c.text }}>{format.format_note || format.resolution || format.format_id}</div>
                  <div style={{ flex: 1, fontSize: '12px', color: c.text2 }}>{formatDetail(format)}</div>
                  {(format.format_id === 'best' || format.format_note === '1080p') && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: 'rgba(52,199,89,0.1)', color: '#34C759' }}>推荐</span>}
                  <div style={{ width: '80px', fontSize: '12px', color: c.text3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatFileSize(format)}</div>
                </div>
              );
            }) : <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: c.text3 }}>无可用格式</div>}
          </div>
        </div>
      )}

      {/* Post Processing */}
      {videoInfo && (
        <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text }}>后处理选项</h3>
          <div style={{ marginTop: '16px' }}>
            {[
              { key: 'embedSubs', label: '嵌入字幕', desc: '将字幕嵌入视频文件中' },
              { key: 'embedThumbnail', label: '嵌入封面', desc: '将缩略图作为封面嵌入' },
              { key: 'embedMetadata', label: '嵌入元数据', desc: '添加标题、作者等信息' },
              { key: 'embedChapters', label: '嵌入章节', desc: '添加视频章节标记' },
              { key: 'sponsorblockRemove', label: '去除广告片段', desc: '通过 SponsorBlock 自动跳过赞助内容' },
            ].map((item, i) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < 4 ? '1px solid #F2F2F7' : 'none' }}>
                <div style={{ flex: 1, marginRight: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: c.text2, marginTop: '2px' }}>{item.desc}</div>
                </div>
                <button onClick={() => setPostProcessing({ [item.key]: !(postProcessing as any)[item.key] })}
                  style={{ width: '44px', minWidth: '44px', maxWidth: '44px', height: '26px', minHeight: '26px', maxHeight: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative', padding: 0, appearance: 'none',
                    background: (postProcessing as any)[item.key] ? c.accent : '#D1D1D6', transition: 'background 0.2s' }}>
                  <span style={{ position: 'absolute', top: '2px', left: '2px', width: '22px', height: '22px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s',
                    transform: (postProcessing as any)[item.key] ? 'translateX(18px)' : 'translateX(0)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {videoInfo && (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleDownload} disabled={!selectedFormat || isDownloading}
            style={{ flex: 1, height: '44px', background: isDownloading ? 'rgba(0,113,227,0.6)' : c.accent, color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: 600, border: 'none', cursor: !selectedFormat || isDownloading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isDownloading ? 'none' : '0 2px 8px rgba(0,113,227,0.3)' }}>
            {isDownloading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                下载中...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                开始下载
              </>
            )}
          </button>
          <button onClick={async () => {
            const path = await open({ directory: true, title: '选择保存路径' });
            if (path) setSettings({ defaultOutputPath: path as string });
          }} style={{ height: '44px', padding: '0 20px', background: c.input, color: c.text, border: `1px solid ${c.inputBorder}`, borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>选择路径</button>
        </div>
      )}

      {/* Progress */}
      {downloadProgress && (
        <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', border: `2px solid ${c.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>正在下载</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: c.accent, fontVariantNumeric: 'tabular-nums' }}>{downloadProgress.percent.toFixed(1)}%</span>
          </div>
          <div style={{ height: '6px', background: '#F2F2F7', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: c.accent, borderRadius: '3px', width: `${downloadProgress.percent}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: c.text3 }}>
            <span>{downloadProgress.total}</span><span>{downloadProgress.speed}</span><span>剩余 {downloadProgress.eta}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!videoInfo && !isParsing && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: '#F2F2F7', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text, marginBottom: '4px' }}>开始下载</h3>
          <p style={{ fontSize: '13px', color: c.text2 }}>在上方粘贴视频链接，点击解析按钮</p>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 20px', background: '#1D1D1F', color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          下载完成
        </div>
      )}
    </div>
  );
}