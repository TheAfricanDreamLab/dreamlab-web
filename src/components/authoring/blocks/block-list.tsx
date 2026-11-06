'use client';

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Block, BlockAuthoringSchema, toDeliveryBlock } from '@dreamlab/contracts';
import { useState } from 'react';
import { BLOCK_GROUPS, BLOCK_INFO, type BlockDoc, type BlockType, blockSummary, freshId, newBlock } from '@/lib/blocks';
import { plainMessage } from '@/lib/course-outline';
import { Badge, cx } from '@/components/ui/primitives';
import { JsonField, SmallButton } from '../fields';
import { RowMenu } from '../outline-tree';
import { PreviewBlocks } from '../preview-blocks';
import { BlockForm } from './block-forms';
import { move } from './controls';

/*
 * The visual block editor (CAT-4): a lesson step's blocks, or a quiz's questions, as cards. Each card
 * edits one block with a form, shows what is wrong with it as you type, previews it as learners see
 * it, and can be edited as JSON. New blocks are inserted from a picker, anywhere in the list.
 */

const FIELD_NAMES: Record<string, string> = {
  body: 'Text',
  title: 'Title',
  prompt: 'Question',
  options: 'Answers',
  items: 'Items',
  pairs: 'Pairs',
  terms: 'Terms',
  steps: 'Steps',
  explanation: 'Explanation',
  url: 'Image',
  alt: 'Description',
  credit: 'Credit',
  videoId: 'Video',
  channel: 'Made by',
  situation: 'Situation',
  outcome: 'What happens next',
  attribution: 'Who said it',
  text: 'Text',
  left: 'Left',
  right: 'Right',
  minLabel: 'Label for 1',
  maxLabel: 'Label for 5',
  id: 'Key',
};

/** What stops a block being published, in words an author recognises. */
export function blockProblems(block: BlockDoc, types?: BlockType[]): string[] {
  const out: string[] = [];
  if (types && !types.includes(block.type)) out.push(`Only ${types.map((t) => BLOCK_INFO[t].label.toLowerCase()).join(', ')} can go here`);
  const parsed = BlockAuthoringSchema.safeParse(block);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const where = issue.path
        .map((p) => (typeof p === 'number' ? `#${p + 1}` : (FIELD_NAMES[p] ?? p)))
        .join(' ')
        .trim();
      const message = plainMessage(issue.message);
      out.push(where ? `${where}: ${message}` : message);
    }
  }
  if (block.type === 'choice' && Array.isArray(block.options) && !(block.options as unknown[]).some((o) => !!o && typeof o === 'object' && (o as { correct?: unknown }).correct === true)) {
    out.push('Tick at least one right answer');
  }
  if (block.type === 'video' && !block.videoId) out.push('Video: paste a YouTube link or upload a file');
  if (block.type === 'image' && !block.url) out.push('Image: upload one or give an address');
  return [...new Set(out)].slice(0, 6);
}

/** Where block `n` ends up after the block at `from` moves to `to`. */
export function movedIndex(n: number, from: number, to: number): number {
  if (n === from) return to;
  if (from < to && n > from && n <= to) return n - 1;
  if (from > to && n >= to && n < from) return n + 1;
  return n;
}

export function BlockList({
  blocks,
  onChange,
  types,
  max,
  noun = 'block',
  context,
}: {
  blocks: BlockDoc[];
  onChange: (b: BlockDoc[]) => void;
  /** Allowed types (quiz questions: choice, order, match); all when omitted. */
  types?: BlockType[];
  max: number;
  noun?: string;
  /** Where these blocks are, for screen readers: "step 2", "the quiz". */
  context: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const taken = blocks.map((b) => b.id);
  const full = blocks.length >= max;

  const insert = (at: number, type: BlockType) => {
    if (blocks.length >= max) return setPicker(null);
    const next = [...blocks];
    next.splice(at, 0, newBlock(type, taken));
    onChange(next);
    setPicker(null);
    setOpen(at);
  };
  const duplicate = (i: number) => {
    setPicker(null);
    if (blocks.length >= max) return;
    const copy = { ...structuredClone(blocks[i]!), id: freshId(String(blocks[i]!.type ?? 'block').replace('_', '-'), taken) };
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    onChange(next);
    setOpen(i + 1);
  };

  const adder = (at: number) =>
    picker === at ? (
      <BlockPicker types={types} onPick={(t) => insert(at, t)} onClose={() => setPicker(null)} />
    ) : (
      <div className="group flex items-center gap-2">
        <span className="h-px flex-1 bg-line" aria-hidden />
        <button
          type="button"
          onClick={() => setPicker(at)}
          disabled={full}
          title={full ? `At most ${max} ${noun}s here` : undefined}
          className="min-h-9 rounded-full px-3 text-[13px] font-semibold text-link ring-1 ring-line hover:bg-success-tint disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={at === blocks.length ? `Add a ${noun} to ${context}` : `Insert a ${noun} before ${noun} ${at + 1} of ${context}`}
        >
          + {at === blocks.length ? `Add ${noun}` : 'Insert here'}
        </button>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>
    );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = Number(String(e.active.id).slice(4));
    const to = Number(String(e.over.id).slice(4));
    onChange(move(blocks, from, to));
    // The open block stays open wherever it ends up.
    setOpen(open === null ? null : movedIndex(open, from, to));
  };

  return (
    <div className="space-y-2">
      {blocks.length === 0 && <p className="rounded-[var(--radius-field)] bg-card px-3 py-4 text-center text-[13.5px] text-muted ring-1 ring-line">Nothing here yet. Add a {noun} below.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((_, i) => `blk-${i}`)} strategy={verticalListSortingStrategy}>
      {blocks.map((b, i) => (
        <div key={`${i}-${b.id}`} className="space-y-2">
          {picker === i && adder(i)}
          <BlockCard
            onInsertAfter={() => setPicker(i + 1)}
            block={b}
            types={types}
            index={i}
            count={blocks.length}
            noun={noun}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
            onChange={(next) => onChange(blocks.map((x, j) => (j === i ? next : x)))}
            onMove={(to) => {
              onChange(move(blocks, i, to));
              setOpen(open === null ? null : movedIndex(open, i, to));
            }}
            onDuplicate={() => duplicate(i)}
            onInsertBefore={() => setPicker(i)}
            canInsert={!full}
            onRemove={() => {
              if (!window.confirm(`Remove this ${BLOCK_INFO[b.type]?.label.toLowerCase() ?? noun}?`)) return;
              onChange(blocks.filter((_, j) => j !== i));
              setOpen(null);
            }}
          />
        </div>
      ))}
        </SortableContext>
      </DndContext>
      {picker !== blocks.length && picker !== null && picker > blocks.length ? null : adder(blocks.length)}
    </div>
  );
}

function BlockPicker({ types, onPick, onClose }: { types?: BlockType[]; onPick: (t: BlockType) => void; onClose: () => void }) {
  const groups = BLOCK_GROUPS.map((g) => ({ ...g, types: g.types.filter((t) => !types || types.includes(t)) })).filter((g) => g.types.length);
  return (
    <div className="space-y-3 rounded-[var(--radius-card)] bg-card p-4 shadow-sm ring-2 ring-primary" role="dialog" aria-label="Choose what to add">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-ink">What would you like to add?</p>
        <SmallButton onClick={onClose} label="Close the list">
          Cancel
        </SmallButton>
      </div>
      {groups.map((g) => (
        <div key={g.title} className="space-y-1.5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{g.title}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.types.map((t) => (
              <button key={t} type="button" onClick={() => onPick(t)} className="flex items-start gap-2.5 rounded-[var(--radius-field)] p-2.5 text-left ring-1 ring-line hover:bg-success-tint hover:ring-success-line">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-[15px] text-link">
                  {BLOCK_INFO[t].icon}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{BLOCK_INFO[t].label}</span>
                  <span className="block text-[12.5px] leading-snug text-muted">{BLOCK_INFO[t].help}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type Mode = 'form' | 'preview' | 'json';

function BlockCard({
  onInsertAfter,
  block,
  types,
  index,
  count,
  noun,
  open,
  onToggle,
  onChange,
  onMove,
  onDuplicate,
  onInsertBefore,
  canInsert,
  onRemove,
}: {
  onInsertAfter: () => void;
  block: BlockDoc;
  types?: BlockType[];
  index: number;
  count: number;
  noun: string;
  open: boolean;
  onToggle: () => void;
  onChange: (b: BlockDoc) => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onInsertBefore: () => void;
  canInsert: boolean;
  onRemove: () => void;
}) {
  const [mode, setMode] = useState<Mode>('form');
  const [jsonKey, setJsonKey] = useState(0);
  const info = BLOCK_INFO[block.type] ?? { label: String(block.type), icon: '?', help: '' };
  const problems = blockProblems(block, types);
  const name = `${info.label} ${noun} ${index + 1}`;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: `blk-${index}` });
  let preview: Block | null = null;
  if (problems.length === 0) {
    try {
      preview = toDeliveryBlock(BlockAuthoringSchema.parse(block), 'preview');
    } catch {
      preview = null;
    }
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        'group overflow-visible rounded-[var(--radius-field)] bg-card ring-1 transition-shadow',
        problems.length ? 'ring-danger-line' : 'ring-line',
        open && 'shadow-[var(--shadow-soft)]',
        isDragging && 'relative z-10 shadow-[var(--shadow-panel)] ring-2 ring-primary',
      )}
      aria-label={name}
    >
      <div className="flex items-center gap-1.5 py-2 pl-1 pr-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to move ${name}`}
          className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded text-faint opacity-50 hover:bg-surface hover:text-muted hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
        >
          <svg viewBox="0 0 8 14" className="h-3.5 w-2" aria-hidden fill="currentColor">
            {[2, 7, 12].flatMap((y) => [<circle key={`a${y}`} cx="2" cy={y} r="1.2" />, <circle key={`b${y}`} cx="6" cy={y} r="1.2" />])}
          </svg>
        </button>
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-[15px] text-link">
            {info.icon}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-ink">{info.label}</span>
              {problems.length > 0 && <Badge tone="danger">{problems.length === 1 ? '1 thing to fix' : `${problems.length} things to fix`}</Badge>}
            </span>
            <span className="block truncate text-[12.5px] text-muted">{blockSummary(block) || 'Empty'}</span>
          </span>
        </button>
        <RowMenu
          label={`${name} actions`}
          items={[
            { label: 'Move up', onSelect: () => onMove(index - 1), disabled: index === 0 },
            { label: 'Move down', onSelect: () => onMove(index + 1), disabled: index === count - 1 },
            'divider',
            { label: `Insert a ${noun} above`, onSelect: onInsertBefore, disabled: !canInsert },
            { label: `Insert a ${noun} below`, onSelect: onInsertAfter, disabled: !canInsert },
            { label: 'Duplicate', onSelect: onDuplicate, disabled: !canInsert },
            'divider',
            { label: 'Remove…', onSelect: onRemove, danger: true },
          ]}
        />
      </div>
      {open && (
        <div className="space-y-3 border-t border-line p-3">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={`${name}: view`}>
            {(
              [
                ['form', 'Edit'],
                ['preview', 'Preview'],
                ['json', 'JSON'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  if (m === 'json') setJsonKey((k) => k + 1);
                }}
                className={cx('min-h-9 rounded-full px-3 text-[13px] font-semibold ring-1', mode === m ? 'bg-forest text-white ring-forest' : 'text-body ring-line hover:bg-surface')}
              >
                {label}
              </button>
            ))}
          </div>
          {problems.length > 0 && (
            <ul className="space-y-0.5 rounded-lg bg-danger-tint px-3 py-2 text-[13px] text-danger-ink" aria-label={`${name}: to fix`}>
              {problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          )}
          {mode === 'form' && <BlockForm block={block} set={onChange} onInsertBlock={canInsert ? onInsertAfter : undefined} />}
          {mode === 'preview' &&
            (preview ? (
              <div className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
                <PreviewBlocks blocks={[preview]} />
              </div>
            ) : (
              <p className="text-[13.5px] text-muted">Fix the things above to preview this {noun}.</p>
            ))}
          {mode === 'json' && (
            <JsonField
              key={jsonKey}
              label={`${name} as JSON`}
              rows={12}
              value={block}
              onChange={(v) => {
                if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as BlockDoc).type === 'string') onChange(v as BlockDoc);
              }}
              hint="For power users: every field, including the key"
            />
          )}
        </div>
      )}
    </section>
  );
}
