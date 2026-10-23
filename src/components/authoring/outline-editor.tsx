'use client';

import { useId, useState } from 'react';
import { Badge, Card, cx } from '@/components/ui/primitives';
import { type ItemDoc, ITEM_TYPES, type ItemType, type ModuleDoc, newItem, slugify, uniqueKey } from '@/lib/authoring';
import { ITEM_LABELS } from '@/lib/learning';
import { AreaField, JsonField, LinesField, NumberField, SmallButton, TextField } from './fields';

type Open = { module: number; item?: number } | null;

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x!);
  return next;
};

/** Modules and their items, in order, with each item's content. */
export function OutlineEditor({ modules, setModules, open, setOpen }: { modules: ModuleDoc[]; setModules: (m: ModuleDoc[]) => void; open: Open; setOpen: (o: Open) => void }) {
  const [newTitle, setNewTitle] = useState('');
  const setModule = (i: number, m: ModuleDoc) => setModules(modules.map((x, j) => (j === i ? m : x)));
  const addModule = () => {
    const title = newTitle.trim() || `Module ${modules.length + 1}`;
    const key = uniqueKey(slugify(title, 'module'), modules.map((m) => m.key));
    setModules([...modules, { key, title, summary: '', weekNo: null, items: [newItem('lesson', 'First lesson', 'first-lesson')] }]);
    setNewTitle('');
    setOpen({ module: modules.length });
  };

  return (
    <div className="space-y-4">
      {modules.length === 0 && <Card className="p-6 text-[14.5px] text-muted">No modules yet. A course needs at least one module with one item.</Card>}
      {modules.map((m, mi) => (
        <ModuleCard
          key={`${mi}-${m.key}`}
          index={mi}
          count={modules.length}
          module={m}
          open={open?.module === mi}
          openItem={open?.module === mi ? open.item : undefined}
          setOpen={(item) => setOpen(open?.module === mi && item === undefined && open.item === undefined ? null : { module: mi, ...(item !== undefined && { item }) })}
          onChange={(next) => setModule(mi, next)}
          onMove={(to) => setModules(move(modules, mi, to))}
          onRemove={() => {
            if (window.confirm(`Remove the module “${m.title}” and its ${m.items.length} item(s)?`)) setModules(modules.filter((_, j) => j !== mi));
          }}
        />
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField label="New module" value={newTitle} onChange={setNewTitle} placeholder="Module title" maxLength={160} />
        </div>
        <button type="button" onClick={addModule} className="h-11 rounded-[var(--radius-field)] bg-primary px-4 text-[14px] font-semibold text-white hover:bg-forest">
          Add module
        </button>
      </div>
    </div>
  );
}

function ModuleCard({
  index,
  count,
  module: m,
  open,
  openItem,
  setOpen,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  module: ModuleDoc;
  open: boolean;
  openItem: number | undefined;
  setOpen: (item?: number) => void;
  onChange: (m: ModuleDoc) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const [type, setType] = useState<ItemType>('lesson');
  const [title, setTitle] = useState('');
  const typeId = useId();
  const setItem = (i: number, item: ItemDoc) => onChange({ ...m, items: m.items.map((x, j) => (j === i ? item : x)) });
  const addItem = () => {
    const t = title.trim() || `New ${ITEM_LABELS[type].toLowerCase()}`;
    const key = uniqueKey(slugify(t), m.items.map((x) => x.key));
    onChange({ ...m, items: [...m.items, newItem(type, t, key)] });
    setTitle('');
    setOpen(m.items.length);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3" id={`module-${index}`}>
        <button type="button" onClick={() => setOpen()} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Module {index + 1}</span>
          <span className="block truncate text-[16px] font-bold text-ink">{m.title || 'Untitled module'}</span>
        </button>
        <span className="flex items-center gap-1">
          <span className="mr-2 text-[12.5px] text-muted">{m.items.length} items</span>
          <SmallButton onClick={() => onMove(index - 1)} disabled={index === 0} label={`Move module ${index + 1} up`}>
            ↑
          </SmallButton>
          <SmallButton onClick={() => onMove(index + 1)} disabled={index === count - 1} label={`Move module ${index + 1} down`}>
            ↓
          </SmallButton>
          <SmallButton onClick={onRemove} tone="danger" label={`Remove module ${index + 1}`}>
            Remove
          </SmallButton>
        </span>
      </div>
      {open && (
        <div className="space-y-5 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <TextField label="Module title" value={m.title} maxLength={160} onChange={(v) => onChange({ ...m, title: v })} />
            <TextField label="Key" value={m.key} maxLength={48} onChange={(v) => onChange({ ...m, key: v })} hint="Stays the same across versions" />
            <NumberField label="Week" allowEmpty min={1} max={60} value={m.weekNo} onChange={(v) => onChange({ ...m, weekNo: v })} />
          </div>
          <AreaField label="Summary" rows={2} maxLength={600} value={m.summary} onChange={(v) => onChange({ ...m, summary: v })} />

          <ol className="space-y-2">
            {m.items.map((item, ii) => (
              <li key={`${ii}-${item.key}`} id={`module-${index}-item-${ii}`} className="rounded-[var(--radius-field)] ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <button type="button" onClick={() => setOpen(openItem === ii ? undefined : ii)} aria-expanded={openItem === ii} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Badge tone={item.type === 'assignment' ? 'gold' : item.type === 'quiz' ? 'green' : 'neutral'}>{ITEM_LABELS[item.type]}</Badge>
                    <span className="truncate font-semibold text-ink">{item.title || 'Untitled'}</span>
                    <span className="text-[12.5px] text-muted">{item.minutes} min</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <SmallButton onClick={() => onChange({ ...m, items: move(m.items, ii, ii - 1) })} disabled={ii === 0} label={`Move ${item.title} up`}>
                      ↑
                    </SmallButton>
                    <SmallButton onClick={() => onChange({ ...m, items: move(m.items, ii, ii + 1) })} disabled={ii === m.items.length - 1} label={`Move ${item.title} down`}>
                      ↓
                    </SmallButton>
                    <SmallButton
                      tone="danger"
                      label={`Remove ${item.title}`}
                      onClick={() => {
                        if (window.confirm(`Remove “${item.title}”?`)) onChange({ ...m, items: m.items.filter((_, j) => j !== ii) });
                      }}
                    >
                      Remove
                    </SmallButton>
                  </span>
                </div>
                {openItem === ii && (
                  <div className="space-y-4 border-t border-line p-3">
                    <ItemEditor item={item} onChange={(next) => setItem(ii, next)} />
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line">
            <div className="space-y-1.5">
              <label htmlFor={typeId} className="block text-[13px] font-semibold text-ink">
                New item
              </label>
              <select id={typeId} value={type} onChange={(e) => setType(e.target.value as ItemType)} className="h-11 rounded-[var(--radius-field)] bg-card px-3 text-[15px] ring-1 ring-line-strong">
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ITEM_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <TextField label="Item title" value={title} onChange={setTitle} maxLength={160} placeholder="What learners see in the outline" />
            </div>
            <button type="button" onClick={addItem} className="h-11 rounded-[var(--radius-field)] bg-card px-4 text-[14px] font-semibold text-link ring-1 ring-line-strong hover:bg-success-tint">
              Add item
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

const s = (v: unknown) => (typeof v === 'string' ? v : '');
const n = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);

/** The fields every item has, then the content for its type. */
function ItemEditor({ item, onChange }: { item: ItemDoc; onChange: (i: ItemDoc) => void }) {
  const p = item.payload;
  const setPayload = (patch: Record<string, unknown>) => onChange({ ...item, payload: { ...p, ...patch } });
  const graded = item.type === 'quiz' || item.type === 'assignment';

  return (
    <>
      <div className={cx('grid gap-3', graded ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem_7rem]' : 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem]')}>
        <TextField label="Title" value={item.title} maxLength={160} onChange={(v) => onChange({ ...item, title: v })} />
        <TextField label="Key" value={item.key} maxLength={48} onChange={(v) => onChange({ ...item, key: v })} hint="Keep it stable" />
        <NumberField label="Minutes" min={1} max={600} value={item.minutes} onChange={(v) => onChange({ ...item, minutes: v ?? 1 })} />
        {graded && <NumberField label="Grade weight" min={0} max={100} value={n(item.gradeWeight)} onChange={(v) => onChange({ ...item, gradeWeight: v ?? 0 })} hint="% of course" />}
      </div>
      <label className="flex items-center gap-2 text-[14px] text-ink">
        <input type="checkbox" checked={item.required !== false} onChange={(e) => onChange({ ...item, required: e.target.checked })} className="h-4 w-4 accent-[var(--color-primary)]" />
        Required to complete the course
      </label>

      {item.type === 'lesson' && <LessonEditor steps={(p.steps as Step[] | undefined) ?? []} onChange={(steps) => setPayload({ steps })} />}

      {item.type === 'quiz' && (
        <div className="space-y-3">
          <AreaField label="Introduction" rows={2} value={s(p.intro)} onChange={(v) => setPayload({ intro: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Pass mark (%)" min={1} max={100} value={n(p.passPct, 70)} onChange={(v) => setPayload({ passPct: v ?? 70 })} />
            <NumberField label="Attempts" allowEmpty min={1} value={(p.maxAttempts as number | null) ?? null} onChange={(v) => setPayload({ maxAttempts: v })} hint="Empty: unlimited" />
          </div>
          <JsonField
            label="Questions"
            rows={14}
            value={p.questions ?? []}
            onChange={(v) => setPayload({ questions: v })}
            hint="choice, order or match questions; answers stay on the server"
          />
        </div>
      )}

      {item.type === 'assignment' && (
        <div className="space-y-3">
          <AreaField label="Brief" rows={5} value={s(p.brief)} onChange={(v) => setPayload({ brief: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Practical Output" value={s(p.practicalOutput)} maxLength={160} onChange={(v) => setPayload({ practicalOutput: v || null })} hint="e.g. Problem Definition Canvas" />
            <NumberField label="Minimum words" min={0} max={5000} value={n(p.minWords, 150)} onChange={(v) => setPayload({ minWords: v ?? 0 })} />
          </div>
          <LinesField label="Steps" value={(p.steps as string[] | undefined) ?? []} onChange={(v) => setPayload({ steps: v })} hint="One per line, 1 to 12" />
          <RubricEditor rubric={(p.rubric as Criterion[] | undefined) ?? []} onChange={(rubric) => setPayload({ rubric })} />
          <AreaField label="Starting template (optional)" rows={4} value={s(p.template)} onChange={(v) => setPayload({ template: v || undefined })} />
        </div>
      )}

      {item.type === 'discussion' && (
        <div className="space-y-3">
          <AreaField label="Prompt" rows={3} value={s(p.prompt)} onChange={(v) => setPayload({ prompt: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Guidance (optional)" value={s(p.guidance)} maxLength={600} onChange={(v) => setPayload({ guidance: v || undefined })} />
            <NumberField label="Minimum words" min={0} max={1000} value={n(p.minWords, 40)} onChange={(v) => setPayload({ minWords: v ?? 0 })} />
          </div>
        </div>
      )}
    </>
  );
}

type Step = { id: string; title?: string; blocks: unknown[] };

/** Steps of a lesson. Each step's blocks are JSON (text, callouts, examples, videos, questions…). */
function LessonEditor({ steps, onChange }: { steps: Step[]; onChange: (s: Step[]) => void }) {
  const setStep = (i: number, step: Step) => onChange(steps.map((x, j) => (j === i ? step : x)));
  const [version, setVersion] = useState(0);
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={`${i}-${version}`} className="space-y-3 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line">
          <div className="flex flex-wrap items-end gap-3">
            <span className="pb-3 font-mono text-[12px] text-muted">Step {i + 1}</span>
            <div className="min-w-0 flex-1">
              <TextField label="Step title" value={step.title ?? ''} maxLength={120} onChange={(v) => setStep(i, { ...step, title: v || undefined })} />
            </div>
            <div className="w-40">
              <TextField label="Step key" value={step.id} maxLength={48} onChange={(v) => setStep(i, { ...step, id: v })} />
            </div>
            <SmallButton
              label={`Add a text block to step ${i + 1}`}
              onClick={() => {
                const ids = step.blocks.map((b) => (b as { id?: string }).id ?? '');
                setStep(i, { ...step, blocks: [...step.blocks, { id: uniqueKey(`text-${step.blocks.length + 1}`, ids), type: 'text', body: 'New paragraph.' }] });
                setVersion((v) => v + 1);
              }}
            >
              + Text block
            </SmallButton>
            <SmallButton tone="danger" label={`Remove step ${i + 1}`} disabled={steps.length === 1} onClick={() => onChange(steps.filter((_, j) => j !== i))}>
              Remove step
            </SmallButton>
          </div>
          <JsonField label="Blocks" rows={8} value={step.blocks} onChange={(v) => setStep(i, { ...step, blocks: Array.isArray(v) ? v : step.blocks })} hint="text, callout, example, video, choice, reflection…" />
        </div>
      ))}
      <SmallButton
        onClick={() => {
          const id = uniqueKey(`step-${steps.length + 1}`, steps.map((x) => x.id));
          onChange([...steps, { id, title: 'New step', blocks: [{ id: 'text-1', type: 'text', body: 'Write this step here.' }] }]);
        }}
      >
        + Add step
      </SmallButton>
    </div>
  );
}

type Criterion = { id: string; criterion: string; description: string };

function RubricEditor({ rubric, onChange }: { rubric: Criterion[]; onChange: (r: Criterion[]) => void }) {
  const set = (i: number, c: Criterion) => onChange(rubric.map((x, j) => (j === i ? c : x)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-semibold text-ink">Rubric (faculty score each criterion 0–4)</legend>
      {rubric.map((c, i) => (
        <div key={i} className="grid gap-2 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
          <TextField
            label="Criterion"
            value={c.criterion}
            maxLength={120}
            onChange={(v) => set(i, { ...c, criterion: v, id: c.id && c.id !== slugify(c.criterion, 'criterion') ? c.id : uniqueKey(slugify(v, 'criterion'), rubric.filter((_, j) => j !== i).map((x) => x.id)) })}
          />
          <TextField label="What meeting the standard looks like" value={c.description} maxLength={600} onChange={(v) => set(i, { ...c, description: v })} />
          <div className="flex items-end">
            <SmallButton tone="danger" label={`Remove criterion ${c.criterion}`} disabled={rubric.length === 1} onClick={() => onChange(rubric.filter((_, j) => j !== i))}>
              Remove
            </SmallButton>
          </div>
        </div>
      ))}
      <SmallButton
        disabled={rubric.length >= 10}
        onClick={() => onChange([...rubric, { id: uniqueKey(`criterion-${rubric.length + 1}`, rubric.map((x) => x.id)), criterion: 'New criterion', description: 'What meeting the standard looks like.' }])}
      >
        + Add criterion
      </SmallButton>
    </fieldset>
  );
}
