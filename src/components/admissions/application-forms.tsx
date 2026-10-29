'use client';

import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveApplicationStage, startApplication, withdrawApplication } from '@/app/actions/admissions';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Button, Notice } from '@/components/ui/primitives';
import { type ApplicantStage, EDUCATION_LEVELS } from '@/lib/admissions';
import type { FormState } from '@/lib/forms';

export const selectClass = 'h-12 w-full rounded-[var(--radius-field)] bg-card px-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary';
export const textareaClass =
  'w-full rounded-[var(--radius-field)] bg-card px-4 py-3 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary';
export const labelClass = 'text-[13px] font-semibold text-ink';

type Answers = Record<string, unknown>;
const text = (a: Answers, key: string) => (typeof a[key] === 'string' ? (a[key] as string) : '');

export function StartApplicationForm({ cycleId, back, label }: { cycleId: string; back: string; label: string }) {
  const [state, action] = useActionState(startApplication, {} as FormState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="back" value={back} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Opening…">{label}</SubmitButton>
    </form>
  );
}

/** A long answer with a character count against the stage's minimum. */
export function LongText({ label, name, min, max, defaultValue, hint, rows = 6 }: { label: string; name: string; min: number; max: number; defaultValue: string; hint?: string; rows?: number }) {
  const id = useId();
  const [length, setLength] = useState(defaultValue.trim().length);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={max}
        defaultValue={defaultValue}
        onChange={(e) => setLength(e.target.value.trim().length)}
        aria-describedby={`${id}-count`}
        className={textareaClass}
      />
      <p id={`${id}-count`} className="text-[12px] text-muted" aria-live="polite">
        {length < min ? `${length} of at least ${min} characters` : `${length} characters`}
      </p>
    </div>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-field)] bg-card px-3 py-2.5 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 accent-[var(--color-primary)]" />
      <span className="text-[14px] text-ink">{label}</span>
    </label>
  );
}

function StageButtons({ last }: { last: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="submit" name="intent" value="save" variant="secondary" disabled={pending}>
        Save draft
      </Button>
      <Button type="submit" name="intent" value="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Saving…' : last ? 'Submit my application' : 'Submit and continue'}
      </Button>
    </div>
  );
}

type Prompt = { id: string; prompt: string };

/** One applicant stage: its questions, a draft save and a submit that moves the application on. */
export function StageForm({ applicationId, stage, answers, prompts }: { applicationId: string; stage: ApplicantStage; answers: Answers; prompts: readonly Prompt[] }) {
  const [state, action] = useActionState(saveApplicationStage, {} as FormState);
  return (
    // React resets a form after its action; keyed on the saved draft, it comes back holding what was
    // saved (a failed submit still saves the draft first), not what the page first loaded with.
    <form key={JSON.stringify(answers)} action={action} className="space-y-5">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="stage" value={stage} />
      {stage === 'eligibility' && <Eligibility answers={answers} />}
      {stage === 'application' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="City or town" name="city" required maxLength={80} defaultValue={text(answers, 'city')} />
            <TextInput label="What you do now" name="occupation" required maxLength={120} defaultValue={text(answers, 'occupation')} hint="Your job, studies or business" />
          </div>
          <LongText label="Why are you applying?" name="motivation" min={100} max={2000} defaultValue={text(answers, 'motivation')} />
          <TextInput label="How did you hear about the programme?" name="howHeard" required maxLength={200} defaultValue={text(answers, 'howHeard')} />
        </>
      )}
      {stage === 'dream_application' && (
        <>
          <LongText label="What is your dream?" name="dream" min={80} max={3000} defaultValue={text(answers, 'dream')} hint="What you want to build, and what the world looks like once it exists." />
          <LongText label="What problem does it solve?" name="problem" min={80} max={3000} defaultValue={text(answers, 'problem')} />
          <LongText label="Who benefits?" name="whoBenefits" min={40} max={2000} rows={4} defaultValue={text(answers, 'whoBenefits')} />
          <LongText label="Why are you the person to build it?" name="whyYou" min={80} max={3000} defaultValue={text(answers, 'whyYou')} />
        </>
      )}
      {stage === 'evidence' && <Evidence answers={answers} />}
      {stage === 'assessment' &&
        prompts.map((p, i) => (
          <LongText
            key={p.id}
            label={`${i + 1}. ${p.prompt}`}
            name={`answer:${p.id}`}
            min={60}
            max={2500}
            defaultValue={typeof answers.answers === 'object' && answers.answers ? String((answers.answers as Record<string, unknown>)[p.id] ?? '') : ''}
          />
        ))}
      {stage === 'video' && (
        <>
          <TextInput label="Link to your video" name="url" type="url" required maxLength={500} placeholder="https://" defaultValue={text(answers, 'url')} hint="YouTube, Google Drive or any link reviewers can open without signing in." />
          <LongText label="Anything reviewers should know (optional)" name="note" min={0} max={500} rows={3} defaultValue={text(answers, 'note')} />
        </>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone={state.error ? 'neutral' : 'success'}>{state.notice}</Notice>}
      <StageButtons last={stage === 'video'} />
    </form>
  );
}

function Eligibility({ answers }: { answers: Answers }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Country you live in" name="country" required maxLength={80} defaultValue={text(answers, 'country')} />
        <div className="space-y-1.5">
          <label htmlFor="education-level" className={labelClass}>
            Highest education
          </label>
          <select id="education-level" name="educationLevel" defaultValue={text(answers, 'educationLevel')} className={selectClass}>
            <option value="">Choose one</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className={labelClass}>Confirm each of these</legend>
        <Check name="isAdult" label="I am 18 or older." defaultChecked={answers.isAdult === true} />
        <Check name="canCommitFullTime" label="I can commit to the programme full-time for its whole length." defaultChecked={answers.canCommitFullTime === true} />
        <Check name="hasDeviceAndInternet" label="I have a laptop or phone and internet access for online classes." defaultChecked={answers.hasDeviceAndInternet === true} />
      </fieldset>
    </>
  );
}

type EvidenceItem = { title: string; description: string; link: string };

function Evidence({ answers }: { answers: Answers }) {
  const saved = Array.isArray(answers.items) ? (answers.items as Partial<Record<keyof EvidenceItem, unknown>>[]) : [];
  const [items, setItems] = useState<(EvidenceItem & { key: number })[]>(() =>
    (saved.length > 0 ? saved : [{}]).map((e, i) => ({ key: i, title: String(e.title ?? ''), description: String(e.description ?? ''), link: String(e.link ?? '') })),
  );
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <fieldset key={item.key} className="space-y-3 rounded-[var(--radius-field)] p-4 ring-1 ring-line">
          <div className="flex items-center justify-between gap-3">
            <legend className="text-[14px] font-bold text-ink">Evidence {i + 1}</legend>
            {items.length > 1 && (
              <button type="button" onClick={() => setItems((all) => all.filter((x) => x.key !== item.key))} className="min-h-10 text-[13px] font-semibold text-danger-ink hover:underline">
                Remove<span className="sr-only"> evidence {i + 1}</span>
              </button>
            )}
          </div>
          <TextInput label="What it is" name="evidenceTitle" maxLength={160} defaultValue={item.title} placeholder="A solar dryer I built" />
          <LongText label="What you did and what happened" name="evidenceDescription" min={30} max={1500} rows={4} defaultValue={item.description} />
          <TextInput label="Link (optional)" name="evidenceLink" type="url" maxLength={500} placeholder="https://" defaultValue={item.link} />
        </fieldset>
      ))}
      {items.length < 5 && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="sm:w-auto"
          onClick={() => setItems((all) => [...all, { key: Math.max(...all.map((x) => x.key)) + 1, title: '', description: '', link: '' }])}
        >
          Add another piece of evidence
        </Button>
      )}
    </div>
  );
}

export function WithdrawForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(withdrawApplication, {} as FormState);
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button type="button" variant="danger" size="md" className="sm:w-auto" onClick={() => setConfirming(true)}>
        Withdraw my application
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="text-[14px] text-body">Withdrawing is final for this cycle: you can’t reopen this application.</p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <div>
          <SubmitButton variant="danger" pending="Withdrawing…">
            Yes, withdraw
          </SubmitButton>
        </div>
        <div>
          <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
            Keep my application
          </Button>
        </div>
      </div>
    </form>
  );
}
