import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export const c = {
  bg: '#fff',
  border: '#E5E5EA',
  divider: '#F2F2F7',
  text: '#1D1D1F',
  text2: '#86868B',
  text3: '#AEAEB2',
  input: '#F5F5F7',
  inputBorder: '#D2D2D7',
  accent: '#0071E3',
  accentBg: 'rgba(0,113,227,0.1)',
  success: '#34C759',
  successBg: 'rgba(52,199,89,0.1)',
  error: '#FF3B30',
  errorBg: 'rgba(255,59,48,0.08)',
  warning: '#FF9500',
  warningBg: 'rgba(255,149,0,0.1)',
};

export const cardStyle: CSSProperties = { background: c.bg, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' };
export const cardTitleStyle: CSSProperties = { fontSize: '15px', fontWeight: 600, color: c.text };
export const labelStyle: CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 500, color: c.text, marginBottom: '6px' };
export const hintStyle: CSSProperties = { marginTop: '6px', fontSize: '11px', color: c.text3 };
export const inputStyle: CSSProperties = { width: '100%', height: '36px', padding: '0 12px', background: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', color: c.text, outline: 'none' };
export const selectStyle: CSSProperties = { ...inputStyle, cursor: 'pointer' };
export const secondaryButtonStyle: CSSProperties = { height: '36px', padding: '0 16px', background: c.input, color: c.text, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', flexShrink: 0 };
export const linkButtonStyle: CSSProperties = { height: '28px', padding: '0 8px', background: 'transparent', color: c.accent, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', flexShrink: 0 };

export function primaryButtonStyle(disabled: boolean, height = 36): CSSProperties {
  return { height: `${height}px`, padding: '0 20px', background: c.accent, color: '#fff', borderRadius: height > 40 ? '10px' : '8px', fontSize: height > 40 ? '15px' : '13px', fontWeight: 600, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexShrink: 0 };
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>{title}</h1>
      <p style={{ fontSize: '13px', color: c.text2, marginTop: '4px' }}>{subtitle}</p>
      {children}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'error'; children: ReactNode }) {
  const palette = {
    info: { background: 'rgba(0,113,227,0.06)', color: c.text2 },
    warning: { background: c.warningBg, color: '#A05A00' },
    error: { background: c.errorBg, color: c.error },
  }[tone];
  return (
    <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...palette }}>
      {children}
    </div>
  );
}

export function Badge({ color, background, children }: { color: string; background: string; children: ReactNode }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500, background, color, flexShrink: 0, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function Switch({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      style={{ width: '44px', minWidth: '44px', height: '26px', borderRadius: '13px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', flexShrink: 0, padding: 0, appearance: 'none', opacity: disabled ? 0.5 : 1,
        background: checked ? c.accent : '#D1D1D6', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: '2px', left: '2px', width: '22px', height: '22px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s',
        transform: checked ? 'translateX(18px)' : 'translateX(0)' }} />
    </button>
  );
}

export function SwitchRow({ label, desc, checked, onChange, last = false, disabled = false }: {
  label: string; desc: string; checked: boolean; onChange: (checked: boolean) => void; last?: boolean; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${c.divider}` }}>
      <div style={{ flex: 1, marginRight: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: c.text }}>{label}</div>
        <div style={{ fontSize: '12px', color: c.text2, marginTop: '2px' }}>{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function Radio({ checked, square = false }: { checked: boolean; square?: boolean }) {
  return (
    <div style={{ width: '16px', height: '16px', borderRadius: square ? '4px' : '50%', border: `2px solid ${checked ? c.accent : '#D1D1D6'}`, background: square && checked ? c.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {checked && !square && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.accent }} />}
      {checked && square && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function ProgressLine({ percent, color = c.accent }: { percent: number | null; color?: string }) {
  return (
    <div style={{ height: '4px', background: c.divider, borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${percent ?? 0}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
    </div>
  );
}

/** Lightweight toast: render `toast` somewhere in the page and call `show(text)` */
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((message: string) => {
    setText(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), 2000);
  }, []);
  const toast = text && (
    <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', background: '#1D1D1F', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
      {text}
    </div>
  );
  return { toast, show };
}
