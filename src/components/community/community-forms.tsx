'use client';

import { useActionState, useState, useSyncExternalStore } from 'react';
import { assignMentor, deleteCircle, endAssignment, saveCircle, scheduleMeeting, updateMeeting } from '@/app/actions/community';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Notice } from '@/components/ui/primitives';
import type { DreamCircle, MentorMeeting, Person } from '@/lib/community';
import type { FormState } from '@/lib/forms';

const selectClass = 'h-12 w-full rounded-[var(--radius-field)] bg-card px-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary';
const textareaClass = 'w-full rounded-[var(--radius-field)] bg-card px-4 py-3 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'text-[13px] font-semibold text-ink';
const chip =
  'flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] bg-card px-3 py-2 text-[14px] text-ink ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary';

/** The browser's time zone, so times typed in a datetime-local field mean what the person meant. */
const noSubscribe = () => () => undefined;

function TimeZoneField() {
  const tz = useSyncExternalStore(noSubscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', () => 'UTC');
  return <input type="hidden" name="timeZone" value={tz} />;
}

/** A time in the reader's own time zone (rendered after hydration; the server doesn't know it). */
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    () => `${new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`,
  );
  return <time dateTime={iso}>{text}</time>;
}

/** "2026-11-03T21:00" for a datetime-local field, in the browser's time zone. */
function localValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
    </>
  );
}

// ---------- mentors (cohort managers) ----------

export function AssignMentorForm({ cohortId, candidates, learners }: { cohortId: string; candidates: Person[]; learners: Person[] }) {
  const [state, action] = useActionState(assignMentor, {} as FormState);
  if (candidates.length === 0) {
    return <Notice tone="neutral">Nobody in this organisation can mentor yet. Give members the Mentor role in Members, then assign them here.</Notice>;
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cohortId" value={cohortId} />
      <div className="space-y-1.5">
        <label htmlFor={`mentor-${cohortId}`} className={label}>
          Mentor
        </label>
        <select id={`mentor-${cohortId}`} name="mentorUserId" required className={selectClass} defaultValue="">
          <option value="" disabled>
            Choose a mentor
          </option>
          {candidates.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-2">
        <legend className={label}>Learners</legend>
        {learners.length === 0 ? (
          <p className="text-[14px] text-muted">Nobody has joined this cohort yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {learners.map((l) => (
              <label key={l.userId} className={chip}>
                <input type="checkbox" name="learnerUserId" value={l.userId} className="accent-[var(--color-primary)]" />
                {l.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <Feedback state={state} />
      <div className="sm:max-w-xs">
        <SubmitButton pending="Assigning…">Assign mentor</SubmitButton>
      </div>
    </form>
  );
}

export function EndAssignmentButton({ assignmentId, who }: { assignmentId: string; who: string }) {
  const [state, action] = useActionState(endAssignment, {} as FormState);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button type="submit" className="min-h-10 text-[13.5px] font-semibold text-danger-ink hover:underline">
        End
        <span className="sr-only"> {who}</span>
      </button>
      {state.error && <p role="alert" className="text-[12.5px] text-danger-ink">{state.error}</p>}
    </form>
  );
}

// ---------- Dream Circles (cohort managers) ----------

/** Form a circle, or (with `circle`) rename it and change its members. */
export function CircleForm({ cohortId, learners, circle, taken }: { cohortId: string; learners: Person[]; circle?: DreamCircle; taken: Set<string> }) {
  const [state, action] = useActionState(saveCircle, {} as FormState);
  const members = new Set(circle?.members.map((m) => m.userId));
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cohortId" value={cohortId} />
      {circle && <input type="hidden" name="circleId" value={circle.id} />}
      <TextInput label="Circle name" name="name" required minLength={2} maxLength={80} placeholder="Circle 1" defaultValue={state.values?.name ?? circle?.name} error={state.fields?.name} />
      <fieldset className="space-y-2">
        <legend className={label}>Members (2 to 12)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {learners.map((l) => (
            <label key={l.userId} className={chip}>
              <input type="checkbox" name="memberUserId" value={l.userId} defaultChecked={members.has(l.userId)} className="accent-[var(--color-primary)]" />
              <span className="min-w-0">
                {l.name}
                {!members.has(l.userId) && taken.has(l.userId) && <span className="block text-[12px] text-muted">In another circle</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Feedback state={state} />
      <div className="sm:max-w-xs">
        <SubmitButton variant={circle ? 'secondary' : 'primary'} pending="Saving…">
          {circle ? 'Save circle' : 'Form circle'}
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteCircleButton({ circleId, name }: { circleId: string; name: string }) {
  const [state, action] = useActionState(deleteCircle, {} as FormState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Dissolve ${name}? Its members are told.`)) e.preventDefault();
      }}
      className="space-y-1"
    >
      <input type="hidden" name="circleId" value={circleId} />
      <button type="submit" className="min-h-10 text-[13.5px] font-semibold text-danger-ink hover:underline">
        Dissolve
        <span className="sr-only"> {name}</span>
      </button>
      {state.error && <p role="alert" className="text-[12.5px] text-danger-ink">{state.error}</p>}
    </form>
  );
}

// ---------- mentor meetings (mentors) ----------

export function ScheduleMeetingForm({ mentees }: { mentees: { assignmentId: string; name: string; cohortName: string }[] }) {
  const [state, action] = useActionState(scheduleMeeting, {} as FormState);
  const v = state.values ?? {};
  const [mode, setMode] = useState(v.mode ?? 'virtual');
  return (
    <form action={action} className="space-y-4">
      <TimeZoneField />
      <div className="space-y-1.5">
        <label htmlFor="meeting-mentee" className={label}>
          Mentee
        </label>
        <select id="meeting-mentee" name="assignmentId" required defaultValue={v.assignmentId ?? mentees[0]?.assignmentId} className={selectClass}>
          {mentees.map((m) => (
            <option key={m.assignmentId} value={m.assignmentId}>
              {m.name} · {m.cohortName}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="When (your time)" name="scheduledAt" type="datetime-local" required defaultValue={v.scheduledAt} error={state.fields?.scheduledAt} />
        <TextInput label="Minutes" name="durationMin" type="number" min={15} max={240} step={5} inputMode="numeric" defaultValue={v.durationMin ?? '45'} error={state.fields?.durationMin} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="meeting-mode" className={label}>
            Where
          </label>
          <select id="meeting-mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className={selectClass}>
            <option value="virtual">Online, in Dream Lab</option>
            <option value="in_person">In person</option>
          </select>
        </div>
        {mode === 'in_person' && <TextInput label="Place" name="location" maxLength={200} placeholder="Hub, room 2" defaultValue={v.location} />}
      </div>
      <Feedback state={state} />
      <div className="sm:max-w-xs">
        <SubmitButton pending="Scheduling…">Schedule meeting</SubmitButton>
      </div>
    </form>
  );
}

/** Log a meeting as held with notes, move it, or cancel it. */
export function MeetingEditor({ meeting }: { meeting: MentorMeeting }) {
  const [state, action] = useActionState(updateMeeting, {} as FormState);
  const [open, setOpen] = useState(false);
  // Sent only when changed, so logging a meeting never reschedules it.
  const [moved, setMoved] = useState(false);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-10 text-[13.5px] font-semibold text-link hover:underline">
        {open ? 'Close' : meeting.status === 'scheduled' ? 'Log or change' : 'Edit notes'}
        <span className="sr-only"> meeting with {meeting.learner.name}</span>
      </button>
      {open && (
        <form action={action} className="space-y-3 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line">
          <input type="hidden" name="meetingId" value={meeting.id} />
          <TimeZoneField />
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className={`${label} mb-1.5`}>What happened</legend>
            {(['scheduled', 'held', 'cancelled'] as const).map((s) => (
              <label key={s} className="flex min-h-10 cursor-pointer items-center rounded-full px-3 text-[13px] font-semibold ring-1 ring-line has-[:checked]:bg-primary has-[:checked]:text-white">
                <input type="radio" name="status" value={s} defaultChecked={meeting.status === s} className="sr-only" />
                {s === 'scheduled' ? 'Still on' : s === 'held' ? 'Held' : 'Cancelled'}
              </label>
            ))}
          </fieldset>
          {meeting.status === 'scheduled' && (
            <TextInput label="Move to (your time)" name={moved ? 'scheduledAt' : undefined} type="datetime-local" defaultValue={localValue(meeting.scheduledAt)} onChange={() => setMoved(true)} />
          )}
          <div className="space-y-1.5">
            <label htmlFor={`notes-${meeting.id}`} className={label}>
              Notes
            </label>
            <textarea id={`notes-${meeting.id}`} name="notes" rows={4} maxLength={8000} defaultValue={meeting.notes} placeholder="What you talked about and agreed next" className={textareaClass} />
            <p className="text-[12.5px] text-muted">Your mentee sees the notes once the meeting is logged as held.</p>
          </div>
          <Feedback state={state} />
          <SubmitButton variant="secondary" pending="Saving…">
            Save meeting
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
