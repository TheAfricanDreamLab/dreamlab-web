'use client';

import type { PreviewItem } from '@dreamlab/contracts';
import { InteractiveBlock } from './interactive-blocks';
import { RichText } from './rich-text';
import { StepBlocks } from './step-blocks';

/** A free-preview item (CAT-6): what learners get, with questions that ask the visitor to enrol to have them checked. */
export function PreviewItemView({ preview }: { preview: PreviewItem }) {
  const onCheck = async () => 'Enrol in the course to have your answers checked and your progress kept. It’s free.';
  const c = preview.content;
  const render = (b: Parameters<typeof InteractiveBlock>[0]['block']) => <InteractiveBlock block={b} onCheck={onCheck} />;
  if (c.type === 'lesson') {
    return (
      <div className="space-y-10">
        {c.steps.map((s, i) => (
          <section key={s.id} className="space-y-6" aria-label={`Step ${i + 1}`}>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-gold-ink">
              Step {i + 1} of {c.steps.length}
              {s.title ? ` · ${s.title}` : ''}
            </p>
            {s.title && <h2 className="text-[24px] font-extrabold leading-tight">{s.title}</h2>}
            <StepBlocks blocks={s.blocks} render={render} settled={() => false} />
          </section>
        ))}
      </div>
    );
  }
  if (c.type === 'quiz') {
    return (
      <div className="space-y-6">
        <RichText text={c.intro} size="lg" />
        <p className="text-[13.5px] text-muted">
          {c.questions.length} questions · pass mark {c.passPct}%
        </p>
        <StepBlocks blocks={c.questions} render={render} settled={() => false} />
      </div>
    );
  }
  if (c.type === 'assignment') {
    return (
      <div className="space-y-5">
        <RichText text={c.brief} size="lg" />
        <ol className="list-decimal space-y-1 pl-5 text-[15px] text-body">
          {c.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <p className="text-[13.5px] text-muted">Enrolled learners submit their work here and get feedback against the rubric.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <RichText text={c.prompt} size="lg" />
      {c.guidance && <p className="text-[14px] text-muted">{c.guidance}</p>}
      <p className="text-[13.5px] text-muted">Enrolled learners post their answer and read each other’s.</p>
    </div>
  );
}
