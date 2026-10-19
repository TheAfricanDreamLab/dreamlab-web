'use client';

import { useActionState, useState } from 'react';
import { submitAssignment, type SubmissionState } from '@/app/actions/learning';
import { SubmitButton } from '@/components/auth/forms';
import { cx, Notice } from '@/components/ui/primitives';
import { type AssignmentContent, wordCount } from '@/lib/learning';

export function AssignmentForm({
  enrollmentId,
  itemId,
  assignment,
  previous,
}: {
  enrollmentId: string;
  itemId: string;
  assignment: AssignmentContent;
  previous: { text: string; link: string | null; selfAssessment: Record<string, boolean>; version: number } | null;
}) {
  const [state, action] = useActionState(submitAssignment, {} as SubmissionState);
  const [text, setText] = useState(state.values?.text ?? previous?.text ?? assignment.template ?? '');
  const words = wordCount(text);
  const min = assignment.minWords ?? 0;
  const enough = words >= Math.max(1, min);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="itemId" value={itemId} />

      <fieldset className="space-y-2 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
        <legend className="float-left mb-2 w-full font-display text-[17px] font-bold text-ink">Check your work against the rubric</legend>
        <p className="clear-both text-[13px] text-muted">Tick each one you believe you’ve met. Faculty use the same rubric.</p>
        {assignment.rubric.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line has-[:checked]:ring-primary">
            <input type="checkbox" name="criteria" value={r.id} defaultChecked={previous?.selfAssessment[r.id] ?? false} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)]" />
            <span>
              <span className="block text-[14.5px] font-semibold text-ink">{r.criterion}</span>
              <span className="block text-[13px] leading-relaxed text-body">{r.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="assignment-text" className="text-[13px] font-semibold text-ink">
          Your submission
        </label>
        <textarea
          id="assignment-text"
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          maxLength={30000}
          required
          aria-describedby="assignment-count"
          className="w-full rounded-[var(--radius-field)] bg-card p-4 font-[inherit] text-[15px] leading-relaxed text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p id="assignment-count" className={cx('font-mono text-[11.5px]', enough ? 'text-link' : 'text-muted')}>
          {words} words{min > 0 ? ` · at least ${min}` : ''}
          {enough && ' ✓'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="assignment-link" className="text-[13px] font-semibold text-ink">
          Link (optional)
        </label>
        <input
          id="assignment-link"
          name="link"
          type="url"
          inputMode="url"
          maxLength={500}
          defaultValue={state.values?.link ?? previous?.link ?? ''}
          placeholder="https://docs.google.com/…"
          className="h-12 w-full rounded-[var(--radius-field)] bg-card px-4 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-[12.5px] text-muted">A document, slides or a video, if your work lives somewhere else too.</p>
      </div>

      <div aria-live="polite" className="space-y-3 empty:hidden">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.notice && <Notice tone="success">{state.notice}</Notice>}
      </div>
      {enough ? (
        <SubmitButton pending="Submitting…">{previous || state.submission ? 'Submit a new version' : 'Submit for review'}</SubmitButton>
      ) : (
        <button type="button" disabled className="h-12 w-full cursor-not-allowed rounded-[var(--radius-field)] bg-line-heavy px-5 text-[15px] font-semibold text-white">
          Write at least {min} words to submit
        </button>
      )}
    </form>
  );
}
