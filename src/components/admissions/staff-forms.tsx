'use client';

import { useActionState, useState } from 'react';
import {
  advanceApplication,
  awardScholarship,
  createCycle,
  decideApplication,
  requestAiEvaluation,
  reviewApplication,
  scheduleInterview,
  updateCycle,
} from '@/app/actions/admissions';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Notice } from '@/components/ui/primitives';
import { type AdmissionCycle, ADMISSIONS_TIME_ZONE, DIMENSION_LABELS, DIMENSIONS, RECOMMENDATION_LABELS } from '@/lib/admissions';
import { localInput } from '@/lib/cohorts';
import type { FormState } from '@/lib/forms';
import { labelClass, selectClass, textareaClass } from './application-forms';

type Option = { value: string; label: string };
/** A cohort to choose, with the programme it runs. */
type CohortOption = Option & { programSlug: string };

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
    </>
  );
}

function Select({
  id,
  name,
  label,
  options,
  defaultValue,
  required,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} required={required} onChange={onChange && ((e) => onChange(e.target.value))} className={selectClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Note({ id, name, label, required, placeholder, rows = 3, max = 2000 }: { id: string; name: string; label: string; required?: boolean; placeholder?: string; rows?: number; max?: number }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea id={id} name={name} rows={rows} maxLength={max} required={required} placeholder={placeholder} className={textareaClass} />
    </div>
  );
}

const zoneHint = `${ADMISSIONS_TIME_ZONE.replace('_', ' ')} time`;

// ---------- cycles ----------

export function CreateCycleForm({ programs, cohorts, defaults }: { programs: Option[]; cohorts: CohortOption[]; defaults: { opensAt: string; closesAt: string } }) {
  const [state, action] = useActionState(createCycle, {} as FormState);
  const v = state.values ?? {};
  // Admitted applicants join a cohort of the cycle's programme, so only those are offered.
  const [program, setProgram] = useState(v.programSlug ?? programs[0]?.value ?? '');
  const programCohorts = cohorts.filter((c) => c.programSlug === program);
  return (
    <form action={action} className="space-y-4">
      <TextInput label="Name" name="name" required minLength={3} maxLength={120} placeholder="2027 intake" defaultValue={v.name} />
      <Select id="cycle-program" name="programSlug" label="Programme" options={programs} defaultValue={program} required onChange={setProgram} />
      <Select key={program} id="cycle-cohort" name="cohortId" label="Cohort admitted applicants join" options={[{ value: '', label: 'Choose later' }, ...programCohorts]} defaultValue={v.cohortId ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Applications open" name="opensAt" type="datetime-local" required defaultValue={v.opensAt ?? defaults.opensAt} hint={zoneHint} error={state.fields?.opensAt} />
        <TextInput label="Applications close" name="closesAt" type="datetime-local" required defaultValue={v.closesAt ?? defaults.closesAt} hint={zoneHint} error={state.fields?.closesAt} />
      </div>
      <p className="text-[13px] text-muted">New cycles start as drafts. Open the cycle when you’re ready for applications.</p>
      <Feedback state={state} />
      <SubmitButton pending="Creating…">Create cycle</SubmitButton>
    </form>
  );
}

const NEXT_CYCLE_STATUS: Record<AdmissionCycle['status'], { status: AdmissionCycle['status']; label: string; variant: 'primary' | 'secondary' | 'danger' }[]> = {
  draft: [{ status: 'open', label: 'Open for applications', variant: 'primary' }],
  open: [{ status: 'closed', label: 'Close the cycle', variant: 'danger' }],
  closed: [{ status: 'open', label: 'Reopen the cycle', variant: 'secondary' }],
};

export function CycleStatusActions({ cycle }: { cycle: AdmissionCycle }) {
  const [state, action] = useActionState(updateCycle, {} as FormState);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {NEXT_CYCLE_STATUS[cycle.status].map((n) => (
          <form key={n.status} action={action}>
            <input type="hidden" name="cycleId" value={cycle.id} />
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

export function CycleSettingsForm({ cycle, cohorts }: { cycle: AdmissionCycle; cohorts: Option[] }) {
  const [state, action] = useActionState(updateCycle, {} as FormState);
  const known = cohorts.some((c) => c.value === cycle.cohortId);
  const options = [{ value: '', label: 'Choose later' }, ...cohorts, ...(cycle.cohortId && !known ? [{ value: cycle.cohortId, label: 'The current cohort' }] : [])];
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycle.id} />
      <TextInput label="Name" name="name" required minLength={3} maxLength={120} defaultValue={cycle.name} />
      <Select id={`cycle-cohort-${cycle.id}`} name="cohortId" label="Cohort admitted applicants join" options={options} defaultValue={cycle.cohortId ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Applications open" name="opensAt" type="datetime-local" required defaultValue={localInput(cycle.opensAt, ADMISSIONS_TIME_ZONE)} hint={zoneHint} />
        <TextInput label="Applications close" name="closesAt" type="datetime-local" required defaultValue={localInput(cycle.closesAt, ADMISSIONS_TIME_ZONE)} hint={zoneHint} />
      </div>
      <p className="text-[12.5px] text-muted">People already admitted join the cohort as soon as you choose one.</p>
      <Feedback state={state} />
      <SubmitButton variant="secondary" pending="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}

// ---------- one application ----------

export function ReviewForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(reviewApplication, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <fieldset className="space-y-2">
        <legend className={labelClass}>Score each dimension: 1 (weak) to 5 (strong)</legend>
        {DIMENSIONS.map((d) => (
          <div key={d} role="radiogroup" aria-label={DIMENSION_LABELS[d]} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-field)] px-3 py-2 ring-1 ring-line">
            <span className="text-[14px] font-semibold text-ink">{DIMENSION_LABELS[d]}</span>
            <span className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full font-mono text-[13px] ring-1 ring-line has-[:checked]:bg-forest has-[:checked]:text-white has-[:checked]:ring-forest">
                  <input type="radio" name={`score:${d}`} value={n} required className="sr-only" aria-label={`${DIMENSION_LABELS[d]}: ${n}`} />
                  {n}
                </label>
              ))}
            </span>
          </div>
        ))}
      </fieldset>
      <Select
        id={`recommendation-${applicationId}`}
        name="recommendation"
        label="Recommendation"
        options={Object.entries(RECOMMENDATION_LABELS).map(([value, label]) => ({ value, label }))}
        defaultValue="advance"
      />
      <Note id={`review-comment-${applicationId}`} name="comment" label="Why" required rows={4} max={4000} placeholder="The evidence behind your scores, in a sentence or two." />
      <Feedback state={state} />
      <SubmitButton pending="Saving…">Save review</SubmitButton>
    </form>
  );
}

export function AiEvaluationForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(requestAiEvaluation, {} as FormState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Feedback state={state} />
      <SubmitButton variant="secondary" pending="Asking the AI… this can take a minute">
        Ask AI for an evaluation
      </SubmitButton>
    </form>
  );
}

export function AdvanceForm({ applicationId, nextLabel }: { applicationId: string; nextLabel: string }) {
  const [state, action] = useActionState(advanceApplication, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Note id={`advance-note-${applicationId}`} name="note" label="Note for the record (optional)" rows={2} />
      <Feedback state={state} />
      <SubmitButton pending="Moving…">{`Move to ${nextLabel}`}</SubmitButton>
    </form>
  );
}

export function InterviewForm({ applicationId, interview }: { applicationId: string; interview: { scheduledAt: string; notes: string } | null }) {
  const [state, action] = useActionState(scheduleInterview, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <TextInput
        label="Interview date and time"
        name="scheduledAt"
        type="datetime-local"
        required
        defaultValue={interview ? localInput(interview.scheduledAt, ADMISSIONS_TIME_ZONE) : ''}
        hint={`${zoneHint}. The applicant is told when the time is set or moved.`}
      />
      <div className="space-y-1.5">
        <label htmlFor={`interview-notes-${applicationId}`} className={labelClass}>
          Interview notes (staff only)
        </label>
        <textarea id={`interview-notes-${applicationId}`} name="notes" rows={5} maxLength={4000} defaultValue={interview?.notes ?? ''} className={textareaClass} />
      </div>
      <Feedback state={state} />
      <SubmitButton variant="secondary" pending="Saving…">
        Save interview
      </SubmitButton>
    </form>
  );
}

export function ScholarshipForm({ applicationId, current }: { applicationId: string; current: { percent: number; note: string } | null }) {
  const [state, action] = useActionState(awardScholarship, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <TextInput label="Scholarship (%)" name="percent" type="number" min={0} max={100} inputMode="numeric" required defaultValue={current?.percent ?? ''} hint="0 for no award" />
      <div className="space-y-1.5">
        <label htmlFor={`scholarship-note-${applicationId}`} className={labelClass}>
          Reason (staff only)
        </label>
        <textarea id={`scholarship-note-${applicationId}`} name="note" rows={2} maxLength={2000} required defaultValue={current?.note ?? ''} className={textareaClass} />
      </div>
      <Feedback state={state} />
      <SubmitButton variant="secondary" pending="Saving…">
        Record scholarship
      </SubmitButton>
    </form>
  );
}

export function DecisionForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(decideApplication, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Select
        id={`outcome-${applicationId}`}
        name="outcome"
        label="Decision"
        options={[
          { value: 'admitted', label: 'Admit' },
          { value: 'waitlisted', label: 'Waitlist' },
          { value: 'declined', label: 'Decline' },
        ]}
        defaultValue="admitted"
      />
      <Note id={`decision-note-${applicationId}`} name="note" label="Reason for the decision (staff only)" required />
      <Feedback state={state} />
      <SubmitButton pending="Recording…">Record decision</SubmitButton>
    </form>
  );
}
