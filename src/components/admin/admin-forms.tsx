'use client';

import { useActionState } from 'react';
import { importContent, setUserStatus } from '@/app/actions/platform';
import { SubmitButton } from '@/components/auth/forms';
import { Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

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
        {state.notice && <Notice tone="success">{state.notice}</Notice>}
      </div>
      <SubmitButton pending="Importing…">Import</SubmitButton>
    </form>
  );
}

export function UserStatusForm({ userId, status, name }: { userId: string; status: 'active' | 'suspended'; name: string }) {
  const [state, action] = useActionState(setUserStatus, {} as FormState);
  const suspending = status === 'active';
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={suspending ? 'suspended' : 'active'} />
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
          placeholder={suspending ? 'e.g. Reported for spam; confirmed by support' : 'e.g. Identity confirmed with the learner'}
          className="w-full rounded-[var(--radius-field)] bg-card p-3 text-[14px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div aria-live="polite" className="space-y-2 empty:hidden">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.notice && <Notice tone="success">{state.notice}</Notice>}
      </div>
      <SubmitButton variant={suspending ? 'danger' : 'primary'} pending="Saving…">
        {suspending ? `Suspend ${name}` : `Reactivate ${name}`}
      </SubmitButton>
      {suspending && <p className="text-[12.5px] text-muted">They’ll be signed out on every device at once and can’t sign in until reactivated.</p>}
    </form>
  );
}
