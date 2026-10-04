import type { SubtitleOptions, VideoInfo } from '../types';

export interface SubtitleEntry {
  /** `${source}:${lang}` — the same language can exist as both official and auto */
  key: string;
  lang: string;
  name: string;
  source: 'official' | 'auto';
}

const COMMON_LANGS = ['zh-Hans', 'zh-Hant', 'zh-CN', 'zh-TW', 'zh', 'en', 'ja', 'ko'];

export function listSubtitles(info: VideoInfo | null): SubtitleEntry[] {
  if (!info) return [];
  const entries: SubtitleEntry[] = [];
  const add = (source: SubtitleEntry['source'], map?: VideoInfo['subtitles']) => {
    for (const [lang, tracks] of Object.entries(map ?? {})) {
      if (lang === 'live_chat') continue;
      const name = tracks.find((t) => t.name)?.name ?? lang;
      entries.push({ key: `${source}:${lang}`, lang, name, source });
    }
  };
  add('official', info.subtitles);
  add('auto', info.automatic_captions);
  return entries;
}

/** YouTube offers ~150 machine-translated tracks; by default only show the original and common languages */
export const isFeaturedAuto = (e: SubtitleEntry) =>
  e.lang.endsWith('-orig') || COMMON_LANGS.includes(e.lang);

// --sub-langs takes regexes
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function subtitleOptions(keys: string[], convert?: string): SubtitleOptions | undefined {
  if (keys.length === 0) return undefined;
  const langs = [...new Set(keys.map((k) => k.slice(k.indexOf(':') + 1)))].map(escapeRegex);
  return {
    langs,
    includeAuto: keys.some((k) => k.startsWith('auto:')),
    convert: convert && convert !== 'original' ? convert : undefined,
  };
}
