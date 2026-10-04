import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../stores/useAppStore';
import { networkOptions, parseVideo } from '../services/ytdlp';
import { startTask } from '../services/downloads';
import { TaskList } from '../components/TaskList';
import { ErrorNotice } from '../components/ErrorNotice';
import {
  c, cardStyle, cardTitleStyle, inputStyle, selectStyle, secondaryButtonStyle, linkButtonStyle,
  primaryButtonStyle, PageHeader, Notice, Badge, Switch, SwitchRow, Radio, Spinner, useToast,
} from '../components/common';
import {
  audioFormats, audioSelector, formatDetail, formatLabel, formatSize, pickDefaultVideo,
  videoFormats, videoSelector,
} from '../lib/formats';
import { isFeaturedAuto, listSubtitles, subtitleOptions } from '../lib/subtitles';
import { extractUrl } from '../lib/url';
import type { BatchItem, Format, PostProcessingOptions, VideoInfo } from '../types';

const AUDIO_TARGETS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'm4a', label: 'M4A' },
  { value: 'aac', label: 'AAC' },
  { value: 'opus', label: 'OPUS' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'best', label: '保留原格式' },
];

const POST_PROCESSING_ITEMS: { key: keyof PostProcessingOptions; label: string; desc: string }[] = [
  { key: 'embedSubs', label: '嵌入字幕', desc: '将「字幕」标签中勾选的字幕嵌入视频文件' },
  { key: 'embedThumbnail', label: '嵌入封面', desc: '将缩略图作为封面嵌入' },
  { key: 'embedMetadata', label: '嵌入元数据', desc: '添加标题、作者等信息' },
  { key: 'embedChapters', label: '嵌入章节', desc: '添加视频章节标记' },
  { key: 'sponsorblockRemove', label: '去除广告片段', desc: '通过 SponsorBlock 移除赞助内容（仅 YouTube）' },
];

function FormatRow({ selected, onClick, label, detail, size, badge, square = false }: {
  selected: boolean; onClick: () => void; label: string; detail: string; size?: string; badge?: string; square?: boolean;
}) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', cursor: 'pointer', background: selected ? 'rgba(0,113,227,0.04)' : 'transparent' }}>
      <Radio checked={selected} square={square} />
      <div style={{ width: '96px', fontSize: '13px', fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0, fontSize: '12px', color: c.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>
      {badge && <Badge color={c.success} background={c.successBg}>{badge}</Badge>}
      {size !== undefined && <div style={{ width: '80px', fontSize: '12px', color: c.text3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{size}</div>}
    </div>
  );
}

function CookieCard() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const useFile = !!settings.cookieFile;

  return (
    <div style={{ ...cardStyle, marginTop: '12px', padding: '14px 16px', borderRadius: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>启用 Cookie</div>
          <div style={{ fontSize: '11px', color: c.text3, marginTop: '2px' }}>解析抖音、YouTube 等需要登录或人机验证的网站时使用</div>
        </div>
        <Switch checked={settings.cookieEnabled} onChange={(on) => setSettings({ cookieEnabled: on })} />
      </div>
      {settings.cookieEnabled && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${c.divider}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div onClick={() => setSettings({ cookieFile: '' })}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: !useFile ? 'rgba(0,113,227,0.04)' : 'transparent', border: `1px solid ${!useFile ? c.accent : 'transparent'}` }}>
            <div style={{ marginTop: '1px' }}><Radio checked={!useFile} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: c.text }}>从浏览器获取</div>
              <div style={{ fontSize: '11px', color: c.text3, marginTop: '2px' }}>选择浏览器，自动读取 Cookie（需先在该浏览器登录网站）</div>
              {!useFile && (
                <select value={settings.cookieSource} onClick={(e) => e.stopPropagation()} onChange={(e) => setSettings({ cookieSource: e.target.value })}
                  style={{ ...selectStyle, height: '30px', padding: '0 8px', marginTop: '6px', borderRadius: '6px', fontSize: '12px' }}>
                  <option value="chrome">Chrome</option><option value="firefox">Firefox</option><option value="safari">Safari</option>
                  <option value="edge">Edge</option><option value="brave">Brave</option><option value="chromium">Chromium</option>
                </select>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: useFile ? 'rgba(0,113,227,0.04)' : 'transparent', border: `1px solid ${useFile ? c.accent : 'transparent'}` }}>
            <div style={{ marginTop: '1px' }}><Radio checked={useFile} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: c.text }}>手动选择 Cookie 文件</div>
              <div style={{ fontSize: '11px', color: c.text3, marginTop: '2px' }}>选择导出的 Netscape 格式 cookies.txt 文件</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input type="text" readOnly value={settings.cookieFile.split(/[\\/]/).pop() ?? ''} placeholder="未选择文件"
                  style={{ ...inputStyle, flex: 1, height: '30px', padding: '0 8px', borderRadius: '6px', fontSize: '11px' }} />
                <button onClick={async () => {
                  const file = await open({ filters: [{ name: 'Cookie 文件', extensions: ['txt'] }], title: '选择 Cookie 文件' });
                  if (typeof file === 'string') setSettings({ cookieFile: file });
                }} style={{ ...secondaryButtonStyle, height: '30px', padding: '0 10px', borderRadius: '6px', fontSize: '11px' }}>选择</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaylistCard({ info }: { info: VideoInfo }) {
  const setBatchUrls = useAppStore((s) => s.setBatchUrls);
  const setBatchItems = useAppStore((s) => s.setBatchItems);
  const batchRunning = useAppStore((s) => s.batchRunning);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const entries = (info.entries ?? []).filter((e) => e.url || e.webpage_url);

  const sendToBatch = () => {
    const items: BatchItem[] = entries.map((e, i) => ({
      id: `p${Date.now()}-${i}`,
      url: (e.url || e.webpage_url)!,
      status: 'ready',
      title: e.title,
    }));
    setBatchUrls(items.map((i) => i.url).join('\n'));
    setBatchItems(items);
    setCurrentPage('batch');
  };

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.divider}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge color={c.accent} background={c.accentBg}>播放列表</Badge>
            <h3 style={{ ...cardTitleStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.title}</h3>
          </div>
          <div style={{ fontSize: '12px', color: c.text2, marginTop: '6px' }}>
            {[info.uploader || info.channel, `${entries.length} 个视频`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={sendToBatch} disabled={entries.length === 0 || batchRunning} style={primaryButtonStyle(entries.length === 0 || batchRunning)}>
          全部添加到批量下载
        </button>
      </div>
      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
        {entries.map((e, i) => (
          <div key={`${e.id}-${i}`} style={{ display: 'flex', gap: '12px', padding: '10px 20px', fontSize: '12px', borderBottom: i < entries.length - 1 ? `1px solid ${c.divider}` : 'none' }}>
            <span style={{ width: '28px', color: c.text3, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title || e.url || e.webpage_url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DownloadPage() {
  const {
    currentUrl, setCurrentUrl, videoInfo, setVideoInfo,
    isParsing, setIsParsing, parseError, setParseError,
    formatTab, setFormatTab, selection, setSelection,
    audioTarget, setAudioTarget, subtitleKeys, setSubtitleKeys,
    postProcessing, setPostProcessing,
    settings, setSettings, environment, tasks,
  } = useAppStore();
  const [showAllAuto, setShowAllAuto] = useState(false);
  const { toast, show } = useToast();

  const formats = videoInfo?.formats ?? [];
  const videos = videoFormats(formats);
  const audios = audioFormats(formats);
  const subtitles = listSubtitles(videoInfo);
  const officialSubs = subtitles.filter((s) => s.source === 'official');
  const autoSubs = subtitles.filter((s) => s.source === 'auto');
  const visibleAutoSubs = showAllAuto ? autoSubs : autoSubs.filter(isFeaturedAuto);
  const isPlaylist = videoInfo?._type === 'playlist';
  const selectedFormat: Format | null = formats.find((f) => f.format_id === selection.formatId) ?? null;

  const handleParse = async () => {
    const url = extractUrl(currentUrl);
    if (!url) return;
    if (url !== currentUrl) setCurrentUrl(url);
    setIsParsing(true); setParseError(null); setVideoInfo(null);
    try {
      const info = await parseVideo(url, networkOptions(settings));
      setVideoInfo(info);
      const preferred = pickDefaultVideo(info.formats ?? [], settings.defaultVideoFormat);
      setSelection({ kind: 'video', formatId: preferred?.format_id ?? null });
      setSubtitleKeys([]);
      setFormatTab('video');
    } catch (error) {
      setParseError(String(error));
    } finally {
      setIsParsing(false);
    }
  };

  const audioTargetLabel = AUDIO_TARGETS.find((t) => t.value === audioTarget)?.label ?? audioTarget.toUpperCase();
  const mediaLabel = selection.kind === 'video'
    ? (selectedFormat ? formatLabel(selectedFormat) : '最佳质量')
    : `${selectedFormat ? formatLabel(selectedFormat) : '最佳音质'} → ${audioTargetLabel}`;

  const handleDownload = () => {
    if (!videoInfo) return;
    const isVideo = selection.kind === 'video';
    startTask({
      url: videoInfo.webpage_url || extractUrl(currentUrl),
      title: videoInfo.title,
      kind: isVideo ? 'video' : 'audio',
      formatLabel: mediaLabel,
      sizeLabel: formatSize(selectedFormat),
      options: isVideo
        ? {
          format: videoSelector(selectedFormat),
          mergeFormat: 'mp4',
          // 嵌入时由 ffmpeg 转为容器支持的格式，单独保存时才需要转换
          subtitles: subtitleOptions(subtitleKeys, postProcessing.embedSubs ? undefined : settings.subtitleFormat),
        }
        : { format: audioSelector(selectedFormat), extractAudio: audioTarget },
      postProcessing: isVideo ? postProcessing : { ...postProcessing, embedSubs: false },
    });
    show('已加入下载任务');
  };

  const toggleSubtitle = (key: string) =>
    setSubtitleKeys(subtitleKeys.includes(key) ? subtitleKeys.filter((k) => k !== key) : [...subtitleKeys, key]);

  const tabCounts = { video: videos.length + 1, audio: audios.length + 1, subtitle: subtitles.length };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader title="下载视频" subtitle="粘贴视频链接，选择格式，开始下载">
        <CookieCard />
        {environment && !environment.version && (
          <Notice tone="error">下载引擎缺失或无法运行，请重新安装 xVideo</Notice>
        )}
        {environment?.version && !environment.ffmpeg && (
          <Notice tone="warning">内置 ffmpeg 缺失：合并音视频、提取音频、嵌入字幕/封面将无法使用，请重新安装 xVideo</Notice>
        )}
      </PageHeader>

      {/* URL Input */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input type="text" value={currentUrl} onChange={(e) => setCurrentUrl(e.target.value)} placeholder="输入 YouTube、Bilibili 等视频或播放列表链接..."
            onKeyDown={(e) => e.key === 'Enter' && !isParsing && handleParse()}
            style={{ ...inputStyle, flex: 1, height: '40px', padding: '0 16px' }} />
          <button onClick={handleParse} disabled={isParsing || !currentUrl.trim()} style={primaryButtonStyle(isParsing || !currentUrl.trim(), 40)}>
            {isParsing && <Spinner size={14} />}
            {isParsing ? '解析中...' : '解析'}
          </button>
        </div>
        {parseError && <ErrorNotice error={parseError} fallbackTitle="解析失败" />}
      </div>

      {videoInfo && isPlaylist && <PlaylistCard info={videoInfo} />}

      {/* Video Info */}
      {videoInfo && !isPlaylist && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '160px', height: '90px', background: c.input, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
              {videoInfo.thumbnail ? <img src={videoInfo.thumbnail} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{videoInfo.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: c.text2, flexWrap: 'wrap' }}>
                {[videoInfo.uploader || videoInfo.channel, videoInfo.duration_string, videoInfo.view_count != null ? `${videoInfo.view_count.toLocaleString()} 次观看` : null, videoInfo.extractor_key]
                  .filter(Boolean)
                  .map((text, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {i > 0 && <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: c.text3 }} />}
                      {text}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Format Selection */}
      {videoInfo && !isPlaylist && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${c.divider}` }}>
            <h3 style={cardTitleStyle}>选择格式</h3>
            <div style={{ display: 'inline-flex', gap: '2px', padding: '2px', background: c.divider, borderRadius: '8px' }}>
              {(['video', 'audio', 'subtitle'] as const).map((tab) => (
                <button key={tab} onClick={() => setFormatTab(tab)}
                  style={{ height: '28px', padding: '0 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: formatTab === tab ? '#fff' : 'transparent', color: formatTab === tab ? c.text : c.text3,
                    boxShadow: formatTab === tab ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>
                  {{ video: '视频', audio: '仅音频', subtitle: '字幕' }[tab]} {tabCounts[tab] > 0 && <span style={{ color: c.text3 }}>{tabCounts[tab]}</span>}
                </button>
              ))}
            </div>
          </div>

          {formatTab === 'audio' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderBottom: `1px solid ${c.divider}`, fontSize: '12px', color: c.text2 }}>
              转换为
              <select value={audioTarget} onChange={(e) => setAudioTarget(e.target.value)} style={{ ...selectStyle, width: '140px', height: '30px', fontSize: '12px' }}>
                {AUDIO_TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {formatTab === 'video' && (
              <>
                <FormatRow selected={selection.kind === 'video' && selection.formatId === null} onClick={() => setSelection({ kind: 'video', formatId: null })}
                  label="最佳质量" detail="自动选择最高画质并合并最佳音轨" badge="推荐" size="-" />
                {videos.map((f) => (
                  <FormatRow key={f.format_id} selected={selection.kind === 'video' && selection.formatId === f.format_id}
                    onClick={() => setSelection({ kind: 'video', formatId: f.format_id })}
                    label={formatLabel(f)} detail={formatDetail(f)} size={formatSize(f)} />
                ))}
              </>
            )}
            {formatTab === 'audio' && (
              <>
                <FormatRow selected={selection.kind === 'audio' && selection.formatId === null} onClick={() => setSelection({ kind: 'audio', formatId: null })}
                  label="最佳音质" detail="自动选择最高音质的音轨" badge="推荐" size="-" />
                {audios.map((f) => (
                  <FormatRow key={f.format_id} selected={selection.kind === 'audio' && selection.formatId === f.format_id}
                    onClick={() => setSelection({ kind: 'audio', formatId: f.format_id })}
                    label={formatLabel(f)} detail={formatDetail(f)} size={formatSize(f)} />
                ))}
              </>
            )}
            {formatTab === 'subtitle' && (subtitles.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: c.text3 }}>该视频没有可用字幕</div>
            ) : (
              <>
                <div style={{ padding: '10px 20px', fontSize: '12px', color: c.text2, background: 'rgba(0,113,227,0.04)' }}>
                  {postProcessing.embedSubs
                    ? '勾选的字幕会嵌入到视频文件中'
                    : `勾选的字幕会另存为 ${settings.subtitleFormat === 'original' ? '原始格式' : settings.subtitleFormat.toUpperCase()} 文件（可在下方开启「嵌入字幕」）`}
                </div>
                {[...officialSubs, ...visibleAutoSubs].map((s) => (
                  <FormatRow key={s.key} square selected={subtitleKeys.includes(s.key)} onClick={() => toggleSubtitle(s.key)}
                    label={s.lang} detail={s.name} badge={s.source === 'official' ? '官方' : undefined} />
                ))}
                {autoSubs.length > visibleAutoSubs.length || showAllAuto ? (
                  <div style={{ padding: '8px 20px' }}>
                    <button onClick={() => setShowAllAuto(!showAllAuto)} style={linkButtonStyle}>
                      {showAllAuto ? '收起自动翻译字幕' : `显示全部自动字幕（${autoSubs.length}）`}
                    </button>
                  </div>
                ) : null}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Post Processing */}
      {videoInfo && !isPlaylist && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>后处理选项</h3>
          <div style={{ marginTop: '6px' }}>
            {POST_PROCESSING_ITEMS.map((item, i) => (
              <SwitchRow key={item.key} label={item.label} desc={item.desc} last={i === POST_PROCESSING_ITEMS.length - 1}
                checked={postProcessing[item.key]} onChange={(on) => setPostProcessing({ [item.key]: on })} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {videoInfo && !isPlaylist && (
        <div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleDownload} style={{ ...primaryButtonStyle(false, 44), flex: 1, boxShadow: '0 2px 8px rgba(0,113,227,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              {selection.kind === 'video' ? '下载视频' : '下载音频'} · {mediaLabel}
              {selection.kind === 'video' && subtitleKeys.length > 0 && ` + ${subtitleKeys.length} 个字幕`}
            </button>
            <button onClick={async () => {
              const path = await open({ directory: true, title: '选择保存路径' });
              if (typeof path === 'string') setSettings({ defaultOutputPath: path });
            }} style={{ ...secondaryButtonStyle, height: '44px', padding: '0 20px', borderRadius: '10px', fontSize: '14px' }}>选择路径</button>
          </div>
          <p style={{ marginTop: '8px', fontSize: '11px', color: c.text3 }}>保存到：{settings.defaultOutputPath}</p>
        </div>
      )}

      <TaskList />

      {/* Empty State */}
      {!videoInfo && !isParsing && tasks.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: c.divider, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text, marginBottom: '4px' }}>开始下载</h3>
          <p style={{ fontSize: '13px', color: c.text2 }}>在上方粘贴视频链接，点击解析按钮</p>
        </div>
      )}

      {toast}
    </div>
  );
}
