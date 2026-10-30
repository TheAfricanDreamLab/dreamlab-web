'use client';

import type { BlockResponse, BlockResult, ItemState } from '@dreamlab/contracts';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { checkBlock, saveProgress } from '@/app/actions/learning';
import { cx, Notice } from '@/components/ui/primitives';
import { isSettled, type LessonStep } from '@/lib/learning';
import { InteractiveBlock, isInteractive } from './interactive-blocks';
import { isTeachingBlock, TeachingBlock } from './teaching-blocks';

type Nav = { id: string; title: string } | null;

/** One step at a time, Brilliant style: answer what's on the step, then continue. */
export function LessonPlayer({
  enrollmentId,
  itemId,
  courseSlug,
  title,
  minutes,
  steps,
  initial,
  completed,
  next,
}: {
  enrollmentId: string;
  itemId: string;
  courseSlug: string;
  title: string;
  minutes: number;
  steps: LessonStep[];
  initial: ItemState;
  completed: boolean;
  next: Nav;
}) {
  const router = useRouter();
  const last = steps.length - 1;
  const [furthest, setFurthest] = useState(Math.min(initial.stepIndex, last));
  const [current, setCurrent] = useState(completed ? 0 : Math.min(initial.stepIndex, last));
  const [results, setResults] = useState<Record<string, BlockResult>>(initial.results ?? {});
  const [responses, setResponses] = useState<Record<string, BlockResponse>>(initial.responses ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const step = steps[current]!;
  const open = step.blocks.filter(isInteractive).filter((b) => !isSettled(results[b.id]));
  const canContinue = open.length === 0;
  const questions = steps.reduce((n, s) => n + s.blocks.filter(isInteractive).length, 0);

  const go = (index: number) => {
    setCurrent(index);
    setError(null);
    top.current?.scrollIntoView({ block: 'start' });
    top.current?.focus({ preventScroll: true });
  };

  const check = (blockId: string) => async (response: BlockResponse) => {
    const res = await checkBlock(enrollmentId, itemId, blockId, response);
    if (!res.ok) return res.error;
    setResults((r) => ({ ...r, [blockId]: res.data }));
    setResponses((r) => ({ ...r, [blockId]: response }));
    return null;
  };

  const forward = async () => {
    if (current < last) {
      const target = current + 1;
      if (target > furthest) {
        setFurthest(target);
        // Saving the place is best effort: a dropped connection should not stop the learner.
        saveProgress(enrollmentId, itemId, target).catch(() => undefined);
      }
      go(target);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await saveProgress(enrollmentId, itemId, last, true).catch(() => ({ ok: false as const, error: 'We couldn’t reach the server. Check your connection and try again.' }));
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    if (res.data.courseCompleted) router.push(`/courses/${courseSlug}?completed=1`);
    else if (next) router.push(`/learn/${enrollmentId}/${next.id}`);
    else router.push(`/learn/${enrollmentId}`);
  };

  return (
    <div className="space-y-6">
      <div ref={top} tabIndex={-1} className="scroll-mt-24 space-y-2 focus:outline-none">
        <ol className="flex gap-1" aria-label={`Step ${current + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                onClick={() => go(i)}
                disabled={i > furthest}
                aria-current={i === current ? 'step' : undefined}
                aria-label={`Step ${i + 1}${s.title ? `: ${s.title}` : ''}${i > furthest ? ' (not reached yet)' : ''}`}
                className={cx(
                  'block h-2 w-full rounded-full transition-colors disabled:cursor-default',
                  i === current ? 'bg-primary ring-2 ring-success-line' : i <= furthest ? 'bg-primary/55 hover:bg-primary' : 'bg-line',
                )}
              />
            </li>
          ))}
        </ol>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          Step {current + 1} of {steps.length}
          {step.title ? ` · ${step.title}` : ''}
        </p>
      </div>

      {current === 0 && (
        <section aria-label="About this lesson" className="flex items-start gap-3 rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success-tint font-display text-[15px] font-bold text-link ring-1 ring-success-line">
            i
          </span>
          <div className="space-y-0.5">
            <p className="text-[14.5px] font-semibold text-ink">{title}</p>
            <p className="text-[13px] text-muted">
              {minutes} min · {steps.length} {steps.length === 1 ? 'step' : 'steps'}
              {questions > 0 && ` · ${questions} ${questions === 1 ? 'question' : 'questions'} to try in this lesson`}
            </p>
            <p className="text-[13px] leading-relaxed text-body">Read and watch first, then have a go. A wrong answer is fine: you’ll see why, and try again.</p>
          </div>
        </section>
      )}

      <div key={step.id} className="animate-rise space-y-6">
        {step.title && <h2 className="text-[24px] font-extrabold leading-tight">{step.title}</h2>}
        {step.blocks.map((b) =>
          isInteractive(b) ? (
            <InteractiveBlock key={b.id} block={b} result={results[b.id]} response={responses[b.id]} onCheck={check(b.id)} />
          ) : isTeachingBlock(b) ? (
            <TeachingBlock key={b.id} block={b} />
          ) : null,
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-page/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex items-center gap-3">
          {current > 0 && (
            <button type="button" onClick={() => go(current - 1)} className="h-12 rounded-[var(--radius-field)] bg-card px-4 text-[15px] font-semibold text-ink ring-1 ring-line-strong hover:ring-line-heavy">
              <span aria-hidden>←</span> Back
            </button>
          )}
          <button
            type="button"
            onClick={forward}
            disabled={!canContinue || busy}
            className="h-12 flex-1 rounded-[var(--radius-field)] bg-primary px-5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-heavy"
          >
            {busy ? 'Saving…' : current < last ? 'Continue' : completed ? (next ? 'Next' : 'Back to the course') : 'Complete lesson'}
          </button>
        </div>
        {!canContinue && (
          <p className="mt-2 text-center text-[12.5px] text-muted">
            {open.length === 1 ? 'Answer the question above to continue.' : `Answer the ${open.length} questions above to continue.`}
          </p>
        )}
      </div>
    </div>
  );
}
