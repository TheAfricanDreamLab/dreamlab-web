'use client';

import { useActionState, useId, useRef, useState } from 'react';
import { type GoalFormState, saveLearningGoal } from '@/app/actions/engagement';
import { SubmitButton } from '@/components/auth/forms';
import { Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { toastSuccess } from '@/components/ui/toast';
import { DAYS, type GoalScope, type LearningGoal, planText, STUDY_DAY_LABELS, WEEKLY_PRESETS } from '@/lib/engagement';
import { formatMinutes } from '@/lib/learning';

/*
 * "Why I'm here" (LRN-9): a goal and a study plan in the learner's own words. Offered when they join a
 * cohort or enrol in a course, and kept on My programme or the course home until it is set. Shown back
 * to them later ("You said: …"), above all when they fall behind.
 */

const fieldClass =
  'w-full rounded-[var(--radius-field)] bg-card px-4 py-3 text-[15px] leading-relaxed text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[var(--shadow-focus)]';
const chipClass =
  'flex min-h-11 cursor-pointer select-none items-center justify-center rounded-full bg-card px-4 text-[14px] font-semibold text-ink ring-1 ring-line-strong hover:ring-line-heavy has-[:checked]:bg-forest has-[:checked]:text-white has-[:checked]:ring-forest has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

export function GoalForm({
  scope,
  enrollmentId,
  goal,
  onCancel,
  onSaved,
}: {
  scope: GoalScope;
  enrollmentId: string;
  goal: LearningGoal | null;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  // A save closes the form (the page reloads its data), so the confirmation goes to the app's toasts.
  const [state, action] = useActionState(async (prev: GoalFormState, fd: FormData) => {
    const next = await saveLearningGoal(prev, fd);
    if (next.saved && next.notice) {
      toastSuccess(next.notice);
      onSaved?.();
    }
    return next;
  }, {} as GoalFormState);
  const id = useId();
  const v = state.values;
  const f = state.fields ?? {};
  const initialWeekly = v?.minutesPerWeek ?? (goal ? ((WEEKLY_PRESETS as readonly number[]).includes(goal.minutesPerWeek) ? String(goal.minutesPerWeek) : 'other') : '120');
  const [weekly, setWeekly] = useState(initialWeekly);
  // Kept while the learner tries a preset and comes back to Other.
  const [hours, setHours] = useState(v?.otherHours ?? (goal && initialWeekly === 'other' ? String(goal.minutesPerWeek / 60) : ''));
  const [why, setWhy] = useState(v?.why ?? goal?.why ?? '');
  const days = v ? v.studyDays.split(',').filter(Boolean) : (goal?.studyDays ?? []);
  const whyLeft = 20 - why.trim().length;

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />

      <div className="space-y-1.5">
        <label htmlFor={`${id}-why`} className="text-[14px] font-semibold text-ink">
          Why are you doing this?
        </label>
        <p id={`${id}-why-hint`} className="text-[13px] text-muted">
          In your own words. We’ll show it to you on the days it’s hard to keep going.
        </p>
        <textarea
          id={`${id}-why`}
          name="why"
          rows={3}
          maxLength={600}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="For example: I want to turn my tailoring into a business that pays my family’s rent."
          aria-describedby={`${id}-why-hint ${id}-why-count`}
          aria-invalid={Boolean(f.why)}
          className={cx(fieldClass, f.why && 'ring-danger-line')}
        />
        <p id={`${id}-why-count`} className={cx('text-[12.5px]', f.why ? 'text-danger-ink' : 'text-muted')}>
          {f.why ?? (whyLeft > 0 ? `${whyLeft} more ${whyLeft === 1 ? 'character' : 'characters'} to go` : `${why.trim().length} of 600 characters`)}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-success`} className="text-[14px] font-semibold text-ink">
          What will finishing let you do? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-success`}
          name="success"
          rows={2}
          maxLength={300}
          defaultValue={v?.success ?? goal?.success ?? ''}
          placeholder="For example: pitch to a microfinance lender with a real plan."
          aria-invalid={Boolean(f.success)}
          className={cx(fieldClass, f.success && 'ring-danger-line')}
        />
        {f.success && <p className="text-[12.5px] text-danger-ink">{f.success}</p>}
      </div>

      <fieldset className="space-y-2" aria-describedby={f.studyDays ? `${id}-days-error` : undefined}>
        <legend className="text-[14px] font-semibold text-ink">Which days will you study?</legend>
        <div className="grid grid-cols-4 gap-2 min-[400px]:grid-cols-7">
          {DAYS.map((d) => (
            <label key={d} className={cx(chipClass, 'px-0')}>
              <input type="checkbox" name="studyDays" value={d} defaultChecked={days.includes(d)} className="sr-only" />
              <span aria-hidden>{STUDY_DAY_LABELS[d].short}</span>
              <span className="sr-only">{STUDY_DAY_LABELS[d].long}</span>
            </label>
          ))}
        </div>
        {f.studyDays && (
          <p id={`${id}-days-error`} className="text-[12.5px] text-danger-ink" role="alert">
            {f.studyDays}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-[14px] font-semibold text-ink">How much time a week?</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKLY_PRESETS.map((m) => (
            <label key={m} className={chipClass}>
              <input type="radio" name="minutesPerWeek" value={m} checked={weekly === String(m)} onChange={() => setWeekly(String(m))} className="sr-only" />
              {formatMinutes(m)}
            </label>
          ))}
          <label className={chipClass}>
            <input type="radio" name="minutesPerWeek" value="other" checked={weekly === 'other'} onChange={() => setWeekly('other')} className="sr-only" />
            Other
          </label>
        </div>
        {weekly === 'other' && (
          <div className="flex items-center gap-2">
            <label htmlFor={`${id}-hours`} className="text-[14px] text-body">
              Hours a week
            </label>
            <input
              id={`${id}-hours`}
              name="otherHours"
              type="number"
              inputMode="decimal"
              min={0.5}
              max={20}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              aria-invalid={Boolean(f.minutesPerWeek)}
              className={cx(fieldClass, 'h-11 w-24 py-0')}
            />
          </div>
        )}
        {f.minutesPerWeek && (
          <p className="text-[12.5px] text-danger-ink" role="alert">
            {f.minutesPerWeek}
          </p>
        )}
        <p className="text-[12.5px] text-muted">Be kind to yourself: a plan you can keep beats a big one.</p>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-time`} className="text-[14px] font-semibold text-ink">
          At what time? <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id={`${id}-time`}
          name="studyTime"
          type="time"
          defaultValue={v?.studyTime ?? goal?.studyTime ?? ''}
          aria-invalid={Boolean(f.studyTime)}
          className={cx(fieldClass, 'h-12 w-40 py-0')}
        />
        {f.studyTime && <p className="text-[12.5px] text-danger-ink">{f.studyTime}</p>}
      </div>

      <div aria-live="polite">{state.error && <Notice tone="error">{state.error}</Notice>}</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:w-56">
          <SubmitButton pending="Saving…" always={Boolean(state.error)}>
            {goal ? 'Save changes' : 'Save my plan'}
          </SubmitButton>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-11 rounded-[var(--radius-field)] px-4 text-[14px] font-semibold text-link hover:bg-success-tint">
            {goal ? 'Cancel' : 'Not now'}
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * The goal as a card: the form until it's set (opened when they've just joined), then "You said: …"
 * with a way to change it.
 */
export function GoalCard({
  scope,
  enrollmentId,
  goal,
  welcome = false,
  title,
  behind = false,
}: {
  scope: GoalScope;
  enrollmentId: string;
  goal: LearningGoal | null;
  /** Just enrolled or joined: say so, and open the form. */
  welcome?: boolean;
  /** What it's for, e.g. the cohort or course name. */
  title: string;
  /** Behind on pace: the goal comes first as a reminder. */
  behind?: boolean;
}) {
  // Which saved goal the form was opened to change: a save brings a newer one, which closes the form.
  const [editingFor, setEditingFor] = useState<string | null>(null);
  const [later, setLater] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const savedAt = goal?.updatedAt;
  const editing = !goal || editingFor === savedAt;

  if (!goal && later) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[14px] text-body">People who write down why they started are more likely to finish.</p>
        {/* Still the target of the checklist's "Set your goal" link. */}
        <button
          id={`goal-${enrollmentId}`}
          type="button"
          onClick={() => {
            setLater(false);
            requestAnimationFrame(() => heading.current?.focus());
          }}
          className="min-h-11 scroll-mt-24 rounded-full bg-card px-4 text-[14px] font-semibold text-link ring-1 ring-line-strong hover:ring-line-heavy"
        >
          Set your goal
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <section id={`goal-${enrollmentId}`} className="scroll-mt-24 space-y-4" aria-labelledby={`goal-heading-${enrollmentId}`}>
        <div className="space-y-1">
          <Eyebrow tone="gold">{goal ? (behind ? 'Remember why you started' : 'Your goal') : welcome ? 'Before you start' : 'Your goal'}</Eyebrow>
          <h3 id={`goal-heading-${enrollmentId}`} ref={heading} tabIndex={-1} className="text-[19px] font-bold focus:outline-none">
            {goal ? 'Why you’re here' : welcome ? `Welcome. What brings you to ${title}?` : 'Why are you here?'}
          </h3>
          {!goal && (
            <p className="text-[14px] text-muted">
              Two minutes now helps on the busy weeks later. Say why it matters to you and when you’ll make time. You can change it whenever you like.
            </p>
          )}
        </div>

        {goal && !editing ? (
          <div className="space-y-3">
            <blockquote className="border-l-4 border-gold-line pl-4 text-[15px] leading-relaxed text-ink">
              <p>
                <span className="text-muted">You said: </span>“{goal.why}”
              </p>
              {goal.success && (
                <p className="mt-1 text-[14px] text-body">
                  <span className="text-muted">What finishing will let you do: </span>“{goal.success}”
                </p>
              )}
            </blockquote>
            <p className="text-[13.5px] text-body">
              <span className="font-semibold text-ink">Your plan:</span> {planText(goal)}
            </p>
            <button
              type="button"
              onClick={() => setEditingFor(savedAt ?? null)}
              className="min-h-11 rounded-full bg-card px-4 text-[14px] font-semibold text-link ring-1 ring-line-strong hover:ring-line-heavy"
            >
              Change goal or plan
            </button>
          </div>
        ) : (
          <GoalForm key={savedAt ?? 'new'} scope={scope} enrollmentId={enrollmentId} goal={goal} onCancel={goal ? () => setEditingFor(null) : () => setLater(true)}
            onSaved={() => setTimeout(() => heading.current?.focus(), 100)}
          />
        )}
      </section>
    </Card>
  );
}
