'use client';

import { useActionState, useState } from 'react';
import { chooseElectives, createCohort, joinCohort, markAttendance, updateCohort, updateSession } from '@/app/actions/cohorts';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { cx, Notice } from '@/components/ui/primitives';
import { ATTENDANCE_LABELS, type AttendanceEntry, type AttendanceStatus, type ClassSession, type Cohort, localInput, type MyProgram, TIME_ZONES } from '@/lib/cohorts';
import type { FormState } from '@/lib/forms';

const selectClass = 'h-12 w-full rounded-[var(--radius-field)] bg-card px-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'text-[13px] font-semibold text-ink';

export function JoinCohortForm({ cohortId, programSlug, label: text }: { cohortId: string; programSlug: string; label: string }) {
  const [state, action] = useActionState(joinCohort, {} as FormState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="cohortId" value={cohortId} />
      <input type="hidden" name="programSlug" value={programSlug} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Joining…">{text}</SubmitButton>
    </form>
  );
}

export function ElectiveForm({ enrollmentId, choice }: { enrollmentId: string; choice: MyProgram['electives'][number] }) {
  const [state, action] = useActionState(chooseElectives, {} as FormState);
  const single = choice.chooseN === 1;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="chooseN" value={choice.chooseN} />
      <fieldset className="space-y-2" disabled={choice.locked}>
        <legend className="sr-only">{`Choose ${single ? 'one course' : `${choice.chooseN} courses`} for ${choice.phase}`}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {choice.options.map((c) => (
            <label
              key={c.slug}
              className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-field)] bg-card px-3 py-2.5 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:disabled]:cursor-default"
            >
              <input
                type={single ? 'radio' : 'checkbox'}
                name="courseSlug"
                value={c.slug}
                defaultChecked={choice.chosen.includes(c.slug)}
                className="mt-1 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-[14px] font-semibold text-ink">{c.title}</span>
                <span className="block text-[12.5px] text-muted">{c.subtitle}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      {!choice.locked && (
        <div className="sm:max-w-xs">
          <SubmitButton pending="Saving…">{choice.chosen.length > 0 ? 'Change my choice' : 'Save my choice'}</SubmitButton>
        </div>
      )}
    </form>
  );
}

export function CreateCohortForm({ programs, defaultStart }: { programs: { slug: string; title: string; weeks: number | null }[]; defaultStart: string }) {
  const [state, action] = useActionState(createCohort, {} as FormState);
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="cohort-program" className={label}>
          Programme
        </label>
        <select id="cohort-program" name="programSlug" required defaultValue={v.programSlug ?? programs[0]?.slug} className={selectClass}>
          {programs.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
              {p.weeks ? ` (${p.weeks} weeks)` : ''}
            </option>
          ))}
        </select>
      </div>
      <TextInput label="Name" name="name" required minLength={2} maxLength={120} placeholder="Cohort 01" defaultValue={v.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="First day of week 1" name="startsOn" type="date" required defaultValue={v.startsOn ?? defaultStart} error={state.fields?.startsOn} />
        <div className="space-y-1.5">
          <label htmlFor="cohort-tz" className={label}>
            Time zone for classes
          </label>
          <select id="cohort-tz" name="timeZone" defaultValue={v.timeZone ?? 'Africa/Lagos'} className={selectClass}>
            {TIME_ZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Capacity" name="capacity" type="number" min={1} max={10000} inputMode="numeric" placeholder="No limit" defaultValue={v.capacity} hint="Blank for no limit" error={state.fields?.capacity} />
        <div className="space-y-1.5">
          <label htmlFor="cohort-policy" className={label}>
            Who can join
          </label>
          <select id="cohort-policy" name="enrollmentPolicy" defaultValue={v.enrollmentPolicy ?? 'invite'} className={selectClass}>
            <option value="invite">Members of this organisation</option>
            <option value="open">Anyone signed in</option>
          </select>
        </div>
      </div>
      <p className="text-[13px] text-muted">Classes follow the Dream Lab rhythm: Tuesday and Thursday 21:00 online (90 minutes) and Saturday 08:30 in person (2 hours). You can add links and move or cancel single classes afterwards.</p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Scheduling…">Schedule cohort</SubmitButton>
    </form>
  );
}

const NEXT_STATUS: Record<Cohort['status'], { status: Cohort['status']; label: string; variant: 'primary' | 'secondary' | 'danger' }[]> = {
  draft: [{ status: 'open', label: 'Open for joining', variant: 'primary' }],
  open: [
    { status: 'running', label: 'Start the cohort', variant: 'primary' },
    { status: 'draft', label: 'Back to draft', variant: 'secondary' },
  ],
  running: [{ status: 'closed', label: 'Close the cohort', variant: 'danger' }],
  closed: [],
};

export function CohortStatusActions({ cohort }: { cohort: Cohort }) {
  const [state, action] = useActionState(updateCohort, {} as FormState);
  const next = NEXT_STATUS[cohort.status];
  if (next.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {next.map((n) => (
          <form key={n.status} action={action}>
            <input type="hidden" name="cohortId" value={cohort.id} />
            <input type="hidden" name="status" value={n.status} />
            <SubmitButton variant={n.variant} pending="Saving…">
              {n.label}
            </SubmitButton>
          </form>
        ))}
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </div>
  );
}

export function CohortSettingsForm({ cohort }: { cohort: Cohort }) {
  const [state, action] = useActionState(updateCohort, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cohortId" value={cohort.id} />
      <TextInput label="Name" name="name" required minLength={2} maxLength={120} defaultValue={cohort.name} />
      <TextInput label="Capacity" name="capacity" type="number" min={1} max={10000} inputMode="numeric" placeholder="No limit" defaultValue={cohort.capacity ?? ''} hint="Blank for no limit" />
      <div className="space-y-1.5">
        <label htmlFor={`policy-${cohort.id}`} className={label}>
          Who can join
        </label>
        <select id={`policy-${cohort.id}`} name="enrollmentPolicy" defaultValue={cohort.enrollmentPolicy} className={selectClass}>
          <option value="invite">Members of {cohort.hostOrgName}</option>
          <option value="open">Anyone signed in</option>
        </select>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <SubmitButton variant="secondary" pending="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}

/** One class: its link or place, a new time, or cancel / restore. */
export function SessionEditor({ cohortId, timeZone, session }: { cohortId: string; timeZone: string; session: ClassSession }) {
  const [state, action] = useActionState(updateSession, {} as FormState);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-10 text-[13.5px] font-semibold text-link hover:underline">
        {open ? 'Close' : 'Edit'}
        <span className="sr-only"> {session.title}, week {session.weekNo}</span>
      </button>
      {open && (
        <form action={action} className="space-y-3 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line">
          <input type="hidden" name="cohortId" value={cohortId} />
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="timeZone" value={timeZone} />
          <TextInput label={session.mode === 'virtual' ? 'Join link' : 'Place'} name="location" maxLength={500} defaultValue={session.location ?? ''} placeholder={session.mode === 'virtual' ? 'https://meet…' : 'Hub address'} />
          <TextInput label={`Starts (${timeZone})`} name="startsAt" type="datetime-local" defaultValue={localInput(session.startsAt, timeZone)} />
          <label className="flex items-center gap-2 text-[14px] text-ink">
            <input type="hidden" name="cancelled" value="false" />
            <input type="checkbox" name="cancelled" value="true" defaultChecked={session.cancelled} className="h-4 w-4 accent-[var(--color-danger)]" />
            Cancelled
          </label>
          {state.error && <Notice tone="error">{state.error}</Notice>}
          {state.notice && <Notice tone="success">{state.notice}</Notice>}
          <SubmitButton variant="secondary" pending="Saving…">
            Save class
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

const MARKS: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export function AttendanceForm({ cohortId, sessionId, items }: { cohortId: string; sessionId: string; items: AttendanceEntry[] }) {
  const [state, action] = useActionState(markAttendance, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cohortId" value={cohortId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <ul className="divide-y divide-line">
        {items.map((l) => (
          <li key={l.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <input type="hidden" name="userId" value={l.userId} />
            <span className="min-w-0 font-semibold text-ink">{l.name}</span>
            <fieldset className="flex flex-wrap gap-1.5">
              <legend className="sr-only">Attendance for {l.name}</legend>
              {MARKS.map((m) => (
                <label
                  key={m}
                  className={cx(
                    'flex min-h-10 cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold ring-1 ring-line has-[:checked]:text-white',
                    m === 'present' || m === 'late' ? 'has-[:checked]:bg-primary' : m === 'absent' ? 'has-[:checked]:bg-danger' : 'has-[:checked]:bg-muted',
                  )}
                >
                  <input type="radio" name={`status:${l.userId}`} value={m} defaultChecked={l.status === m} className="sr-only" />
                  {ATTENDANCE_LABELS[m]}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <div className="sm:max-w-xs">
        <SubmitButton pending="Saving…">Save attendance</SubmitButton>
      </div>
    </form>
  );
}
