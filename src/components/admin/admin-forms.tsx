'use client';

import type { UserStatus } from '@dreamlab/contracts';
import { useActionState, useState } from 'react';
import { importContent, setUserStatus } from '@/app/actions/platform';
import { SubmitButton } from '@/components/auth/forms';
import { Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { NoticeToast } from '@/components/ui/toast';

export function ImportForm() {
  const [state, action] = useActionState(importContent, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-semibold text-ink">What’s in the file</legend>
        <div className="grid gap-2 min-[400px]:grid-cols-2">
          {[
            { value: 'course', label: 'A course', hint: 'Course file (CourseAuthoring)' },
            { value: 'program', label: 'A programme', hint: 'Its courses must exist first' },
          ].map((k) => (
            <label key={k.value} className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-field)] bg-card px-3 py-2.5 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary">
              <input type="radio" name="kind" value={k.value} defaultChecked={(state.values?.kind ?? 'course') === k.value} className="mt-1 accent-[var(--color-primary)]" />
              <span>
                <span className="block text-[13.5px] font-semibold text-ink">{k.label}</span>
                <span className="block text-[12.5px] text-muted">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="import-file" className="text-[13px] font-semibold text-ink">
          JSON file
        </label>
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".json,application/json"
          required
          className="block w-full rounded-[var(--radius-field)] bg-card text-[14px] text-body ring-1 ring-line-strong file:mr-3 file:h-11 file:border-0 file:bg-surface file:px-4 file:font-semibold file:text-ink"
        />
        <p className="text-[12.5px] text-muted">Changed content is published as a new version. Learners already enrolled keep their version.</p>
      </div>
      <div aria-live="polite" className="space-y-2 empty:hidden">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <NoticeToast state={state} />
      </div>
      <SubmitButton pending="Importing…">Import</SubmitButton>
    </form>
  );
}

type Choice = { value: UserStatus; label: string; hint: string };

/** What a platform admin can do from each standing (PLT-2). */
const CHOICES: Record<UserStatus, Choice[]> = {
  active: [
    { value: 'suspended', label: 'Suspend', hint: 'Keep them out for a while' },
    { value: 'banned', label: 'Ban', hint: 'Close the account for breaking the rules' },
  ],
  suspended: [
    { value: 'active', label: 'Let them back in', hint: 'End the suspension now' },
    { value: 'suspended', label: 'Change the suspension', hint: 'A new end date or message' },
    { value: 'banned', label: 'Ban', hint: 'Close the account' },
  ],
  banned: [{ value: 'active', label: 'Reinstate', hint: 'Lift the ban' }],
};

const DURATIONS = [
  { days: '1', label: '1 day' },
  { days: '3', label: '3 days' },
  { days: '7', label: '1 week' },
  { days: '30', label: '30 days' },
  { days: '90', label: '90 days' },
  { days: '', label: 'Until I lift it' },
];

const FIELD = 'w-full rounded-[var(--radius-field)] bg-card p-3 text-[14px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary';

/** Suspend (for a while or until lifted), ban, or reinstate someone, with a reason and an optional message. */
export function UserStatusForm({ userId, status, name }: { userId: string; status: UserStatus; name: string }) {
  const [state, action] = useActionState(setUserStatus, {} as FormState);
  const choices = CHOICES[status];
  const [picked, setChoice] = useState<UserStatus | null>(null);
  // After a save the standing changes: fall back to the first thing the new standing allows.
  const choice = picked && choices.some((c) => c.value === picked) ? picked : choices[0]!.value;
  const leaving = choice !== 'active';
  const submit =
    choice === 'banned' ? `Ban ${name}` : choice === 'suspended' ? (status === 'suspended' ? 'Update the suspension' : `Suspend ${name}`) : status === 'banned' ? `Reinstate ${name}` : `Let ${name} back in`;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      {choices.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-semibold text-ink">What to do</legend>
          <div className="grid gap-2">
            {choices.map((c) => (
              <label key={c.label} className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-field)] bg-card px-3 py-2.5 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary">
                <input type="radio" name="status" value={c.value} checked={choice === c.value} onChange={() => setChoice(c.value)} className="mt-1 accent-[var(--color-primary)]" />
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">{c.label}</span>
                  <span className="block text-[12.5px] text-muted">{c.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="status" value={choice} />
      )}

      {choice === 'suspended' && (
        <div className="space-y-1.5">
          <label htmlFor="status-days" className="text-[13px] font-semibold text-ink">
            For how long
          </label>
          <select id="status-days" name="days" defaultValue={state.values?.days ?? '7'} className="h-11 w-full rounded-[var(--radius-field)] bg-card px-3 text-[14px] text-ink ring-1 ring-line-strong">
            {DURATIONS.map((d) => (
              <option key={d.label} value={d.days}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="text-[12.5px] text-muted">It lifts by itself at the end. You can let them back in sooner.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="status-reason" className="text-[13px] font-semibold text-ink">
          Reason (for the audit trail)
        </label>
        <textarea
          id="status-reason"
          name="reason"
          required
          minLength={3}
          maxLength={500}
          rows={3}
          defaultValue={state.values?.reason}
          placeholder={leaving ? 'e.g. Reported for spam; confirmed by support' : 'e.g. Appeal accepted after a call with the learner'}
          className={FIELD}
        />
        <p className="text-[12.5px] text-muted">Only platform admins see this.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="status-message" className="text-[13px] font-semibold text-ink">
          Message to {name} <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="status-message"
          name="message"
          maxLength={500}
          rows={2}
          defaultValue={state.values?.message}
          placeholder={leaving ? 'e.g. Please read the community guidelines before you return.' : 'e.g. Welcome back. Thanks for your patience.'}
          className={FIELD}
        />
        <p className="text-[12.5px] text-muted">{leaving ? 'They see it in the email and when they try to sign in.' : 'Included in the email.'}</p>
      </div>

      <label className="flex items-center gap-2 text-[13.5px] text-body">
        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-[var(--color-primary)]" />
        Email {name} about it
      </label>

      <div aria-live="polite" className="space-y-2 empty:hidden">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <NoticeToast state={state} />
      </div>
      <SubmitButton variant={leaving ? 'danger' : 'primary'} pending="Saving…">
        {submit}
      </SubmitButton>
      {leaving && (
        <p className="text-[12.5px] text-muted">
          {choice === 'banned'
            ? 'They’ll be signed out on every device at once and can’t sign in again unless a platform admin reinstates them.'
            : 'They’ll be signed out on every device at once. Their work and progress are kept.'}
        </p>
      )}
    </form>
  );
}
