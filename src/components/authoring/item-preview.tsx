'use client';

import { type Block, BlockAuthoringSchema, toDeliveryBlock } from '@dreamlab/contracts';
import { ItemIcon } from '@/components/learning/course-ui';
import { RichText } from '@/components/learning/rich-text';
import { cx } from '@/components/ui/primitives';
import type { ItemDoc, ModuleDoc } from '@/lib/authoring';
import type { BlockDoc } from '@/lib/blocks';
import { ITEM_NAMES } from '@/lib/course-outline';
import { PreviewBlocks } from './preview-blocks';

/*
 * The live preview beside the editor (CAT-5): the selected item as learners will see it, updated as
 * you type. Blocks that aren't finished yet show a placeholder instead of breaking the preview.
 */

function delivered(blocks: unknown): (Block | { unfinished: true; id: string })[] {
  return (Array.isArray(blocks) ? (blocks as BlockDoc[]) : []).map((b, i) => {
    const parsed = BlockAuthoringSchema.safeParse(b);
    return parsed.success ? toDeliveryBlock(parsed.data, 'preview') : { unfinished: true as const, id: `${b?.id ?? 'block'}-${i}` };
  });
}

function Blocks({ blocks }: { blocks: unknown }) {
  const list = delivered(blocks);
  if (list.length === 0) return <p className="text-[14px] text-muted">Nothing here yet.</p>;
  return (
    <div className="space-y-6">
      {list.map((b) =>
        'unfinished' in b ? (
          <p key={b.id} className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-center text-[13px] text-muted">
            A block still being written
          </p>
        ) : (
          <PreviewBlocks key={b.id} blocks={[b]} />
        ),
      )}
    </div>
  );
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');

export function ItemPreview({ module: mod, moduleIndex, item, device }: { module: ModuleDoc; moduleIndex: number; item: ItemDoc; device: 'phone' | 'laptop' }) {
  const p = item.payload as Record<string, unknown>;
  const steps = (Array.isArray(p.steps) ? p.steps : []) as { id: string; title?: string; blocks: unknown }[];
  return (
    <div className={cx('mx-auto space-y-5', device === 'phone' ? 'max-w-[390px] text-[15px]' : 'max-w-none')}>
      <header className="space-y-1">
        <p className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          <ItemIcon type={item.type} className="h-3.5 w-3.5" />
          Module {moduleIndex + 1}
          {mod.title ? ` · ${mod.title}` : ''} · {item.minutes} min
        </p>
        <h2 className="font-display text-[22px] font-extrabold leading-tight text-ink">{item.title || `Untitled ${ITEM_NAMES[item.type].toLowerCase()}`}</h2>
      </header>

      {item.type === 'lesson' &&
        steps.map((s, i) => (
          <section key={`${i}-${s.id}`} className="space-y-4 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-gold-ink">
              Step {i + 1} of {steps.length}
              {s.title ? ` · ${s.title}` : ''}
            </p>
            <Blocks blocks={s.blocks} />
          </section>
        ))}

      {item.type === 'quiz' && (
        <section className="space-y-4">
          {text(p.intro) && <RichText text={text(p.intro)} />}
          <p className="text-[13px] text-muted">
            Pass mark {typeof p.passPct === 'number' ? p.passPct : 70}% · {typeof p.maxAttempts === 'number' ? `${p.maxAttempts} attempts` : 'unlimited attempts'}
          </p>
          <Blocks blocks={p.questions} />
        </section>
      )}

      {item.type === 'assignment' && (
        <section className="space-y-4 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
          {text(p.brief) && <RichText text={text(p.brief)} />}
          {Array.isArray(p.steps) && p.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-[14.5px] text-body">
              {(p.steps as string[]).map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
          )}
          {Array.isArray(p.rubric) && p.rubric.length > 0 && (
            <div className="space-y-1">
              <p className="text-[13px] font-semibold text-ink">How it’s marked</p>
              <ul className="space-y-1 text-[13.5px] text-body">
                {(p.rubric as { criterion: string; description: string }[]).map((r, i) => (
                  <li key={i}>
                    <strong className="text-ink">{r.criterion}</strong> — {r.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {item.type === 'discussion' && (
        <section className="space-y-3 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
          {text(p.prompt) && <RichText text={text(p.prompt)} />}
          {text(p.guidance) && <p className="text-[13.5px] text-muted">{text(p.guidance)}</p>}
        </section>
      )}
    </div>
  );
}
