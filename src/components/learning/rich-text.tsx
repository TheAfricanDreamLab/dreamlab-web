import type { ReactNode } from 'react';
import { cx } from '@/components/ui/primitives';
import { type Line, parseRich } from '@/lib/rich-markdown';

/*
 * Course text: the safe markup the editor writes (see lib/rich-markdown), built as React elements,
 * never as HTML, so text from a course cannot inject markup. Links open in a new tab and only https
 * (or same-site) addresses become links.
 */

function inline(line: Line, key: string): ReactNode[] {
  return line.map((seg, i) => {
    let node: ReactNode = seg.text;
    if (seg.marks.includes('code')) node = <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.92em] text-ink ring-1 ring-line">{node}</code>;
    if (seg.marks.includes('italic')) node = <em>{node}</em>;
    if (seg.marks.includes('underline')) node = <span className="underline decoration-1 underline-offset-2">{node}</span>;
    if (seg.marks.includes('bold')) node = <strong className="font-semibold text-ink">{node}</strong>;
    if (seg.href) {
      const external = !seg.href.startsWith('/');
      node = (
        <a href={seg.href} className="font-semibold text-link underline underline-offset-2 hover:text-forest" {...(external && { target: '_blank', rel: 'noopener noreferrer nofollow' })}>
          {node}
        </a>
      );
    }
    return <span key={`${key}-${i}`}>{node}</span>;
  });
}

const lines = (ls: Line[], key: string) =>
  ls.map((l, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {inline(l, `${key}-${i}`)}
    </span>
  ));

export function RichText({ text, className, size = 'md' }: { text: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const fontSize = { sm: 'text-[14px]', md: 'text-[15.5px]', lg: 'text-[17px]' }[size];
  return (
    <div className={cx('space-y-3 leading-relaxed text-body', fontSize, className)}>
      {parseRich(text).map((b, bi) => {
        const key = String(bi);
        switch (b.type) {
          case 'paragraph':
            return <p key={key}>{lines(b.lines, key)}</p>;
          case 'heading':
            return b.level === 2 ? (
              <h3 key={key} className="pt-2 font-display text-[1.3em] font-bold leading-snug text-ink">
                {inline(b.content, key)}
              </h3>
            ) : (
              <h4 key={key} className="pt-1 font-display text-[1.12em] font-bold leading-snug text-ink">
                {inline(b.content, key)}
              </h4>
            );
          case 'bullets':
            return (
              <ul key={key} className="list-disc space-y-1.5 pl-5 marker:text-primary">
                {b.items.map((l, i) => (
                  <li key={i}>{inline(l, `${key}-${i}`)}</li>
                ))}
              </ul>
            );
          case 'numbers':
            return (
              <ol key={key} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-link">
                {b.items.map((l, i) => (
                  <li key={i}>{inline(l, `${key}-${i}`)}</li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote key={key} className="border-l-4 border-gold-line pl-4 italic text-ink">
                {lines(b.lines, key)}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={key} className="overflow-x-auto rounded-lg bg-forest p-4 font-mono text-[13px] leading-relaxed text-white">
                <code>{b.text}</code>
              </pre>
            );
          case 'table': {
            const [head, ...body] = b.rows;
            return (
              <div key={key} className="overflow-x-auto rounded-lg ring-1 ring-line">
                <table className="w-full border-collapse text-left text-[0.95em]">
                  <thead className="bg-surface">
                    <tr>
                      {(head ?? []).map((c, i) => (
                        <th key={i} scope="col" className="border-b border-line px-3 py-2 font-semibold text-ink">
                          {inline(c, `${key}-h${i}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {body.map((r, ri) => (
                      <tr key={ri} className="border-b border-line last:border-0">
                        {r.map((c, ci) => (
                          <td key={ci} className="px-3 py-2 align-top">
                            {inline(c, `${key}-${ri}-${ci}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
