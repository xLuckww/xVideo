import { useAppStore } from '../stores/useAppStore';

const c = { bg: '#fff', border: '#E5E5EA', text: '#1D1D1F', text2: '#86868B', text3: '#AEAEB2', input: '#F5F5F7', inputBorder: '#D2D2D7', accent: '#0071E3' };

export function HistoryPage() {
  const history = useAppStore((s) => s.history);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>下载历史</h1>
        <p style={{ fontSize: '13px', color: c.text2, marginTop: '4px' }}>查看和管理已下载的视频</p>
      </div>

      {/* 搜索 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', width: '240px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.text3} strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="搜索视频..."
            style={{ width: '100%', height: '36px', paddingLeft: '36px', paddingRight: '12px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '12px', color: c.text, outline: 'none' }} />
        </div>
        {history.length > 0 && (
          <button onClick={() => useAppStore.getState().setHistory([])}
            style={{ height: '32px', padding: '0 12px', background: 'transparent', color: c.accent, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            清除全部
          </button>
        )}
      </div>

      {/* 历史记录列表 */}
      {history.length > 0 ? (
        <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
          {history.map((item, i) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < history.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34C759', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: c.text3 }}>
                  <span>{item.format}</span>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: c.text3 }} />
                  <span>{item.size}</span>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: c.text3 }} />
                  <span>{item.date}</span>
                </div>
              </div>
              <button onClick={() => useAppStore.getState().removeHistory(item.id)}
                style={{ padding: '4px 8px', background: 'transparent', color: c.text3, border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                删除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: '#F2F2F7', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text, marginBottom: '4px' }}>暂无记录</h3>
          <p style={{ fontSize: '13px', color: c.text2 }}>下载的视频会显示在这里</p>
        </div>
      )}
    </div>
  );
}