'use client';

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ReactNode, useId } from 'react';
import { ItemIcon } from '@/components/learning/course-ui';
import { cx } from '@/components/ui/primitives';
import { type ItemDoc, type ModuleDoc, records, slugify, uniqueKey } from '@/lib/authoring';
import { type BlockDoc, LIMITS, QUESTION_TYPES } from '@/lib/blocks';
import { ITEM_NAMES } from '@/lib/course-outline';
import { BlockList } from './blocks/block-list';
import { move, RichTextField } from './blocks/controls';
import { AreaField, LinesField, NumberField, SmallButton, TextField } from './fields';
import { RowMenu } from './outline-tree';

/*
 * The centre of the course workspace (CAT-5): one module's settings, or one item's content.
 */

const s = (v: unknown) => (typeof v === 'string' ? v : '');
const n = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);

/** A large title field, edited in place. */
function TitleInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <input
      value={value}
      maxLength={160}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-transparent px-1 py-1 font-display text-[26px] font-extrabold leading-tight text-ink placeholder:text-faint hover:bg-surface focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}

function Advanced({ children }: { children: ReactNode }) {
  return (
    <details className="group rounded-lg ring-1 ring-line">
      <summary className="cursor-pointer list-none px-3 py-2 text-[12.5px] font-semibold text-muted hover:text-ink">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90" aria-hidden>
          ▶
        </span>
        Advanced
      </summary>
      <div className="border-t border-line p-3">{children}</div>
    </details>
  );
}

export function ModuleEditor({ index, module: m, onChange }: { index: number; module: ModuleDoc; onChange: (m: ModuleDoc) => void }) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Module {index + 1}</p>
        <TitleInput value={m.title} onChange={(v) => onChange({ ...m, title: v })} placeholder="Module title" label="Module title" />
      </header>
      <AreaField label="Summary" rows={3} maxLength={600} value={m.summary} onChange={(v) => onChange({ ...m, summary: v })} hint="One or two sentences learners see in the outline" />
      <div className="grid gap-3 sm:grid-cols-[10rem]">
        <NumberField label="Week" allowEmpty min={1} max={60} value={m.weekNo} onChange={(v) => onChange({ ...m, weekNo: v })} hint="Optional" />
      </div>
      <Advanced>
        <TextField label="Key" value={m.key} maxLength={48} onChange={(v) => onChange({ ...m, key: v })} hint="Stays the same across versions so progress carries over" />
      </Advanced>
      <p className="text-[13.5px] text-muted">
        {m.items.length} item{m.items.length === 1 ? '' : 's'}. Pick one in the outline to edit it, or use the module’s ⋯ menu to add more.
      </p>
    </div>
  );
}

/** The fields every item has, then the content for its type. */
export function ItemEditor({ moduleIndex, item, onChange }: { moduleIndex: number; item: ItemDoc; onChange: (i: ItemDoc) => void }) {
  const p = item.payload;
  const setPayload = (patch: Record<string, unknown>) => onChange({ ...item, payload: { ...p, ...patch } });
  const graded = item.type === 'quiz' || item.type === 'assignment';
  const reqId = useId();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          <ItemIcon type={item.type} className="h-3.5 w-3.5 text-link" />
          Module {moduleIndex + 1} · {ITEM_NAMES[item.type]}
        </p>
        <TitleInput value={item.title} onChange={(v) => onChange({ ...item, title: v })} placeholder={`${ITEM_NAMES[item.type]} title`} label="Title" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <NumberField label="Minutes" min={1} max={600} value={item.minutes} onChange={(v) => onChange({ ...item, minutes: v ?? 1 })} />
          </div>
          {graded && (
            <div className="w-32">
              <NumberField label="Grade weight %" min={0} max={100} value={n(item.gradeWeight)} onChange={(v) => onChange({ ...item, gradeWeight: v ?? 0 })} />
            </div>
          )}
          <label htmlFor={reqId} className="flex h-11 items-center gap-2 rounded-[var(--radius-field)] px-3 text-[14px] text-ink ring-1 ring-line">
            <input id={reqId} type="checkbox" checked={item.required !== false} onChange={(e) => onChange({ ...item, required: e.target.checked })} className="h-4 w-4 accent-[var(--color-primary)]" />
            Required to complete the course
          </label>
          <label htmlFor={`${reqId}-preview`} className="flex h-11 items-center gap-2 rounded-[var(--radius-field)] px-3 text-[14px] text-ink ring-1 ring-line" title="Anyone who can see the course page can open it before enrolling">
            <input
              id={`${reqId}-preview`}
              type="checkbox"
              checked={item.preview === true}
              onChange={(e) => onChange({ ...item, preview: e.target.checked || undefined })}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Free preview
          </label>
        </div>
        <Advanced>
          <TextField label="Key" value={item.key} maxLength={48} onChange={(v) => onChange({ ...item, key: v })} hint="Keep it stable: learners’ progress is tied to it" />
        </Advanced>
      </header>

      {item.type === 'lesson' && <LessonEditor steps={records<Step>(p.steps)} onChange={(steps) => setPayload({ steps })} />}

      {item.type === 'quiz' && (
        <div className="space-y-4">
          <RichTextField label="Introduction" rows={2} value={s(p.intro)} onChange={(v) => setPayload({ intro: v })} />
          <div className="flex flex-wrap gap-3">
            <div className="w-36">
              <NumberField label="Pass mark (%)" min={1} max={100} value={n(p.passPct, 70)} onChange={(v) => setPayload({ passPct: v ?? 70 })} />
            </div>
            <div className="w-36">
              <NumberField label="Attempts" allowEmpty min={1} value={(p.maxAttempts as number | null) ?? null} onChange={(v) => setPayload({ maxAttempts: v })} hint="Empty: unlimited" />
            </div>
          </div>
          <section className="space-y-2">
            <h3 className="text-[15px] font-bold text-ink">Questions</h3>
            <p className="text-[13px] text-muted">Multiple choice, put in order or match pairs. The answers stay on the server.</p>
            <BlockList
              blocks={records<BlockDoc>(p.questions)}
              onChange={(questions) => setPayload({ questions })}
              types={QUESTION_TYPES}
              max={LIMITS.quizQuestions}
              noun="question"
              context="the quiz"
            />
          </section>
        </div>
      )}

      {item.type === 'assignment' && (
        <div className="space-y-4">
          <RichTextField label="Brief" rows={5} value={s(p.brief)} onChange={(v) => setPayload({ brief: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Practical Output" value={s(p.practicalOutput)} maxLength={160} onChange={(v) => setPayload({ practicalOutput: v || null })} hint="e.g. Problem Definition Canvas" />
            <NumberField label="Minimum words" min={0} max={5000} value={n(p.minWords, 150)} onChange={(v) => setPayload({ minWords: v ?? 0 })} />
          </div>
          <LinesField label="Steps" value={Array.isArray(p.steps) ? p.steps.filter((x): x is string => typeof x === 'string') : []} onChange={(v) => setPayload({ steps: v })} hint="One per line, 1 to 12" />
          <RubricEditor rubric={records<Criterion>(p.rubric)} onChange={(rubric) => setPayload({ rubric })} />
          <AreaField label="Starting template (optional)" rows={4} value={s(p.template)} onChange={(v) => setPayload({ template: v || undefined })} />
        </div>
      )}

      {item.type === 'discussion' && (
        <div className="space-y-4">
          <RichTextField label="Prompt" rows={3} value={s(p.prompt)} onChange={(v) => setPayload({ prompt: v })} />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <TextField label="Guidance (optional)" value={s(p.guidance)} maxLength={600} onChange={(v) => setPayload({ guidance: v || undefined })} />
            <NumberField label="Minimum words" min={0} max={1000} value={n(p.minWords, 40)} onChange={(v) => setPayload({ minWords: v ?? 0 })} />
          </div>
        </div>
      )}
    </div>
  );
}

type Step = { id: string; title?: string; blocks: BlockDoc[] };

function SortableStep({ id, children }: { id: string; children: (grip: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const grip = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Drag to move this step"
      className="grid h-8 w-6 cursor-grab touch-none place-items-center rounded text-faint hover:bg-card hover:text-muted active:cursor-grabbing"
    >
      <svg viewBox="0 0 8 14" className="h-3.5 w-2" aria-hidden fill="currentColor">
        {[2, 7, 12].flatMap((y) => [<circle key={`a${y}`} cx="2" cy={y} r="1.2" />, <circle key={`b${y}`} cx="6" cy={y} r="1.2" />])}
      </svg>
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx(isDragging && 'relative z-10 opacity-70 shadow-[var(--shadow-panel)]')}>
      {children(grip)}
    </div>
  );
}

/** Steps of a lesson, each a list of blocks. Drag steps by their handle to reorder them. */
function LessonEditor({ steps, onChange }: { steps: Step[]; onChange: (s: Step[]) => void }) {
  const setStep = (i: number, step: Step) => onChange(steps.map((x, j) => (j === i ? step : x)));
  const ids = steps.map((x) => String(x.id ?? ''));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(move(steps, Number(String(e.active.id).slice(5)), Number(String(e.over.id).slice(5))));
  };
  const duplicate = (i: number) => {
    const step = steps[i]!;
    const next = [...steps];
    next.splice(i + 1, 0, { ...structuredClone(step), id: uniqueKey(`${String(step.id ?? 'step').slice(0, 38)}-copy`, ids), title: step.title ? `${step.title} (copy)` : undefined });
    onChange(next);
  };
  return (
    <section className="space-y-3" aria-label="Steps">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-bold text-ink">Steps</h3>
        <span className="text-[12.5px] text-muted">Learners go through one step at a time</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={steps.map((_, i) => `step-${i}`)} strategy={verticalListSortingStrategy}>
          {steps.map((step, i) => (
            <SortableStep key={`${i}-${String(step.id)}`} id={`step-${i}`}>
              {(grip) => (
                <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-3 ring-1 ring-line sm:p-4" aria-label={`Step ${i + 1}`}>
                  <div className="flex items-center gap-2">
                    {grip}
                    <span className="grid h-7 min-w-7 place-items-center rounded-full bg-forest px-2 font-mono text-[11px] font-bold text-white">{i + 1}</span>
                    <input
                      value={typeof step.title === 'string' ? step.title : ''}
                      maxLength={120}
                      placeholder={`Step ${i + 1} title (optional)`}
                      aria-label="Step title"
                      onChange={(e) => setStep(i, { ...step, title: e.target.value || undefined })}
                      className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-[15px] font-semibold text-ink placeholder:font-normal placeholder:text-faint hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <RowMenu
                      label={`Step ${i + 1} actions`}
                      items={[
                        { label: 'Move up', onSelect: () => onChange(move(steps, i, i - 1)), disabled: i === 0 },
                        { label: 'Move down', onSelect: () => onChange(move(steps, i, i + 1)), disabled: i === steps.length - 1 },
                        { label: 'Duplicate step', onSelect: () => duplicate(i), disabled: steps.length >= LIMITS.stepsPerLesson },
                        'divider',
                        {
                          label: 'Remove step…',
                          danger: true,
                          disabled: steps.length === 1,
                          onSelect: () => window.confirm(`Remove step ${i + 1} and its blocks?`) && onChange(steps.filter((_, j) => j !== i)),
                        },
                      ]}
                    />
                  </div>
                  <BlockList blocks={records<BlockDoc>(step.blocks)} onChange={(blocks) => setStep(i, { ...step, blocks })} max={LIMITS.blocksPerStep} context={`step ${i + 1}`} />
                  <details className="text-[12px] text-muted">
                    <summary className="cursor-pointer">Step key</summary>
                    <div className="mt-2 max-w-60">
                      <TextField label="Step key" value={typeof step.id === 'string' ? step.id : ''} maxLength={48} onChange={(v) => setStep(i, { ...step, id: v })} />
                    </div>
                  </details>
                </section>
              )}
            </SortableStep>
          ))}
        </SortableContext>
      </DndContext>
      <button
        type="button"
        disabled={steps.length >= LIMITS.stepsPerLesson}
        onClick={() => onChange([...steps, { id: uniqueKey(`step-${steps.length + 1}`, ids), title: undefined, blocks: [{ id: 'text-1', type: 'text', body: 'Write this step here.' }] }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-line-strong py-3 text-[14px] font-semibold text-link hover:bg-success-tint disabled:opacity-40"
      >
        + Add step
      </button>
    </section>
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
            value={typeof c.criterion === 'string' ? c.criterion : ''}
            maxLength={120}
            onChange={(v) => set(i, { ...c, criterion: v, id: c.id && c.id !== slugify(String(c.criterion ?? ''), 'criterion') ? c.id : uniqueKey(slugify(v, 'criterion'), rubric.filter((_, j) => j !== i).map((x) => x.id)) })}
          />
          <TextField label="What meeting the standard looks like" value={typeof c.description === 'string' ? c.description : ''} maxLength={600} onChange={(v) => set(i, { ...c, description: v })} />
          <div className="flex items-end">
            <SmallButton tone="danger" label={`Remove criterion ${i + 1}`} disabled={rubric.length === 1} onClick={() => onChange(rubric.filter((_, j) => j !== i))}>
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
