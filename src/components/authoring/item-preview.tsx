'use client';

import { type Block, BlockAuthoringSchema, toDeliveryBlock } from '@dreamlab/contracts';
import type { ReactNode } from 'react';
import { ItemIcon } from '@/components/learning/course-ui';
import { RichText } from '@/components/learning/rich-text';
import { cx } from '@/components/ui/primitives';
import { type ItemDoc, type ModuleDoc, records } from '@/lib/authoring';
import { BLOCK_INFO, type BlockDoc } from '@/lib/blocks';
import { ITEM_NAMES } from '@/lib/course-outline';
import { InteractiveBlock } from '@/components/learning/interactive-blocks';
import { StepBlocks } from '@/components/learning/step-blocks';
import { PreviewBlocks } from './preview-blocks';

/*
 * The live preview beside the editor (CAT-5): the selected item as learners will see it, updated as
 * you type. Blocks that aren't finished yet show a placeholder instead of breaking the preview.
 */

function delivered(blocks: unknown): (Block | { unfinished: true; id: string })[] {
  return records<BlockDoc>(blocks).map((b, i) => {
    const parsed = BlockAuthoringSchema.safeParse(b);
    return parsed.success ? toDeliveryBlock(parsed.data, 'preview') : { unfinished: true as const, id: `${typeof b.id === 'string' ? b.id : 'block'}-${i}` };
  });
}

type Commenting = { onComment?: (blockId: string, label: string) => void; commentCount?: (blockId: string) => number };

const previewCheck = async () => 'Answers are checked once the course is published. In a preview, nothing is saved.';

function Blocks({ blocks, onComment, commentCount }: { blocks: unknown } & Commenting) {
  const list = delivered(blocks);
  if (list.length === 0) return <p className="text-[14px] text-muted">Nothing here yet.</p>;
  // Reviewers comment on what learners will see (CAT-6).
  const withComments = (b: Block, body: ReactNode) => {
    if (!onComment) return body;
    const count = commentCount?.(b.id) ?? 0;
    const label = BLOCK_INFO[b.type as keyof typeof BLOCK_INFO]?.label ?? 'Block';
    return (
      <div className="group/blk relative rounded-lg focus-within:ring-2 focus-within:ring-primary/30 hover:ring-1 hover:ring-[#cfe0f2]">
        {body}
        <button
          type="button"
          onClick={() => onComment(b.id, label)}
          className={cx(
            'absolute -top-3 right-1 inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11.5px] font-semibold text-[#1c4673] shadow-sm ring-1 ring-[#cfe0f2] transition-opacity focus:opacity-100',
            count ? 'opacity-100' : 'opacity-0 group-hover/blk:opacity-100',
          )}
        >
          Comment{count ? ` · ${count}` : ''}
          <span className="sr-only"> on this {label.toLowerCase()}</span>
        </button>
      </div>
    );
  };
  // A finished step plays as learners get it, videos asking their questions included.
  const finished = list.filter((b): b is Block => !('unfinished' in b));
  if (finished.length === list.length) {
    return (
      <div className="space-y-6">
        <StepBlocks blocks={finished} settled={() => false} render={(b) => <InteractiveBlock block={b} onCheck={previewCheck} />} wrap={withComments} />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {list.map((b) => {
        if ('unfinished' in b) {
          return (
            <p key={b.id} className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-center text-[13px] text-muted">
              A block still being written
            </p>
          );
        }
        return <div key={b.id}>{withComments(b, <PreviewBlocks blocks={[b]} />)}</div>;
      })}
    </div>
  );
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');

export function ItemPreview({
  module: mod,
  moduleIndex,
  item,
  device,
  onComment,
  commentCount,
}: { module: ModuleDoc; moduleIndex: number; item: ItemDoc; device: 'phone' | 'laptop' } & Commenting) {
  const p = item.payload as Record<string, unknown>;
  const steps = records<{ id?: unknown; title?: unknown; blocks?: unknown }>(p.steps);
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
          <section key={`${i}-${String(s.id)}`} className="space-y-4 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-gold-ink">
              Step {i + 1} of {steps.length}
              {typeof s.title === 'string' && s.title ? ` · ${s.title}` : ''}
            </p>
            <Blocks blocks={s.blocks} onComment={onComment} commentCount={commentCount} />
          </section>
        ))}

      {item.type === 'quiz' && (
        <section className="space-y-4">
          {text(p.intro) && <RichText text={text(p.intro)} />}
          <p className="text-[13px] text-muted">
            Pass mark {typeof p.passPct === 'number' ? p.passPct : 70}% · {typeof p.maxAttempts === 'number' ? `${p.maxAttempts} attempts` : 'unlimited attempts'}
          </p>
          <Blocks blocks={p.questions} onComment={onComment} commentCount={commentCount} />
        </section>
      )}

      {item.type === 'assignment' && (
        <section className="space-y-4 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
          {text(p.brief) && <RichText text={text(p.brief)} />}
          {Array.isArray(p.steps) && p.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-[14.5px] text-body">
              {p.steps.filter((st): st is string => typeof st === 'string').map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
          )}
          {records(p.rubric).length > 0 && (
            <div className="space-y-1">
              <p className="text-[13px] font-semibold text-ink">How it’s marked</p>
              <ul className="space-y-1 text-[13.5px] text-body">
                {records<{ criterion?: unknown; description?: unknown }>(p.rubric).map((r, i) => (
                  <li key={i}>
                    <strong className="text-ink">{text(r.criterion)}</strong> — {text(r.description)}
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
