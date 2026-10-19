'use client';

import { useActionState, useState } from 'react';
import { createOrganisation } from '@/app/actions/org';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Button, cx, Eyebrow, Notice, Steps } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

const KINDS = [
  { key: 'enterprise', title: 'A company or team', text: 'Invite colleagues and assign learning.', live: true, icon: '◆' },
  { key: 'institution', title: 'A school or academy', text: 'Run cohorts, admissions and credits.', live: false, icon: '▲' },
  { key: 'partner', title: 'A content partner', text: 'Publish courses for others to learn from.', live: false, icon: '●' },
  { key: 'sponsor', title: 'A sponsor or funder', text: 'Fund learners and follow their progress.', live: false, icon: '■' },
] as const;

const SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

/** Mirrors the API's slug generator, for the live preview only. The API decides the final address. */
function previewSlug(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 57)
    .replace(/-+$/g, '');
  return s.length >= 3 ? s : s ? `${s}-org` : '';
}

export function OrgWizard({ initialKind, domain }: { initialKind?: string; domain: string }) {
  const [state, action] = useActionState(createOrganisation, {} as FormState);
  const [step, setStep] = useState(state.values?.name ? 2 : 1);
  const [kind, setKind] = useState<string>(state.values?.kind ?? (KINDS.some((k) => k.key === initialKind) ? initialKind! : ''));
  const [name, setName] = useState(state.values?.name ?? '');
  const [slug, setSlug] = useState(state.values?.slug ?? '');
  const [editSlug, setEditSlug] = useState(Boolean(state.values?.slug));
  const [size, setSize] = useState(state.values?.sizeBand ?? '');
  const chosen = KINDS.find((k) => k.key === kind);
  const address = (editSlug ? slug : previewSlug(name)) || 'your-name';

  return (
    <form action={action} className="space-y-6">
      <Steps total={3} current={step} labels={['Type', 'Name', 'Review']} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="sizeBand" value={size} />
      {/* Steps unmount their inputs, so the submitted values live here. */}
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="slug" value={editSlug ? slug : ''} />

      {step === 1 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <Eyebrow>Step 1 of 3</Eyebrow>
            <h2 className="text-[22px] font-bold">What are you setting up?</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Organisation type">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                role="radio"
                aria-checked={kind === k.key}
                onClick={() => setKind(k.key)}
                className={cx(
                  'flex flex-col items-start gap-2 rounded-[var(--radius-card)] bg-card p-4 text-left ring-1 transition',
                  kind === k.key ? 'ring-2 ring-primary shadow-[var(--shadow-focus)]' : 'ring-line hover:ring-line-heavy',
                )}
              >
                <span className={cx('grid h-8 w-8 place-items-center rounded-lg text-sm', kind === k.key ? 'bg-primary text-white' : 'bg-surface text-muted')}>{k.icon}</span>
                <span className="font-display text-[15.5px] font-bold text-ink">{k.title}</span>
                <span className="text-[13px] leading-snug text-muted">{k.text}</span>
                <span className={cx('font-mono text-[10px] uppercase tracking-[0.1em]', k.live ? 'text-link' : 'text-gold-ink')}>
                  {k.live ? 'Ready straight away' : 'Short review first'}
                </span>
              </button>
            ))}
          </div>
          <Button type="button" disabled={!kind} onClick={() => setStep(2)}>
            Continue
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <Eyebrow>Step 2 of 3 · {chosen?.title}</Eyebrow>
            <h2 className="text-[22px] font-bold">What’s it called?</h2>
          </div>
          <TextInput label="Name" required minLength={2} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'institution' ? 'Lagos Business School' : 'Acme Ltd'} autoFocus error={state.fields?.name} />
          <div className="space-y-2 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Your web address</p>
              <button type="button" onClick={() => setEditSlug((v) => !v)} className="text-[12.5px] font-semibold text-link">
                {editSlug ? 'Choose for me' : 'Change'}
              </button>
            </div>
            {editSlug ? (
              <div className="flex items-center gap-1 text-[14px]">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder={previewSlug(name)}
                  className="h-9 min-w-0 flex-1 rounded-lg bg-surface px-2 font-mono text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Web address"
                  minLength={3}
                  maxLength={63}
                />
                <span className="font-mono text-muted">.{domain}</span>
              </div>
            ) : (
              <p className="break-all font-mono text-[14px] text-ink">
                {address}
                <span className="text-muted">.{domain}</span>
              </p>
            )}
            {state.fields?.slug && <p className="text-[12.5px] text-danger-ink">{state.fields.slug}</p>}
            <p className="text-[12px] text-muted">If it’s taken, we’ll add a number. You’ll see the final address before anyone else does.</p>
          </div>
          {kind === 'enterprise' && (
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-ink">How many people? (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(size === s ? '' : s)}
                    aria-pressed={size === s}
                    className={cx('rounded-full px-3.5 py-1.5 text-[13px] font-medium ring-1', size === s ? 'bg-forest text-white ring-forest' : 'bg-card text-body ring-line hover:ring-line-heavy')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button type="button" variant="secondary" className="px-6" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" disabled={name.trim().length < 2} onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <Eyebrow>Step 3 of 3</Eyebrow>
            <h2 className="text-[22px] font-bold">Ready to create {name.trim()}?</h2>
          </div>
          <dl className="space-y-2">
            {[
              ['Type', chosen?.title],
              ['Address', `${address}.${domain}`],
              ...(size ? [['Size', `${size} people`]] : []),
              ['Your role', 'Admin: you can invite people and run it'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
                <dt className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{k}</dt>
                <dd className="text-[14px] font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {chosen?.live ? (
            <Notice tone="success">Your space is ready as soon as you create it. You can invite your team straight away.</Notice>
          ) : (
            <Notice tone="info">
              We review new {chosen?.title.replace(/^an? /, '')}s before they go live, usually within two working days. Until then you can set things up and
              invite co-admins.
            </Notice>
          )}
          {state.error && <Notice tone="error">{state.error}</Notice>}
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button type="button" variant="secondary" className="px-6" onClick={() => setStep(2)}>
              Back
            </Button>
            <SubmitButton pending="Creating…">Create {chosen?.live ? 'and open' : 'and set up'}</SubmitButton>
          </div>
        </section>
      )}
    </form>
  );
}
