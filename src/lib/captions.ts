/**
 * Captions in the browser (CAT-6): reading WebVTT and SubRip files for the caption editor and the
 * transcript. The same rules as the contracts' parseCaptions, kept here so learner pages don't load
 * the contracts' schemas.
 */

export type Cue = { startS: number; endS: number; text: string };

const seconds = (t: string): number | null => {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/.exec(t.trim());
  // Minutes and seconds stop at 59 (an hour field, when there is one, makes minutes count too).
  if (!m || Number(m[3]) > 59 || (m[1] !== undefined && Number(m[2]) > 59)) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]!.padEnd(3, '0')) / 1000;
};

/** Cues from a .vtt or .srt file, in time order; styling removed. Throws when there are none. */
export function parseCaptions(text: string): Cue[] {
  const cues: Cue[] = [];
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  // A blank line (spaces or tabs on it are blank too) ends a cue.
  for (const block of body.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/)) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    const at = lines.findIndex((l) => l.includes('-->'));
    if (at < 0) continue;
    const [from, rest] = lines[at]!.split('-->');
    const startS = seconds(from ?? '');
    const endS = seconds((rest ?? '').trim().split(/\s+/)[0] ?? '');
    const words = lines
      .slice(at + 1)
      .join('\n')
      .replace(/<[^>]*>/g, '')
      // &amp; last, so "&amp;lt;" reads back as "&lt;".
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
    if (startS === null || endS === null || endS <= startS || !words) continue;
    cues.push({ startS: Math.round(startS * 1000) / 1000, endS: Math.round(endS * 1000) / 1000, text: words.slice(0, 500) });
  }
  if (!cues.length) throw new Error('No captions found: use a WebVTT (.vtt) or SubRip (.srt) file');
  return cues.sort((a, b) => a.startS - b.startS);
}

/** 83.25 → "1:23.2" (for the caption editor, to a tenth of a second). */
export function formatCueTime(s: number): string {
  // In whole milliseconds first, so 83.3 shows as 1:23.3 (not 1:23.2 from floating point).
  const ms = Math.round(s * 1000);
  const whole = Math.floor(ms / 1000);
  const tenth = Math.floor((ms % 1000) / 100);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h ? `${h}:${pad(m)}` : m}:${pad(whole % 60)}.${tenth}`;
}

/** "1:23.2", "1:02:03.25" or "83.5" → seconds; null if it isn't a time. */
export function parseCueTime(text: string): number | null {
  const t = text.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(t);
  if (!m || Number(m[3]) > 59 || (m[1] !== undefined && Number(m[2]) > 59)) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + (m[4] ? Number(`0.${m[4]}`) : 0);
}

/** Languages offered for captions, as in the contracts. */
export const CAPTION_LANGUAGES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  ar: 'Arabic',
  sw: 'Swahili',
  yo: 'Yoruba',
  ha: 'Hausa',
  ig: 'Igbo',
  am: 'Amharic',
  zu: 'Zulu',
  af: 'Afrikaans',
  so: 'Somali',
};
