'use client';

import type { Block } from '@dreamlab/contracts';
import { type ReactNode, useState } from 'react';
import { formatClock } from '@/lib/media';
import { isInteractive } from './interactive-blocks';
import type { VideoQuestion } from './library-video';
import { isTeachingBlock, TeachingBlock } from './teaching-blocks';

type Interactive = Extract<Block, { type: 'choice' | 'order' | 'match' | 'poll' | 'scale' | 'reflection' | 'scenario' }>;

/**
 * A lesson step's blocks, for the lesson player, previews and free previews (CAT-6). A question set
 * to come up during a library video is asked there, and also stays reachable here (in case the video
 * can't be played), so the step can always be finished.
 */
export function StepBlocks({ blocks, render, settled }: { blocks: Block[]; render: (b: Interactive) => ReactNode; settled: (blockId: string) => boolean }) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const during = new Map<string, number>();
  for (const b of blocks) {
    if (b.type !== 'video' || b.provider !== 'library') continue;
    for (const p of b.pauses ?? []) {
      const q = byId.get(p.blockId);
      if (q && isInteractive(q) && !during.has(p.blockId)) during.set(p.blockId, p.atS);
    }
  }
  return (
    <>
      {blocks.map((b) => {
        if (isInteractive(b)) {
          const at = during.get(b.id);
          return at === undefined ? <div key={b.id}>{render(b)}</div> : <AskedInVideo key={b.id} at={at} done={settled(b.id)} node={render(b)} />;
        }
        if (!isTeachingBlock(b)) return null;
        const questions: VideoQuestion[] | undefined =
          b.type === 'video' && b.provider === 'library'
            ? (b.pauses ?? []).flatMap((p) => {
                const q = byId.get(p.blockId);
                return q && isInteractive(q) && during.get(q.id) === p.atS ? [{ atS: p.atS, blockId: q.id, settled: settled(q.id), node: render(q) }] : [];
              })
            : undefined;
        return <TeachingBlock key={b.id} block={b} questions={questions} />;
      })}
    </>
  );
}

function AskedInVideo({ at, done, node }: { at: number; done: boolean; node: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3 rounded-[var(--radius-card)] bg-surface p-3 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] text-body">
          <span aria-hidden className={done ? 'text-primary' : 'text-gold-ink'}>
            {done ? '✓ ' : '● '}
          </span>
          {done ? `Answered: the question at ${formatClock(at)} in the video` : `A question comes up at ${formatClock(at)} in the video`}
        </p>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-[13px] font-semibold text-link hover:underline">
          {open ? 'Hide it' : done ? 'See it again' : 'Answer it here instead'}
        </button>
      </div>
      {open && node}
    </div>
  );
}
