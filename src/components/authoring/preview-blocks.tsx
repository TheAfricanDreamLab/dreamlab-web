'use client';

import type { Block } from '@dreamlab/contracts';
import { InteractiveBlock, isInteractive } from '@/components/learning/interactive-blocks';
import { isTeachingBlock, TeachingBlock } from '@/components/learning/teaching-blocks';

/** A lesson step or quiz as learners receive it. Answers aren't checked in a preview. */
export function PreviewBlocks({ blocks }: { blocks: Block[] }) {
  const onCheck = async () => 'Answers are checked once the course is published. In a preview, nothing is saved.';
  return (
    <div className="space-y-6">
      {blocks.map((b) =>
        isTeachingBlock(b) ? <TeachingBlock key={b.id} block={b} /> : isInteractive(b) ? <InteractiveBlock key={b.id} block={b} onCheck={onCheck} /> : null,
      )}
    </div>
  );
}
