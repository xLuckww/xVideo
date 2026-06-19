const c = { bg: '#fff', border: '#E5E5EA', text: '#1D1D1F', text2: '#86868B', text3: '#AEAEB2', input: '#F5F5F7', inputBorder: '#D2D2D7', accent: '#0071E3' };

const mockSubtitles = [
  { lang: '中文', name: '简体中文 (自动生成)', type: '自动', available: true },
  { lang: 'English', name: 'English (Official)', type: '官方', available: true },
  { lang: '日本語', name: '日本語 (自動生成)', type: '自动', available: true },
  { lang: '한국어', name: '한국어 (자동 생성)', type: '自动', available: true },
  { lang: 'Español', name: 'Español (Automático)', type: '自动', available: false },
];

export function SubtitlePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>字幕管理</h1>
        <p style={{ fontSize: '13px', color: c.text2, marginTop: '4px' }}>下载和管理视频字幕</p>
      </div>

      {/* 可用字幕 */}
      <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F2F2F7' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text }}>可用字幕</h3>
          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: 'rgba(52,199,89,0.1)', color: '#34C759' }}>
            {mockSubtitles.filter(s => s.available).length} 种语言
          </span>
        </div>
        {mockSubtitles.map((sub, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < mockSubtitles.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
            <div style={{ width: '32px', height: '32px', background: '#F2F2F7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>{sub.lang}</div>
              <div style={{ fontSize: '11px', color: c.text3, marginTop: '2px' }}>{sub.name}</div>
            </div>
            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background: sub.type === '官方' ? 'rgba(0,113,227,0.1)' : '#F2F2F7', color: sub.type === '官方' ? c.accent : c.text2, flexShrink: 0 }}>
              {sub.type}
            </span>
            <button disabled={!sub.available}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '28px', padding: '0 10px', background: 'transparent', color: sub.available ? c.accent : c.text3, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: sub.available ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下载
            </button>
          </div>
        ))}
      </div>

      {/* 字幕设置 */}
      <div style={{ background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: c.text }}>字幕设置</h3>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: c.text, marginBottom: '6px' }}>输出格式</label>
              <select style={{ width: '100%', height: '36px', padding: '0 12px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', color: c.text, outline: 'none', cursor: 'pointer' }}>
                <option>SRT</option><option>VTT</option><option>ASS</option><option>JSON3</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: c.text, marginBottom: '6px' }}>字幕语言</label>
              <select style={{ width: '100%', height: '36px', padding: '0 12px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', color: c.text, outline: 'none', cursor: 'pointer' }}>
                <option>所有语言</option><option>中文</option><option>English</option><option>日本語</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: `1px solid #F2F2F7` }}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>嵌入到视频</div>
              <div style={{ fontSize: '12px', color: c.text2, marginTop: '2px' }}>下载后自动将字幕嵌入视频文件</div>
            </div>
            <button style={{ width: '44px', minWidth: '44px', maxWidth: '44px', height: '26px', minHeight: '26px', maxHeight: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0, appearance: 'none', background: '#D1D1D6' }}>
              <span style={{ position: 'absolute', top: '2px', left: '2px', width: '22px', height: '22px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transform: 'translateX(0)' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}