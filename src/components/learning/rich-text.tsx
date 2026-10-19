import type { ReactNode } from 'react';
import { cx } from '@/components/ui/primitives';

/*
 * Course text: paragraphs split by blank lines; **bold** and *italic*; lines starting "- " become
 * bullets and "1. " numbered steps. Built as React elements, never as HTML, so text from a course
 * file cannot inject markup.
 */

const INLINE = /(\*\*[^*\n]+?\*\*|\*[^*\s][^*\n]*?\*)/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={key} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

type Group = { kind: 'p' | 'ul' | 'ol'; lines: string[] };

function groups(paragraph: string): Group[] {
  const out: Group[] = [];
  for (const raw of paragraph.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const kind: Group['kind'] = /^\s*[-•]\s+/.test(line) ? 'ul' : /^\s*\d+[.)]\s+/.test(line) ? 'ol' : 'p';
    const text = kind === 'ul' ? line.replace(/^\s*[-•]\s+/, '') : kind === 'ol' ? line.replace(/^\s*\d+[.)]\s+/, '') : line;
    const last = out.at(-1);
    if (last && last.kind === kind) last.lines.push(text);
    else out.push({ kind, lines: [text] });
  }
  return out;
}

export function RichText({ text, className, size = 'md' }: { text: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const fontSize = { sm: 'text-[14px]', md: 'text-[15.5px]', lg: 'text-[17px]' }[size];
  const blocks = text.split(/\n\s*\n/).flatMap((p, pi) => groups(p).map((g, gi) => ({ ...g, key: `${pi}-${gi}` })));
  return (
    <div className={cx('space-y-3 leading-relaxed text-body', fontSize, className)}>
      {blocks.map((b) =>
        b.kind === 'ul' ? (
          <ul key={b.key} className="list-disc space-y-1.5 pl-5 marker:text-primary">
            {b.lines.map((l, i) => (
              <li key={i}>{inline(l, `${b.key}-${i}`)}</li>
            ))}
          </ul>
        ) : b.kind === 'ol' ? (
          <ol key={b.key} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-link">
            {b.lines.map((l, i) => (
              <li key={i}>{inline(l, `${b.key}-${i}`)}</li>
            ))}
          </ol>
        ) : (
          <p key={b.key}>
            {b.lines.map((l, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {inline(l, `${b.key}-${i}`)}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
