import { useState } from 'react';
import { useAppStore, isTaskActive } from '../stores/useAppStore';
import { networkOptions, parseVideo } from '../services/ytdlp';
import { startTask } from '../services/downloads';
import { TaskList } from '../components/TaskList';
import { ErrorNotice } from '../components/ErrorNotice';
import { isFeaturedAuto, listSubtitles, subtitleOptions, type SubtitleEntry } from '../lib/subtitles';
import { extractUrl } from '../lib/url';
import {
  c, cardStyle, cardTitleStyle, inputStyle, labelStyle, selectStyle, linkButtonStyle,
  primaryButtonStyle, PageHeader, Badge, SwitchRow, Spinner,
} from '../components/common';

const SUBTITLE_FORMATS = [
  { value: 'srt', label: 'SRT' },
  { value: 'vtt', label: 'VTT' },
  { value: 'ass', label: 'ASS' },
  { value: 'lrc', label: 'LRC' },
  { value: 'original', label: '原始格式' },
];

export function SubtitlePage() {
  const url = useAppStore((s) => s.subtitleUrl);
  const setUrl = useAppStore((s) => s.setSubtitleUrl);
  const info = useAppStore((s) => s.subtitleInfo);
  const setInfo = useAppStore((s) => s.setSubtitleInfo);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const postProcessing = useAppStore((s) => s.postProcessing);
  const setPostProcessing = useAppStore((s) => s.setPostProcessing);
  const tasks = useAppStore((s) => s.tasks);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllAuto, setShowAllAuto] = useState(false);

  const subtitles = listSubtitles(info);
  const official = subtitles.filter((s) => s.source === 'official');
  const auto = subtitles.filter((s) => s.source === 'auto');
  const visible = [...official, ...(showAllAuto ? auto : auto.filter(isFeaturedAuto))];
  const formatName = SUBTITLE_FORMATS.find((f) => f.value === settings.subtitleFormat)?.label ?? settings.subtitleFormat;

  const handleParse = async () => {
    const target = extractUrl(url);
    if (!target) return;
    if (target !== url) setUrl(target);
    setIsParsing(true); setError(null); setInfo(null);
    try {
      const parsed = await parseVideo(target, networkOptions(settings));
      if (parsed._type === 'playlist') throw new Error('请粘贴单个视频的链接，播放列表暂不支持批量下载字幕');
      setInfo(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsParsing(false);
    }
  };

  const videoUrl = info?.webpage_url || url.trim();
  const tagFor = (entry: SubtitleEntry) => `${videoUrl}#${entry.key}`;
  const taskFor = (entry: SubtitleEntry) => tasks.find((t) => t.tag === tagFor(entry));

  const download = (entry: SubtitleEntry) => {
    if (!info) return;
    startTask({
      url: videoUrl,
      title: `${info.title} [${entry.lang}]`,
      kind: 'subtitle',
      formatLabel: `${entry.name} · ${formatName}`,
      tag: tagFor(entry),
      options: { skipDownload: true, subtitles: subtitleOptions([entry.key], settings.subtitleFormat) },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader title="字幕管理" subtitle="单独下载视频字幕，或设置下载视频时的字幕处理方式" />

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="输入视频链接，查看可用字幕..."
            onKeyDown={(e) => e.key === 'Enter' && !isParsing && handleParse()}
            style={{ ...inputStyle, flex: 1, height: '40px', padding: '0 16px' }} />
          <button onClick={handleParse} disabled={isParsing || !url.trim()} style={primaryButtonStyle(isParsing || !url.trim(), 40)}>
            {isParsing && <Spinner size={14} />}
            {isParsing ? '解析中...' : '获取字幕'}
          </button>
        </div>
        {error && <ErrorNotice error={error} fallbackTitle="获取字幕失败" />}
      </div>

      {/* 可用字幕 */}
      {info && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${c.divider}` }}>
            <h3 style={{ ...cardTitleStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.title}</h3>
            <Badge color={c.success} background={c.successBg}>{official.length} 官方 · {auto.length} 自动</Badge>
          </div>
          {visible.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: c.text3 }}>该视频没有可用字幕</div>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {visible.map((sub, i) => {
                const task = taskFor(sub);
                const active = task && isTaskActive(task);
                return (
                  <div key={sub.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < visible.length - 1 ? `1px solid ${c.divider}` : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>{sub.name}</div>
                      <div style={{ fontSize: '11px', color: c.text3, marginTop: '2px' }}>{sub.lang}</div>
                    </div>
                    <Badge color={sub.source === 'official' ? c.accent : c.text2} background={sub.source === 'official' ? c.accentBg : c.divider}>
                      {sub.source === 'official' ? '官方' : '自动'}
                    </Badge>
                    {task?.status === 'completed' && <span style={{ fontSize: '12px', color: c.success }}>已下载</span>}
                    {task?.status === 'error' && <span style={{ fontSize: '12px', color: c.error }}>失败</span>}
                    <button disabled={active} onClick={() => download(sub)}
                      style={{ ...linkButtonStyle, display: 'flex', alignItems: 'center', gap: '6px', color: active ? c.text3 : c.accent, cursor: active ? 'not-allowed' : 'pointer' }}>
                      {active ? <Spinner size={14} /> : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      )}
                      下载
                    </button>
                  </div>
                );
              })}
              {(auto.length > auto.filter(isFeaturedAuto).length) && (
                <div style={{ padding: '8px 20px', borderTop: `1px solid ${c.divider}` }}>
                  <button onClick={() => setShowAllAuto(!showAllAuto)} style={linkButtonStyle}>
                    {showAllAuto ? '收起自动翻译字幕' : `显示全部自动字幕（${auto.length}）`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <TaskList title="字幕任务" filter={(t) => t.kind === 'subtitle'} />

      {/* 字幕设置 */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>字幕设置</h3>
        <div style={{ marginTop: '16px' }}>
          <label style={labelStyle}>输出格式</label>
          <select value={settings.subtitleFormat} onChange={(e) => setSettings({ subtitleFormat: e.target.value })} style={selectStyle}>
            {SUBTITLE_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <p style={{ marginTop: '6px', fontSize: '11px', color: c.text3 }}>转换格式需要 ffmpeg；单独下载和下载视频时另存的字幕都使用此格式</p>
        </div>
        <div style={{ marginTop: '6px' }}>
          <SwitchRow label="嵌入到视频" desc="下载视频时，将「下载」页勾选的字幕嵌入视频文件" last
            checked={postProcessing.embedSubs} onChange={(on) => setPostProcessing({ embedSubs: on })} />
        </div>
      </div>
    </div>
  );
}
