import type { Block } from '@dreamlab/contracts';
import { cx } from '@/components/ui/primitives';
import { ImageFigure, VideoFacade } from './media';
import { RichText } from './rich-text';

/* Blocks that teach (no answer needed). Plain components: usable from the client lesson player. */

type Teaching = Extract<Block, { type: 'text' | 'callout' | 'quote' | 'example' | 'key_terms' | 'reveal' | 'framework' | 'video' | 'image' }>;

const CALLOUTS = {
  insight: { label: 'Key idea', icon: '✦', box: 'bg-success-tint ring-success-line', badge: 'bg-primary text-white', title: 'text-forest' },
  tip: { label: 'Tip', icon: '➜', box: 'bg-[#eef4fb] ring-[#cfe0f2]', badge: 'bg-[#2f6fb3] text-white', title: 'text-[#1c4673]' },
  caution: { label: 'Watch out', icon: '!', box: 'bg-danger-tint ring-danger-line', badge: 'bg-danger text-white', title: 'text-danger-ink' },
  story: { label: 'Story', icon: '❝', box: 'bg-gold-tint ring-gold-line', badge: 'bg-gold text-white', title: 'text-gold-ink' },
  context: { label: 'In context', icon: '◎', box: 'bg-[#f3eefa] ring-[#e0d3f0]', badge: 'bg-[#6b4aa0] text-white', title: 'text-[#46306b]' },
} as const;

export const isTeachingBlock = (b: Block): b is Teaching => ['text', 'callout', 'quote', 'example', 'key_terms', 'reveal', 'framework', 'video', 'image'].includes(b.type);

export function TeachingBlock({ block }: { block: Teaching }) {
  switch (block.type) {
    case 'text':
      return <RichText text={block.body} size="lg" />;
    case 'callout': {
      const s = CALLOUTS[block.tone];
      return (
        <aside className={cx('space-y-2 rounded-[var(--radius-card)] p-5 ring-1', s.box)} aria-label={block.title ?? s.label}>
          <div className="flex items-center gap-2.5">
            <span aria-hidden className={cx('grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold', s.badge)}>
              {s.icon}
            </span>
            <p className={cx('font-display text-[16px] font-bold', s.title)}>
              {block.title ?? s.label}
              {block.title && <span className="sr-only"> ({s.label})</span>}
            </p>
          </div>
          <RichText text={block.body} />
        </aside>
      );
    }
    case 'quote':
      return (
        <figure className="space-y-2 border-l-4 border-gold py-1 pl-5">
          <blockquote className="font-display text-[21px] font-semibold leading-snug text-ink">“{block.text}”</blockquote>
          <figcaption className="text-[13.5px] text-muted">— {block.attribution}</figcaption>
        </figure>
      );
    case 'example':
      return (
        <section className="overflow-hidden rounded-[var(--radius-card)] bg-card ring-1 ring-line">
          <p className="border-b border-line bg-surface px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-link">Example · {block.title}</p>
          <div className="p-5">
            <RichText text={block.body} />
          </div>
        </section>
      );
    case 'key_terms':
      return (
        <section className="rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">Key terms</p>
          <dl className="divide-y divide-line">
            {block.terms.map((t) => (
              <div key={t.term} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[160px_1fr] sm:gap-4">
                <dt className="font-display text-[15.5px] font-bold text-ink">{t.term}</dt>
                <dd className="text-[14.5px] leading-relaxed text-body">{t.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case 'reveal':
      return (
        <details className="group rounded-[var(--radius-card)] bg-forest text-white">
          <summary className="flex cursor-pointer list-none flex-col gap-3 rounded-[var(--radius-card)] p-5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold">Think first</span>
            <span className="font-display text-[18px] font-semibold leading-snug">{block.prompt}</span>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13.5px] font-semibold ring-1 ring-white/20 group-open:hidden">
              Tap to reveal <span aria-hidden>↓</span>
            </span>
          </summary>
          <div className="rounded-b-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
            <RichText text={block.body} />
          </div>
        </details>
      );
    case 'video':
      return <VideoFacade video={block} caption={block.caption} />;
    case 'image':
      return <ImageFigure url={block.url} alt={block.alt} caption={block.caption} credit={block.credit} />;
    case 'framework':
      return (
        <section className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
          <p className="font-display text-[17px] font-bold text-ink">{block.title}</p>
          <ol className="space-y-0">
            {block.steps.map((s, i) => (
              <li key={s.label} className="relative flex gap-4 pb-4 last:pb-0">
                {i < block.steps.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5 bg-success-line" />}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-[14px] font-bold text-white">{i + 1}</span>
                <div className="pt-1">
                  <p className="font-display text-[15.5px] font-bold text-ink">{s.label}</p>
                  <p className="text-[14px] leading-relaxed text-body">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
  }
}
