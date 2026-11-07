'use client';

import type { Block } from '@dreamlab/contracts';
import { InteractiveBlock } from '@/components/learning/interactive-blocks';
import { StepBlocks } from '@/components/learning/step-blocks';

/** A lesson step or quiz as learners receive it. Answers aren't checked in a preview. */
export function PreviewBlocks({ blocks }: { blocks: Block[] }) {
  const onCheck = async () => 'Answers are checked once the course is published. In a preview, nothing is saved.';
  return (
    <div className="space-y-6">
      <StepBlocks blocks={blocks} settled={() => false} render={(b) => <InteractiveBlock block={b} onCheck={onCheck} />} />
    </div>
  );
}
