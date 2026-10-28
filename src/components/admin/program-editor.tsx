'use client';

import type { ProgramAuthoring } from '@dreamlab/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { saveProgram } from '@/app/actions/platform';
import { AreaField, JsonField, NumberField, SelectField, SmallButton, TextField } from '@/components/authoring/fields';
import { Button, Card, cx, Notice } from '@/components/ui/primitives';

type Phase = ProgramAuthoring['phases'][number];
type Options = { programTypes: readonly string[]; deliveryModes: readonly string[]; features: readonly string[]; courses: { slug: string; title: string }[] };

/** A JSON list of objects (the editor keeps the last valid one otherwise). */
const isObjectList = (v: unknown): v is object[] => Array.isArray(v) && v.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x));

const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Credits as the importer counts them: an elective phase counts its chosen courses at the largest course's credits. */
function credits(p: ProgramAuthoring): number {
  const phases = p.phases.reduce((n, ph) => n + (ph.chooseN ? ph.chooseN * Math.max(0, ...ph.courses.map((c) => c.creditHours)) : ph.courses.reduce((m, c) => m + c.creditHours, 0)), 0);
  return phases + p.capstoneStages.reduce((n, s) => n + s.creditHours, 0);
}

/**
 * A programme in the browser (platform admins): details and phases as forms, the capstone stages,
 * graduation requirements and week-by-week calendar as JSON. Saving imports it; cohorts already
 * scheduled keep the calendar they were given.
 */
export function ProgramEditor({ initial, isNew, options }: { initial: ProgramAuthoring; isNew: boolean; options: Options }) {
  const [doc, setDoc] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [created, setCreated] = useState(!isNew);
  const router = useRouter();
  // Bumped on every edit, so a save that finishes after more edits leaves the editor marked unsaved.
  const edits = useRef(0);
  const set = <K extends keyof ProgramAuthoring>(key: K, value: ProgramAuthoring[K]) => {
    setDoc((d) => ({ ...d, [key]: value }));
    setDirty(true);
    edits.current++;
  };
  const setPhase = (i: number, patch: Partial<Phase>) => set('phases', doc.phases.map((ph, j) => (j === i ? { ...ph, ...patch } : ph)));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    setBusy(true);
    setMessage(null);
    const sent = doc;
    const editsAtSave = edits.current;
    try {
      const res = await saveProgram(sent);
      if (!res.ok) return setMessage({ tone: 'error', text: res.error });
      const unchanged = edits.current === editsAtSave;
      if (unchanged) setDirty(false);
      // Moving to the programme's own address reloads the page; only when nothing is unsaved.
      if (!created && unchanged) router.replace(`/app/admin/catalog/programs/${sent.slug}`);
      setCreated(true);
      setMessage({ tone: 'success', text: `Saved. ${credits(sent)} credits. New cohorts use this programme from now on.` });
    } catch {
      setMessage({ tone: 'error', text: 'We could not reach Dream Lab to save. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  }

  const courseOptions = options.courses.map((c) => ({ value: c.slug, label: `${c.title} (${c.slug})` }));

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-card/95 p-3 ring-1 ring-line backdrop-blur lg:top-4">
        <p className="text-[14px] text-muted">
          <span className="font-semibold text-ink">{credits(doc)} credits</span> · {doc.phases.length} phases · {doc.capstoneStages.length} residency stages · {doc.calendar.length} weeks
          {dirty && <span className="ml-2 font-semibold text-gold-ink">Unsaved changes</span>}
        </p>
        <div className="flex gap-2">
          {created && (
            <Link href={`/programs/${doc.slug}`} target="_blank" className="inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-semibold text-link ring-1 ring-line hover:bg-surface">
              View page
            </Link>
          )}
          <Button type="button" onClick={() => void save()} disabled={busy || (!dirty && created)} size="md" className="w-auto">
            {busy ? 'Saving…' : isNew && !created ? 'Create programme' : 'Save'}
          </Button>
        </div>
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="text-[17px] font-bold">Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {isNew && !created ? (
            <TextField label="Slug" value={doc.slug} maxLength={80} onChange={(v) => set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} hint="Its web address; can’t change later" />
          ) : (
            <TextField label="Slug" value={doc.slug} onChange={() => undefined} hint="Fixed" />
          )}
          <TextField label="Title" value={doc.title} maxLength={160} onChange={(v) => set('title', v)} />
          <TextField label="Subtitle" value={doc.subtitle} maxLength={240} onChange={(v) => set('subtitle', v)} />
          <TextField label="Provider" value={doc.provider} maxLength={120} onChange={(v) => set('provider', v)} />
          <SelectField label="Type" value={doc.programType} options={options.programTypes.map((t) => ({ value: t, label: label(t) }))} onChange={(v) => set('programType', v as ProgramAuthoring['programType'])} />
          <SelectField label="Delivery" value={doc.deliveryMode} options={options.deliveryModes.map((t) => ({ value: t, label: label(t) }))} onChange={(v) => set('deliveryMode', v as ProgramAuthoring['deliveryMode'])} />
        </div>
        <AreaField label="Description" rows={5} value={doc.description} onChange={(v) => set('description', v)} />
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-semibold text-ink">Features</legend>
          <div className="flex flex-wrap gap-2">
            {options.features.map((f) => {
              const on = doc.features.includes(f as never);
              return (
                <label key={f} className={cx('inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-[13.5px] ring-1', on ? 'bg-success-tint ring-success-line' : 'bg-card ring-line')}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => set('features', (e.target.checked ? [...doc.features, f] : doc.features.filter((x) => x !== f)) as ProgramAuthoring['features'])}
                    className="h-4 w-4 accent-[var(--color-forest)]"
                  />
                  {label(f)}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      <section className="space-y-3" aria-labelledby="phases-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="phases-heading" className="text-[19px] font-bold">
            Phases
          </h2>
          <SmallButton
            onClick={() => set('phases', [...doc.phases, { key: `phase-${doc.phases.length + 1}`, name: `Phase ${doc.phases.length + 1}`, summary: '', weekFrom: null, weekTo: null, weightPct: 0, chooseN: null, courses: [] }])}
          >
            + Add phase
          </SmallButton>
        </div>
        {doc.phases.map((ph, i) => (
          <Card key={i} className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-[2fr_repeat(4,minmax(0,1fr))]">
              <TextField label={`Phase ${i + 1} name`} value={ph.name} maxLength={120} onChange={(v) => setPhase(i, { name: v })} />
              <NumberField label="From week" min={1} max={104} allowEmpty value={ph.weekFrom} onChange={(v) => setPhase(i, { weekFrom: v })} />
              <NumberField label="To week" min={1} max={104} allowEmpty value={ph.weekTo} onChange={(v) => setPhase(i, { weekTo: v })} />
              <NumberField label="Weight %" min={0} max={100} value={ph.weightPct} onChange={(v) => setPhase(i, { weightPct: v ?? 0 })} />
              <NumberField label="Choose" min={1} max={20} allowEmpty value={ph.chooseN} onChange={(v) => setPhase(i, { chooseN: v })} hint="Electives: learners pick this many" />
            </div>
            <AreaField label="Summary" rows={2} value={ph.summary} onChange={(v) => setPhase(i, { summary: v })} />
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-ink">Courses</p>
              {ph.courses.map((c, ci) => (
                <div key={ci} className="flex flex-wrap items-end gap-3 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line">
                  <div className="min-w-0 flex-1">
                    <SelectField
                      label={`Course ${ci + 1}`}
                      value={c.slug}
                      options={courseOptions.some((o) => o.value === c.slug) ? courseOptions : [{ value: c.slug, label: `${c.slug} (not in the catalogue)` }, ...courseOptions]}
                      onChange={(v) => setPhase(i, { courses: ph.courses.map((x, j) => (j === ci ? { ...x, slug: v } : x)) })}
                    />
                  </div>
                  <div className="w-32">
                    <NumberField label="Credits" min={0} max={60} step={0.5} value={c.creditHours} onChange={(v) => setPhase(i, { courses: ph.courses.map((x, j) => (j === ci ? { ...x, creditHours: v ?? 0 } : x)) })} />
                  </div>
                  {!ph.chooseN && (
                    <label className="flex min-h-11 items-center gap-2 text-[13.5px]">
                      <input
                        type="checkbox"
                        checked={c.required}
                        onChange={(e) => setPhase(i, { courses: ph.courses.map((x, j) => (j === ci ? { ...x, required: e.target.checked } : x)) })}
                        className="h-4 w-4 accent-[var(--color-forest)]"
                      />
                      Required
                    </label>
                  )}
                  <SmallButton tone="danger" label={`Remove course ${ci + 1}`} onClick={() => setPhase(i, { courses: ph.courses.filter((_, j) => j !== ci) })}>
                    Remove
                  </SmallButton>
                </div>
              ))}
              <SmallButton onClick={() => setPhase(i, { courses: [...ph.courses, { slug: options.courses[0]?.slug ?? '', creditHours: 5, required: true }] })}>+ Add course</SmallButton>
            </div>
            <div className="flex justify-end gap-2">
              <SmallButton label={`Move phase ${i + 1} up`} disabled={i === 0} onClick={() => set('phases', doc.phases.map((x, j) => (j === i - 1 ? doc.phases[i]! : j === i ? doc.phases[i - 1]! : x)))}>
                Move up
              </SmallButton>
              <SmallButton tone="danger" label={`Remove phase ${i + 1}`} onClick={() => set('phases', doc.phases.filter((_, j) => j !== i))}>
                Remove phase
              </SmallButton>
            </div>
          </Card>
        ))}
      </section>

      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="text-[17px] font-bold">Residency, graduation and calendar</h2>
        <JsonField
          label="Residency stages"
          rows={10}
          value={doc.capstoneStages}
          onChange={(v) => (isObjectList(v) ? set('capstoneStages', v as ProgramAuthoring['capstoneStages']) : setMessage({ tone: 'error', text: 'Residency stages must be a list of objects. The last valid list is kept.' }))}
          hint='[{ "name", "outputDocument", "creditHours", "summary" }] in order'
        />
        <JsonField
          label="Graduation requirements"
          rows={8}
          value={doc.graduationRequirements}
          onChange={(v) => (isObjectList(v) ? set('graduationRequirements', v as ProgramAuthoring['graduationRequirements']) : setMessage({ tone: 'error', text: 'Graduation requirements must be a list of objects. The last valid list is kept.' }))}
          hint='[{ "key", "label" }]'
        />
        <JsonField
          label="Calendar"
          rows={12}
          value={doc.calendar}
          onChange={(v) => (isObjectList(v) ? set('calendar', v as ProgramAuthoring['calendar']) : setMessage({ tone: 'error', text: 'The calendar must be a list of objects. The last valid list is kept.' }))}
          hint='[{ "weekNo", "phase" (a phase name), "focus", "majorOutput" }]'
        />
      </Card>
    </div>
  );
}
