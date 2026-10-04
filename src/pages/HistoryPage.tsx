import { useState } from 'react';
import { ask } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../stores/useAppStore';
import { openFile, openFolder } from '../services/ytdlp';
import { c, cardStyle, inputStyle, linkButtonStyle, PageHeader, Badge } from '../components/common';
import type { TaskKind } from '../types';

const kindLabel: Record<TaskKind, string> = { video: '视频', audio: '音频', subtitle: '字幕' };

export function HistoryPage() {
  const history = useAppStore((s) => s.history);
  const removeHistory = useAppStore((s) => s.removeHistory);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const keepArchive = useAppStore((s) => s.settings.keepArchive);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = q
    ? history.filter((h) => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q))
    : history;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader title="下载历史" subtitle={keepArchive ? '查看和管理已下载的视频' : '「保留下载记录」已关闭，历史仅在本次运行期间保留'} />

      {/* 搜索 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', width: '240px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.text3} strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题或链接..."
            style={{ ...inputStyle, paddingLeft: '36px', fontSize: '12px' }} />
        </div>
        {history.length > 0 && (
          <button onClick={async () => { if (await ask('确定清除全部下载历史？已下载的文件不会被删除。', { title: '清除历史', kind: 'warning' })) clearHistory(); }}
            style={{ ...linkButtonStyle, height: '32px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            清除全部
          </button>
        )}
      </div>

      {/* 历史记录列表 */}
      {filtered.length > 0 ? (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {filtered.map((item, i) => {
            const file = item.files?.[0];
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${c.divider}` : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.success, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.url}>{item.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: c.text3 }}>
                    {[item.format, item.size, item.date].filter((t) => t && t !== '-').map((text, j) => (
                      <span key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {j > 0 && <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: c.text3 }} />}
                        {text}
                      </span>
                    ))}
                  </div>
                </div>
                {item.kind && <Badge color={c.text2} background={c.divider}>{kindLabel[item.kind]}</Badge>}
                {file && item.kind !== 'subtitle' && <button onClick={() => openFile(file).catch(() => {})} style={linkButtonStyle}>打开</button>}
                {(file || item.outputDir) && (
                  <button onClick={() => openFolder(file ?? item.outputDir!).catch(() => {})} style={linkButtonStyle}>所在位置</button>
                )}
                <button onClick={() => removeHistory(item.id)} style={{ ...linkButtonStyle, color: c.text3 }}>删除</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: c.divider, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text, marginBottom: '4px' }}>{q ? '没有匹配的记录' : '暂无记录'}</h3>
          <p style={{ fontSize: '13px', color: c.text2 }}>{q ? '换个关键词试试' : '下载的视频会显示在这里'}</p>
        </div>
      )}
    </div>
  );
}
