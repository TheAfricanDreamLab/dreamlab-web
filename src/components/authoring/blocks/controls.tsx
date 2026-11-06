'use client';

import { type ReactNode, useId, useRef } from 'react';
import { RichEditor } from '../rich-editor';
import { cx } from '@/components/ui/primitives';
import { SmallButton } from '../fields';

/*
 * Building blocks for the block forms (CAT-4): a text area with formatting buttons, and a list
 * editor for options, pairs, terms and steps, with add, remove and move.
 */

const box =
  'w-full rounded-[var(--radius-field)] bg-card px-3 py-2.5 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface disabled:text-muted';

/**
 * Course text, edited as it will look (headings, lists, links, tables…). Kept as the name the block
 * forms use; the editor itself is RichEditor.
 */
export function RichTextField({
  label,
  value,
  onChange,
  rows = 4,
  maxLength = 12_000,
  hint,
  onInsertBlock,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  hint?: ReactNode;
  error?: string;
  onInsertBlock?: () => void;
}) {
  return <RichEditor label={label} value={value} onChange={onChange} rows={rows} maxLength={maxLength} hint={hint} onInsertBlock={onInsertBlock} />;
}

export const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x!);
  return next;
};

/**
 * A list of rows (options, pairs, terms, steps) the author can add to, remove from and reorder,
 * between `min` and `max` rows.
 */
export function ListEditor<T>({
  legend,
  items,
  onChange,
  render,
  create,
  min = 0,
  max = 12,
  noun,
  ordered = false,
  hint,
}: {
  legend: string;
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, set: (next: T) => void, index: number) => ReactNode;
  create: () => T;
  min?: number;
  max?: number;
  noun: string;
  ordered?: boolean;
  hint?: ReactNode;
}) {
  const list = useRef<HTMLOListElement>(null);
  // After a move, focus follows the row that moved (rows are keyed by position).
  const moveRow = (from: number, to: number, dir: 'up' | 'down') => {
    onChange(move(items, from, to));
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[aria-label="Move ${noun} ${to + 1} ${dir}"]:not(:disabled)`)?.focus());
  };
  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full flex-wrap items-baseline justify-between gap-2 text-[13px] font-semibold text-ink">
        {legend}
        <span className="text-[12px] font-normal text-muted">{hint ?? `${min}–${max}`}</span>
      </legend>
      <ol ref={list} className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 rounded-[var(--radius-field)] bg-surface p-2.5 ring-1 ring-line">
            {ordered && <span className="pt-2.5 font-mono text-[12px] text-muted">{i + 1}.</span>}
            <div className="min-w-0 flex-1">{render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))), i)}</div>
            <span className="flex shrink-0 flex-col items-center gap-0.5">
              <SmallButton onClick={() => moveRow(i, i - 1, 'up')} disabled={i === 0} label={`Move ${noun} ${i + 1} up`}>
                ↑
              </SmallButton>
              <SmallButton onClick={() => moveRow(i, i + 1, 'down')} disabled={i === items.length - 1} label={`Move ${noun} ${i + 1} down`}>
                ↓
              </SmallButton>
              <SmallButton tone="danger" onClick={() => onChange(items.filter((_, j) => j !== i))} disabled={items.length <= min} label={`Remove ${noun} ${i + 1}`}>
                ✕
              </SmallButton>
            </span>
          </li>
        ))}
      </ol>
      <SmallButton onClick={() => onChange([...items, create()])} disabled={items.length >= max}>
        + Add {noun}
      </SmallButton>
    </fieldset>
  );
}

/** A compact text input for rows inside a list. */
export function RowInput({ label, value, onChange, maxLength, placeholder, multiline = false }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number; placeholder?: string; multiline?: boolean }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[12px] font-semibold text-muted">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} rows={2} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(box, 'py-2 text-[14px]')} />
      ) : (
        <input id={id} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(box, 'h-10 py-0 text-[14px]')} />
      )}
    </div>
  );
}
