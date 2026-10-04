import { Download, Stack, Clock, FileText, Gear, Lightning, Heart } from '@phosphor-icons/react';
import { useAppStore, isTaskActive } from '../../stores/useAppStore';
import { c } from '../common';

const navItems = [
  { id: 'download' as const, label: '下载', icon: Download },
  { id: 'batch' as const, label: '批量下载', icon: Stack },
  { id: 'history' as const, label: '历史记录', icon: Clock },
  { id: 'subtitle' as const, label: '字幕管理', icon: FileText },
  { id: 'settings' as const, label: '设置', icon: Gear },
  { id: 'donate' as const, label: '赞赏', icon: Heart },
];

export function Sidebar() {
  const currentPage = useAppStore((s) => s.currentPage);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const environment = useAppStore((s) => s.environment);
  const activeTasks = useAppStore((s) => s.tasks.filter(isTaskActive).length);
  const engineOk = !!environment?.version;

  return (
    <aside style={{ width: '200px', height: '100%', background: c.sidebar, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', userSelect: 'none', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: c.accent, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightning size={18} weight="fill" color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: c.text, letterSpacing: '-0.01em', lineHeight: 1 }}>xVideo</div>
            <div style={{ fontSize: '11px', color: c.text3, marginTop: '3px' }}>视频下载工具</div>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: c.border, margin: '0 16px', flexShrink: 0 }} />

      {/* Navigation - 每个选项平分剩余空间 */}
      <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button key={item.id} onClick={() => setCurrentPage(item.id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                background: isActive ? c.accent : 'transparent', color: isActive ? '#fff' : c.navText }}>
              <Icon size={18} weight={isActive ? 'fill' : 'regular'} color={isActive ? '#fff' : c.text3} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === 'download' && activeTasks > 0 && (
                <span style={{ minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? '#fff' : c.accent, color: isActive ? c.accent : '#fff' }}>{activeTasks}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status */}
      <div onClick={() => setCurrentPage('settings')} title={environment?.ytdlp ?? '下载引擎缺失'}
        style={{ padding: '12px 20px', borderTop: `1px solid ${c.border}`, flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: environment ? (engineOk ? c.success : c.error) : c.text3 }} />
          <span style={{ fontSize: '11px', color: c.text3 }}>
            {environment ? (engineOk ? `引擎 ${environment.version}` : '下载引擎缺失') : '检测引擎中…'}
          </span>
        </div>
      </div>
    </aside>
  );
}