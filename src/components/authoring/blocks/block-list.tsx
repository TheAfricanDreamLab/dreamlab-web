'use client';

import { type Block, BlockAuthoringSchema, toDeliveryBlock } from '@dreamlab/contracts';
import { useState } from 'react';
import { BLOCK_GROUPS, BLOCK_INFO, type BlockDoc, type BlockType, blockSummary, freshId, newBlock } from '@/lib/blocks';
import { Badge, cx } from '@/components/ui/primitives';
import { JsonField, SmallButton } from '../fields';
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
      const message = issue.code === 'too_small' && issue.type === 'string' ? 'needs filling in' : issue.message;
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
    const copy = { ...structuredClone(blocks[i]!), id: freshId(blocks[i]!.type.replace('_', '-'), taken) };
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

  return (
    <div className="space-y-2">
      {blocks.length === 0 && <p className="text-[13.5px] text-muted">Nothing here yet.</p>}
      {blocks.map((b, i) => (
        <div key={`${i}-${b.id}`} className="space-y-2">
          {picker === i && adder(i)}
          <BlockCard
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
              setOpen(open === i ? to : open);
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
      {adder(blocks.length)}
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
  let preview: Block | null = null;
  if (problems.length === 0) {
    try {
      preview = toDeliveryBlock(BlockAuthoringSchema.parse(block), 'preview');
    } catch {
      preview = null;
    }
  }

  return (
    <section className={cx('overflow-hidden rounded-[var(--radius-field)] bg-card ring-1', problems.length ? 'ring-danger-line' : 'ring-line')} aria-label={name}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
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
        <span className="flex flex-wrap items-center gap-0.5">
          <SmallButton onClick={() => onMove(index - 1)} disabled={index === 0} label={`Move ${name} up`}>
            ↑
          </SmallButton>
          <SmallButton onClick={() => onMove(index + 1)} disabled={index === count - 1} label={`Move ${name} down`}>
            ↓
          </SmallButton>
          <SmallButton onClick={onInsertBefore} disabled={!canInsert} label={`Insert a ${noun} above ${name}`}>
            + Above
          </SmallButton>
          <SmallButton onClick={onDuplicate} disabled={!canInsert} label={`Duplicate ${name}`}>
            Duplicate
          </SmallButton>
          <SmallButton tone="danger" onClick={onRemove} label={`Remove ${name}`}>
            Remove
          </SmallButton>
        </span>
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
          {mode === 'form' && <BlockForm block={block} set={onChange} />}
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
