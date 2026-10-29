'use client';

import { useActionState, useState } from 'react';
import { createAssignment, saveDreamScoreWeights, updateAssignment, withdrawAssignment } from '@/app/actions/assigned';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { cx, Notice } from '@/components/ui/primitives';
import { DIMENSIONS, type Weights } from '@/lib/assigned';
import type { FormState } from '@/lib/forms';

const selectClass = 'h-12 w-full rounded-[var(--radius-field)] bg-card px-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary';
const areaClass = 'w-full rounded-[var(--radius-field)] bg-card px-4 py-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary';
const label = 'text-[13px] font-semibold text-ink';
const choice = 'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-field)] bg-card px-3 py-2 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary';

type Person = { userId: string; name: string; detail: string };
type Group = { id: string; name: string; memberCount: number };

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
    </>
  );
}

/** Assign a course: the course, who it is for (people and groups), an optional due date and note. */
export function AssignCourseForm({ courses, people, groups }: { courses: { slug: string; title: string }[]; people: Person[]; groups: Group[] }) {
  const [state, action] = useActionState(createAssignment, {} as FormState);
  const v = state.values ?? {};
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? people.filter((p) => p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q)) : people;
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="assign-course" className={label}>
          Course
        </label>
        <select id="assign-course" name="courseSlug" required defaultValue={v.courseSlug ?? ''} className={selectClass}>
          <option value="" disabled>
            Choose a course
          </option>
          {courses.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {groups.length > 0 && (
        <fieldset className="space-y-2">
          <legend className={label}>Groups</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <label key={g.id} className={choice}>
                <input type="checkbox" name="groupId" value={g.id} className="accent-[var(--color-primary)]" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{g.name}</span>
                  <span className="block text-[12.5px] text-muted">{g.memberCount === 1 ? '1 member' : `${g.memberCount} members`}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className={label}>People</legend>
        <TextInput label="Find someone" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" />
        {/* Every checkbox stays in the form, so filtering never drops someone already ticked. */}
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {people.map((p) => (
            <label key={p.userId} className={cx(choice, !shown.includes(p) && 'hidden')}>
              <input type="checkbox" name="userId" value={p.userId} className="accent-[var(--color-primary)]" />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-ink">{p.name}</span>
                {p.detail && <span className="block truncate text-[12.5px] text-muted">{p.detail}</span>}
              </span>
            </label>
          ))}
          {shown.length === 0 && <p className="px-1 text-[13.5px] text-muted">Nobody matches.</p>}
        </div>
      </fieldset>

      <TextInput label="Due date" name="dueOn" type="date" defaultValue={v.dueOn} hint="Optional. People see it, and it shows as overdue once passed." error={state.fields?.dueOn} />
      <div className="space-y-1.5">
        <label htmlFor="assign-note" className={label}>
          Note to the people assigned (optional)
        </label>
        <textarea id="assign-note" name="note" rows={3} maxLength={500} defaultValue={v.note} className={areaClass} />
      </div>
      <p className="text-[13px] text-muted">Everyone assigned is enrolled at once and told. People who later leave a group keep the course.</p>
      <Feedback state={state} />
      <SubmitButton pending="Assigning…">Assign course</SubmitButton>
    </form>
  );
}

export function EditAssignmentForm({ assignmentId, dueOn, note }: { assignmentId: string; dueOn: string | null; note: string }) {
  const [state, action] = useActionState(updateAssignment, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <TextInput label="Due date" name="dueOn" type="date" defaultValue={dueOn ?? ''} hint="Leave blank for no due date." />
      <div className="space-y-1.5">
        <label htmlFor="edit-note" className={label}>
          Note
        </label>
        <textarea id="edit-note" name="note" rows={3} maxLength={500} defaultValue={note} className={areaClass} />
      </div>
      <Feedback state={state} />
      <div className="sm:max-w-xs">
        <SubmitButton pending="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}

export function WithdrawAssignmentForm({ assignmentId, title }: { assignmentId: string; title: string }) {
  const [state, action] = useActionState(withdrawAssignment, {} as FormState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Withdraw ${title}? It leaves everyone’s list of assigned courses; their enrolments and progress stay.`)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <Feedback state={state} />
      <div className="sm:max-w-xs">
        <SubmitButton pending="Withdrawing…" variant="danger">
          Withdraw assignment
        </SubmitButton>
      </div>
    </form>
  );
}

/** Ten whole percentages with a live total; saving needs exactly 100. */
export function DreamScoreWeightsForm({ weights }: { weights: Weights }) {
  const [state, action] = useActionState(saveDreamScoreWeights, {} as FormState);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(DIMENSIONS.map((d) => [d.key, String(weights[d.key] ?? 10)])));
  const total = DIMENSIONS.reduce((n, d) => n + (Number(values[d.key]) || 0), 0);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <TextInput
            key={d.key}
            label={`${d.label} (%)`}
            name={d.key}
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            required
            value={values[d.key]}
            onChange={(e) => setValues((v) => ({ ...v, [d.key]: e.target.value }))}
          />
        ))}
      </div>
      <p role="status" className={cx('text-[14px] font-semibold', total === 100 ? 'text-link' : 'text-danger-ink')}>
        Total {total}%{total === 100 ? '' : ' — the weights must total 100%'}
      </p>
      <Feedback state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="sm:w-56">
          <SubmitButton pending="Saving…">Save weights</SubmitButton>
        </div>
        <button
          type="button"
          onClick={() => setValues(Object.fromEntries(DIMENSIONS.map((d) => [d.key, '10'])))}
          className="min-h-11 px-3 text-[14px] font-semibold text-link hover:underline"
        >
          Reset to equal weights
        </button>
      </div>
    </form>
  );
}
