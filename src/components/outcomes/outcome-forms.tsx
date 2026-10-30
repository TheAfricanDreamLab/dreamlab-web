'use client';

import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  confirmRequirement,
  graduateLearner,
  lookUpCredential,
  reviewActionPlan,
  reviewResidencyStage,
  saveActionPlan,
  saveResidencyStage,
  sharePortfolio,
} from '@/app/actions/outcomes';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Button, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { type ActionPlan, type Graduation, type ResidencyStage, STAGE_MIN_CHARS } from '@/lib/outcomes';

const textareaClass =
  'w-full rounded-[var(--radius-field)] bg-card px-4 py-3 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary';
const labelClass = 'text-[13px] font-semibold text-ink';
const smallButton = 'min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-link hover:bg-surface';

function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && !state.error && <Notice tone="success">{state.notice}</Notice>}
      {state.notice && state.error && <p className="text-[13px] text-muted">{state.notice}</p>}
    </>
  );
}

function DraftButtons({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="submit" name="intent" value="save" variant="secondary" disabled={pending}>
        Save draft
      </Button>
      <Button type="submit" name="intent" value="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </div>
  );
}

/** A long text with a live character count. */
function CountedText({ label, name, min, max, defaultValue, rows = 8, hint }: { label: string; name: string; min: number; max: number; defaultValue: string; rows?: number; hint?: string }) {
  const id = useId();
  const [length, setLength] = useState(defaultValue.trim().length);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
      <textarea id={id} name={name} rows={rows} maxLength={max} defaultValue={defaultValue} onChange={(e) => setLength(e.target.value.trim().length)} aria-describedby={`${id}-count`} className={textareaClass} />
      <p id={`${id}-count`} className="text-[12px] text-muted" aria-live="polite">
        {min > 0 && length < min ? `${length} of at least ${min} characters` : `${length} characters`}
      </p>
    </div>
  );
}

// ---------- Dream Residency ----------

type Link = { label: string; url: string };

/** The learner's output document for one stage: text and evidence links, saved as a draft or submitted. */
export function ResidencyStageForm({ enrollmentId, stage }: { enrollmentId: string; stage: ResidencyStage }) {
  const [state, action] = useActionState(saveResidencyStage, {} as FormState);
  const [links, setLinks] = useState<(Link & { key: number })[]>(stage.document.links.map((l, i) => ({ ...l, key: i })));
  const [next, setNext] = useState(links.length);
  // After a save the page refreshes with the stored links: start again from those.
  const savedLinks = JSON.stringify(stage.document.links);
  const [seenLinks, setSeenLinks] = useState(savedLinks);
  if (seenLinks !== savedLinks) {
    setSeenLinks(savedLinks);
    setLinks(stage.document.links.map((l, i) => ({ ...l, key: i })));
    setNext(stage.document.links.length);
  }
  return (
    // Keyed on the saved document, so a refresh after saving shows what was saved.
    <form key={JSON.stringify(stage.document)} action={action} className="space-y-4">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="position" value={stage.position} />
      <CountedText
        label={stage.outputDocument}
        name="text"
        min={STAGE_MIN_CHARS}
        max={30_000}
        rows={14}
        defaultValue={state.values?.text ?? stage.document.text}
        hint="Write the document here. Plain paragraphs are fine; link anything bigger (slides, spreadsheets, videos) below."
      />
      <fieldset className="space-y-2">
        <legend className={labelClass}>Evidence links</legend>
        {links.length === 0 && <p className="text-[13px] text-muted">No links yet.</p>}
        {links.map((l, i) => (
          <div key={l.key} className="grid gap-2 sm:grid-cols-[1fr_1.6fr_auto] sm:items-end">
            <TextInput label={`Link ${i + 1} name`} name="linkLabel" maxLength={120} defaultValue={l.label} placeholder="Interview notes" />
            <TextInput label={`Link ${i + 1} address`} name="linkUrl" type="url" maxLength={500} defaultValue={l.url} placeholder="https://" />
            <button type="button" className={smallButton} onClick={() => setLinks(links.filter((x) => x.key !== l.key))}>
              Remove<span className="sr-only"> link {i + 1}</span>
            </button>
          </div>
        ))}
        {links.length < 10 && (
          <button
            type="button"
            className={smallButton}
            onClick={() => {
              setLinks([...links, { label: '', url: '', key: next }]);
              setNext(next + 1);
            }}
          >
            Add a link
          </button>
        )}
      </fieldset>
      <Feedback state={state} />
      <DraftButtons submitLabel="Submit for review" />
    </form>
  );
}

/** Faculty review of a submitted stage. */
export function ResidencyReviewForm({ enrollmentId, stage }: { enrollmentId: string; stage: ResidencyStage }) {
  const [state, action] = useActionState(reviewResidencyStage, {} as FormState);
  const [decision, setDecision] = useState(state.values?.decision || 'approved');
  const feedbackId = useId();
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="position" value={stage.position} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className={`${labelClass} mb-2`}>Decision</legend>
        {[
          { value: 'approved', label: `Approve (earns ${stage.creditHours} credits)` },
          { value: 'changes_requested', label: 'Ask for changes' },
        ].map((o) => (
          <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] bg-card px-3 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary">
            <input type="radio" name="decision" value={o.value} checked={decision === o.value} onChange={() => setDecision(o.value)} className="accent-[var(--color-primary)]" />
            <span className="text-[14px] text-ink">{o.label}</span>
          </label>
        ))}
      </fieldset>
      {decision === 'approved' && (
        <div className="sm:max-w-[12rem]">
          <TextInput label="Score (0–100)" name="scorePct" type="number" min={0} max={100} step={0.5} inputMode="decimal" required defaultValue={state.values?.scorePct} error={state.fields?.scorePct} />
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor={feedbackId} className={labelClass}>
          Feedback for the learner
        </label>
        <textarea id={feedbackId} name="feedback" rows={5} required minLength={10} maxLength={5000} defaultValue={state.values?.feedback} className={textareaClass} />
      </div>
      <Feedback state={state} />
      <SubmitButton pending="Saving…">{decision === 'approved' ? 'Approve stage' : 'Send back'}</SubmitButton>
    </form>
  );
}

// ---------- action plan ----------

type Milestone = { month: number; milestone: string; measure: string; key: number };

export function ActionPlanForm({ enrollmentId, plan }: { enrollmentId: string; plan: ActionPlan }) {
  const [state, action] = useActionState(saveActionPlan, {} as FormState);
  const initial = plan.milestones.length > 0 ? plan.milestones : [{ month: 1, milestone: '', measure: '' }, { month: 4, milestone: '', measure: '' }, { month: 9, milestone: '', measure: '' }];
  const [rows, setRows] = useState<Milestone[]>(initial.map((m, i) => ({ ...m, key: i })));
  const [next, setNext] = useState(rows.length);
  const body = { vision: plan.vision, milestones: plan.milestones, resources: plan.resources, risks: plan.risks };
  return (
    <form key={JSON.stringify(body)} action={action} className="space-y-5">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <CountedText label="Where you will be in twelve months" name="vision" min={80} max={3000} rows={5} defaultValue={plan.vision} />
      <fieldset className="space-y-3">
        <legend className={labelClass}>Milestones (at least three)</legend>
        {rows.map((m, i) => (
          <div key={m.key} className="grid gap-2 rounded-[var(--radius-field)] p-3 ring-1 ring-line sm:grid-cols-[6rem_1fr_1fr_auto] sm:items-end">
            <TextInput label="Month" name="milestoneMonth" type="number" min={1} max={12} inputMode="numeric" required defaultValue={String(m.month)} />
            <TextInput label="Milestone" name="milestone" maxLength={300} defaultValue={m.milestone} placeholder="First 20 paying customers" />
            <TextInput label="How you will measure it" name="milestoneMeasure" maxLength={300} defaultValue={m.measure} placeholder="Sales records" />
            <button type="button" className={smallButton} onClick={() => setRows(rows.filter((r) => r.key !== m.key))}>
              Remove<span className="sr-only"> milestone {i + 1}</span>
            </button>
          </div>
        ))}
        {rows.length < 24 && (
          <button
            type="button"
            className={smallButton}
            onClick={() => {
              setRows([...rows, { month: Math.min(12, (rows.at(-1)?.month ?? 0) + 1), milestone: '', measure: '', key: next }]);
              setNext(next + 1);
            }}
          >
            Add a milestone
          </button>
        )}
      </fieldset>
      <CountedText label="What you need (people, money, tools)" name="resources" min={20} max={3000} rows={4} defaultValue={plan.resources} />
      <CountedText label="The biggest risks, and what you will do about them" name="risks" min={20} max={3000} rows={4} defaultValue={plan.risks} />
      <Feedback state={state} />
      <DraftButtons submitLabel="Submit for approval" />
    </form>
  );
}

export function ActionPlanReviewForm({ enrollmentId }: { enrollmentId: string }) {
  const [state, action] = useActionState(reviewActionPlan, {} as FormState);
  const feedbackId = useId();
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <div className="space-y-1.5">
        <label htmlFor={feedbackId} className={labelClass}>
          Feedback for the learner
        </label>
        <textarea id={feedbackId} name="feedback" rows={4} required minLength={10} maxLength={5000} className={textareaClass} />
      </div>
      <Feedback state={state} />
      <ReviewButtons />
    </form>
  );
}

function ReviewButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="submit" name="decision" value="changes_requested" variant="secondary" disabled={pending}>
        Ask for changes
      </Button>
      <Button type="submit" name="decision" value="approved" disabled={pending} aria-busy={pending}>
        {pending ? 'Saving…' : 'Approve plan'}
      </Button>
    </div>
  );
}

// ---------- graduation ----------

type Requirement = Graduation['requirements'][number];

/** Faculty confirm one requirement (with an optional note), or withdraw their confirmation. */
export function RequirementForm({ enrollmentId, requirement }: { enrollmentId: string; requirement: Requirement }) {
  const [state, action] = useActionState(confirmRequirement, {} as FormState);
  const noteId = useId();
  const confirmed = !!requirement.confirmed;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="key" value={requirement.key} />
      <input type="hidden" name="confirmed" value={confirmed ? 'false' : 'true'} />
      {!confirmed && (
        <div className="space-y-1">
          <label htmlFor={noteId} className="text-[12.5px] font-semibold text-ink">
            Note (optional)
          </label>
          <input id={noteId} name="note" maxLength={1000} className="h-10 w-full rounded-[var(--radius-field)] bg-card px-3 text-[14px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Saving…" variant={confirmed ? 'secondary' : 'primary'}>
        {confirmed ? 'Withdraw confirmation' : 'Confirm'}
        <span className="sr-only"> {requirement.label}</span>
      </SubmitButton>
    </form>
  );
}

export function GraduateForm({ enrollmentId, name }: { enrollmentId: string; name: string }) {
  const [state, action] = useActionState(graduateLearner, {} as FormState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Graduate ${name}? Their graduation credential is issued at once.`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <Feedback state={state} />
      <SubmitButton pending="Graduating…">Graduate {name}</SubmitButton>
    </form>
  );
}

// ---------- portfolio ----------

export function ShareForm({ enrollmentId, shareUrl }: { enrollmentId: string; shareUrl: string | null }) {
  const [state, action] = useActionState(sharePortfolio, {} as FormState);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-2">
        <input type="hidden" name="enrollmentId" value={enrollmentId} />
        <input type="hidden" name="shared" value={shareUrl ? 'false' : 'true'} />
        <Feedback state={state} />
        <SubmitButton pending="Saving…" variant={shareUrl ? 'secondary' : 'primary'}>
          {shareUrl ? 'Stop sharing' : 'Publish at a link'}
        </SubmitButton>
      </form>
      {shareUrl && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-field)] bg-surface px-3 py-2 ring-1 ring-line">
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{shareUrl}</span>
          <button
            type="button"
            className={smallButton}
            onClick={() => {
              void navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true));
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- credentials ----------

export function VerifyForm({ defaultCode = '' }: { defaultCode?: string }) {
  const [state, action] = useActionState(lookUpCredential, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <TextInput label="Credential code" name="code" required maxLength={40} autoCapitalize="characters" spellCheck={false} placeholder="DL-7KQ2-M9TX-4HPR" defaultValue={state.values?.code ?? defaultCode} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Checking…">Check credential</SubmitButton>
    </form>
  );
}
