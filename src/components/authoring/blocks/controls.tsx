'use client';

import { type ReactNode, useId, useRef } from 'react';
import { cx } from '@/components/ui/primitives';
import { SmallButton } from '../fields';

/*
 * Building blocks for the block forms (CAT-4): a text area with formatting buttons, and a list
 * editor for options, pairs, terms and steps, with add, remove and move.
 */

const box =
  'w-full rounded-[var(--radius-field)] bg-card px-3 py-2.5 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface disabled:text-muted';

const TOOLS: { label: string; title: string; apply: (sel: string) => { text: string; caret?: [number, number] } }[] = [
  { label: 'B', title: 'Bold', apply: (s) => ({ text: `**${s || 'bold text'}**`, caret: [2, 2 + (s || 'bold text').length] }) },
  { label: 'I', title: 'Italic', apply: (s) => ({ text: `*${s || 'italic text'}*`, caret: [1, 1 + (s || 'italic text').length] }) },
  {
    label: '•',
    title: 'Bulleted list',
    apply: (s) => ({ text: (s || 'First point\nSecond point').split('\n').map((l) => `- ${l.replace(/^\s*([-•]|\d+[.)])\s+/, '')}`).join('\n') }),
  },
  {
    label: '1.',
    title: 'Numbered list',
    apply: (s) => ({ text: (s || 'First step\nSecond step').split('\n').map((l, i) => `${i + 1}. ${l.replace(/^\s*([-•]|\d+[.)])\s+/, '')}`).join('\n') }),
  },
];

/**
 * Course text with formatting buttons. The text is stored as it is written (**bold**, *italic*,
 * "- " bullets, "1. " steps), which is what learners' pages render.
 */
export function RichTextField({
  label,
  value,
  onChange,
  rows = 4,
  maxLength = 12_000,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  hint?: ReactNode;
  error?: string;
}) {
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const format = (tool: (typeof TOOLS)[number]) => {
    const el = area.current;
    if (!el) return;
    const [start, end] = [el.selectionStart, el.selectionEnd];
    const { text, caret } = tool.apply(value.slice(start, end));
    // Lists start on their own line.
    const isList = tool.label === '•' || tool.label === '1.';
    const needsBreak = isList && start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const inserted = needsBreak + text;
    // Formatting that would not fit is skipped rather than cutting the end of the text.
    if (value.length - (end - start) + inserted.length > maxLength) return;
    el.focus();
    el.setSelectionRange(start, end);
    // Inserted as typing, so the field's own undo (Ctrl+Z) reverses it; React sees the input event.
    const typed = typeof document.execCommand === 'function' && document.execCommand('insertText', false, inserted);
    if (!typed) onChange(value.slice(0, start) + inserted + value.slice(end));
    requestAnimationFrame(() => {
      const at = start + needsBreak.length;
      el.setSelectionRange(caret ? at + caret[0] : at + text.length, caret ? at + caret[1] : at + text.length);
    });
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
        </label>
        <span className="flex items-center gap-1" role="toolbar" aria-label="Formatting">
          {TOOLS.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              aria-label={t.title}
              onClick={() => format(t)}
              className={cx('grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-[13px] text-body ring-1 ring-line hover:bg-surface', t.label === 'B' && 'font-bold', t.label === 'I' && 'italic')}
            >
              {t.label}
            </button>
          ))}
        </span>
      </div>
      <textarea
        ref={area}
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={cx(box, 'leading-relaxed', error && 'ring-danger-line')}
      />
      <p className="text-[12px] text-muted">{hint ?? 'Blank line = new paragraph. Use the buttons for bold, italic and lists.'}</p>
    </div>
  );
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
