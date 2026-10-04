import { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { openPrivacySettings } from '../services/ytdlp';
import { translateError, type FriendlyError } from '../lib/errors';
import { c, linkButtonStyle, Notice } from './common';

export const isCookieAccessError = (error: string) => translateError(error).action === 'cookie-access';

/** Copies the raw (untranslated) error so users can report it; the raw text is never displayed */
function CopyButton({ raw }: { raw: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(raw).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      style={{ ...linkButtonStyle, height: 'auto', padding: 0, fontSize: '11px', color: c.text3 }}>
      {copied ? '已复制' : '复制错误信息'}
    </button>
  );
}

function Actions({ error }: { error: FriendlyError }) {
  const cookieEnabled = useAppStore((s) => s.settings.cookieEnabled);
  const setSettings = useAppStore((s) => s.setSettings);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
      {error.action === 'cookie-access' && (
        <button onClick={() => openPrivacySettings().catch(() => {})} style={{ ...linkButtonStyle, height: 'auto', padding: 0 }}>
          打开系统设置 →
        </button>
      )}
      {error.action === 'enable-cookie' && !cookieEnabled && (
        <button onClick={() => { setSettings({ cookieEnabled: true }); setCurrentPage('download'); }}
          style={{ ...linkButtonStyle, height: 'auto', padding: 0 }}>
          启用 Cookie →
        </button>
      )}
      <CopyButton raw={error.raw} />
    </div>
  );
}

/** Full error block: Chinese title, how to fix, and follow-up actions */
export function ErrorNotice({ error, fallbackTitle }: { error: string; fallbackTitle?: string }) {
  const friendly = translateError(error, fallbackTitle);
  return (
    <Notice tone="error">
      <div style={{ fontWeight: 600 }}>{friendly.title}</div>
      {friendly.hint && <div style={{ color: c.text2, marginTop: '2px' }}>{friendly.hint}</div>}
      <Actions error={friendly} />
    </Notice>
  );
}

/** Compact one-line error for list rows */
export function ErrorInline({ error, fallbackTitle }: { error: string; fallbackTitle?: string }) {
  const friendly = translateError(error, fallbackTitle);
  return (
    <div style={{ fontSize: '11px', marginTop: '3px', lineHeight: 1.5 }}>
      <span style={{ color: c.error }}>{friendly.title}</span>
      {friendly.hint && <span style={{ color: c.text3 }}>　{friendly.hint}</span>}
      <span style={{ marginLeft: '8px' }}><CopyButton raw={friendly.raw} /></span>
    </div>
  );
}
