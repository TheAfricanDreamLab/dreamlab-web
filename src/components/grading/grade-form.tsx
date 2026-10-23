'use client';

import { useActionState, useState } from 'react';
import { gradeSubmission } from '@/app/actions/grading';
import { Button, cx, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { RUBRIC_LEVELS, RUBRIC_MAX_LEVEL } from '@/lib/grading';

type Criterion = { id: string; criterion: string; description: string };

/** The rubric as radio rows (0–4 per criterion), feedback, and Save draft / Release. */
export function GradeForm({
  submissionId,
  rubric,
  initial,
  selfAssessment,
  disabled,
}: {
  submissionId: string;
  rubric: Criterion[];
  initial: { rubricScores: Record<string, number>; feedback: string | null } | null;
  selfAssessment: Record<string, boolean>;
  disabled?: string;
}) {
  const [state, action, pending] = useActionState(gradeSubmission, {} as FormState);
  const [levels, setLevels] = useState<Record<string, number>>(initial?.rubricScores ?? {});
  const scored = rubric.filter((r) => levels[r.id] !== undefined);
  const pct = scored.length === rubric.length ? Math.round((rubric.reduce((n, r) => n + levels[r.id]!, 0) / (rubric.length * RUBRIC_MAX_LEVEL)) * 100) : null;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="submissionId" value={submissionId} />
      {rubric.map((r) => (
        <fieldset key={r.id} className="space-y-2" disabled={!!disabled}>
          <input type="hidden" name="criterion" value={r.id} />
          <legend className="w-full space-y-0.5">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-ink">{r.criterion}</span>
              {selfAssessment[r.id] && <span className="text-[12px] text-muted">Learner says: met</span>}
            </span>
            <span className="block text-[13px] text-muted">{r.description}</span>
          </legend>
          <div className="grid grid-cols-5 gap-1.5">
            {RUBRIC_LEVELS.map((l) => (
              <label
                key={l.level}
                className={cx(
                  'flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-field)] px-1 py-1.5 text-center ring-1 ring-line has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                  l.level >= 3 ? 'has-[:checked]:bg-primary' : l.level === 2 ? 'has-[:checked]:bg-gold-ink' : 'has-[:checked]:bg-muted',
                )}
                title={l.label}
              >
                <input
                  type="radio"
                  name={`rubric:${r.id}`}
                  value={l.level}
                  // Controlled: React resets uncontrolled fields after an action, which would clear the rubric on an error.
                  checked={levels[r.id] === l.level}
                  onChange={() => setLevels((v) => ({ ...v, [r.id]: l.level }))}
                  className="sr-only"
                  aria-label={`${r.criterion}: ${l.label}`}
                />
                <span className="font-display text-[15px] font-bold">{l.level}</span>
                <span className="text-[10.5px] leading-tight max-sm:hidden">{l.short}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="space-y-1.5">
        <label htmlFor="grade-feedback" className="text-[13px] font-semibold text-ink">
          Feedback for the learner
        </label>
        <textarea
          id="grade-feedback"
          name="feedback"
          rows={6}
          maxLength={4000}
          disabled={!!disabled}
          defaultValue={state.values?.feedback ?? initial?.feedback ?? ''}
          placeholder="What worked, and the one thing to improve next."
          className="w-full rounded-[var(--radius-field)] bg-card px-4 py-3 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <p className="text-[14px] text-muted" aria-live="polite">
        {pct === null ? `Score ${rubric.length - scored.length} more ${rubric.length - scored.length === 1 ? 'criterion' : 'criteria'} to see the grade.` : <>Grade: <strong className="text-ink">{pct}%</strong></>}
      </p>
      {disabled && <Notice tone="neutral">{disabled}</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      {!disabled && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>
            Save draft
          </Button>
          <Button type="submit" name="intent" value="release" disabled={pending}>
            {pending ? 'Saving…' : 'Release grade'}
          </Button>
        </div>
      )}
    </form>
  );
}
