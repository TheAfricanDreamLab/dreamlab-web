'use client';

import type { BlockResponse, BlockResult } from '@dreamlab/contracts';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/components/ui/primitives';
import type { QuizQuestion } from '@/lib/learning';
import { RichText } from './rich-text';

/*
 * Inputs for the graded question types (choice, order, match), shared by lessons and quizzes.
 * Controlled, keyboard operable, no drag and drop.
 */

type Choice = Extract<QuizQuestion, { type: 'choice' }>;
type Order = Extract<QuizQuestion, { type: 'order' }>;
type Match = Extract<QuizQuestion, { type: 'match' }>;

export type Mark = 'right' | 'wrong';

export type GradedValue = { type: 'choice'; optionIds: string[] } | { type: 'order'; itemIds: string[] } | { type: 'match'; matches: Record<string, string> };

/** Starting value: the saved answer, or an empty one (order starts as shuffled by the server). */
export function initialValue(q: QuizQuestion, saved?: BlockResponse): GradedValue {
  if (saved && saved.type === q.type) return saved as GradedValue;
  if (q.type === 'choice') return { type: 'choice', optionIds: [] };
  if (q.type === 'order') return { type: 'order', itemIds: q.items.map((i) => i.id) };
  return { type: 'match', matches: {} };
}

export function isComplete(q: QuizQuestion, v: GradedValue): boolean {
  if (v.type === 'choice') return v.optionIds.length > 0;
  if (v.type === 'order') return true;
  return q.type === 'match' && q.left.every((l) => Boolean(v.matches[l.id]));
}

/** What to mark green or red once there is a verdict. */
export function marksFor(q: QuizQuestion, v: GradedValue, result: BlockResult | undefined): Record<string, Mark> {
  if (!result) return {};
  const marks: Record<string, Mark> = {};
  const sol = result.solution;
  if (q.type === 'choice' && v.type === 'choice') {
    const right = sol && 'optionIds' in sol ? new Set(sol.optionIds) : result.correct ? new Set(v.optionIds) : null;
    if (right) {
      for (const id of v.optionIds) marks[id] = right.has(id) ? 'right' : 'wrong';
      for (const id of right) marks[id] = 'right';
    } else if (result.correct === false && !q.multiple) {
      for (const id of v.optionIds) marks[id] = 'wrong';
    }
  }
  if (q.type === 'order' && v.type === 'order') {
    const right = sol && 'itemIds' in sol ? sol.itemIds : result.correct ? v.itemIds : null;
    if (right) v.itemIds.forEach((id, i) => (marks[id] = right[i] === id ? 'right' : 'wrong'));
  }
  if (q.type === 'match' && v.type === 'match') {
    const right = sol && 'matches' in sol ? sol.matches : result.correct ? v.matches : null;
    if (right) for (const l of q.left) marks[l.id] = right[l.id] === v.matches[l.id] ? 'right' : 'wrong';
  }
  return marks;
}

const markRing = (m: Mark | undefined, selected: boolean) =>
  m === 'right' ? 'ring-2 ring-primary bg-success-tint' : m === 'wrong' ? 'ring-2 ring-danger bg-danger-tint' : selected ? 'ring-2 ring-primary bg-card' : 'ring-1 ring-line-strong bg-card hover:ring-line-heavy';

function MarkIcon({ mark }: { mark: Mark | undefined }) {
  if (!mark) return null;
  return (
    <span className={cx('ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white', mark === 'right' ? 'bg-primary' : 'bg-danger')}>
      <span aria-hidden>{mark === 'right' ? '✓' : '✕'}</span>
      <span className="sr-only">{mark === 'right' ? 'correct' : 'not correct'}</span>
    </span>
  );
}

export function ChoiceInput({ q, value, onChange, disabled, marks, name }: { q: Choice; value: string[]; onChange: (ids: string[]) => void; disabled: boolean; marks: Record<string, Mark>; name: string }) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">{q.multiple ? 'Choose all that apply' : 'Choose one'}</legend>
      {q.multiple && <p className="text-[13.5px] font-semibold text-muted">Choose all that apply</p>}
      {q.options.map((o) => {
        const checked = value.includes(o.id);
        return (
          <label
            key={o.id}
            className={cx(
              'flex min-h-12 items-center gap-3 rounded-[var(--radius-field)] px-4 py-3 text-[15px] text-ink transition-shadow has-[:focus-visible]:shadow-[var(--shadow-focus)]',
              disabled ? 'cursor-default' : 'cursor-pointer',
              markRing(marks[o.id], checked),
            )}
          >
            <input
              type={q.multiple ? 'checkbox' : 'radio'}
              name={name}
              value={o.id}
              checked={checked}
              onChange={(e) => onChange(q.multiple ? (e.target.checked ? [...value, o.id] : value.filter((v) => v !== o.id)) : [o.id])}
              className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
            />
            <span className="min-w-0 flex-1 break-words">{o.text}</span>
            <MarkIcon mark={marks[o.id]} />
          </label>
        );
      })}
    </fieldset>
  );
}

export function OrderInput({ q, value, onChange, disabled, marks }: { q: Order; value: string[]; onChange: (ids: string[]) => void; disabled: boolean; marks: Record<string, Mark> }) {
  const text = Object.fromEntries(q.items.map((i) => [i.id, i.text]));
  const listRef = useRef<HTMLOListElement>(null);
  const [moved, setMoved] = useState<{ id: string; dir: 'up' | 'down' } | null>(null);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    if (!moved) return;
    const list = listRef.current;
    const btn = list?.querySelector<HTMLButtonElement>(`[data-move="${moved.id}:${moved.dir}"]`);
    const other = list?.querySelector<HTMLButtonElement>(`[data-move="${moved.id}:${moved.dir === 'up' ? 'down' : 'up'}"]`);
    (btn && !btn.disabled ? btn : other)?.focus();
  }, [moved, value]);

  const move = (index: number, dir: 'up' | 'down') => {
    const to = dir === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[index], next[to]] = [next[to]!, next[index]!];
    onChange(next);
    setMoved({ id: value[index]!, dir });
    setAnnounce(`${text[value[index]!]} moved to position ${to + 1} of ${value.length}.`);
  };

  return (
    <div className="space-y-2">
      <p className="text-[13.5px] font-semibold text-muted">Use the arrows to put these in order, first at the top.</p>
      <ol ref={listRef} className="space-y-2">
        {value.map((id, i) => (
          <li key={id} className={cx('flex items-center gap-3 rounded-[var(--radius-field)] py-2 pl-3 pr-2 text-[15px] text-ink', markRing(marks[id], false))}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface font-mono text-[12px] text-muted ring-1 ring-line">{i + 1}</span>
            <span className="min-w-0 flex-1 break-words">{text[id]}</span>
            <MarkIcon mark={marks[id]} />
            {!disabled && (
              <span className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  data-move={`${id}:up`}
                  onClick={() => move(i, 'up')}
                  disabled={i === 0}
                  aria-label={`Move “${text[id]}” up`}
                  className="grid h-10 w-11 place-items-center rounded-lg text-[15px] text-link ring-1 ring-line hover:bg-success-tint sm:h-8 sm:w-10 sm:text-[14px] disabled:text-faint disabled:hover:bg-transparent"
                >
                  ▲
                </button>
                <button
                  type="button"
                  data-move={`${id}:down`}
                  onClick={() => move(i, 'down')}
                  disabled={i === value.length - 1}
                  aria-label={`Move “${text[id]}” down`}
                  className="grid h-10 w-11 place-items-center rounded-lg text-[15px] text-link ring-1 ring-line hover:bg-success-tint sm:h-8 sm:w-10 sm:text-[14px] disabled:text-faint disabled:hover:bg-transparent"
                >
                  ▼
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

export function MatchInput({ q, value, onChange, disabled, marks }: { q: Match; value: Record<string, string>; onChange: (m: Record<string, string>) => void; disabled: boolean; marks: Record<string, Mark> }) {
  return (
    <div className="space-y-2">
      {q.left.map((l) => (
        <div key={l.id} className={cx('grid gap-2 rounded-[var(--radius-field)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center', markRing(marks[l.id], false))}>
          <label htmlFor={`${q.id}-${l.id}`} className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
            {l.text}
            <MarkIcon mark={marks[l.id]} />
          </label>
          <select
            id={`${q.id}-${l.id}`}
            value={value[l.id] ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [l.id]: e.target.value })}
            className="h-11 w-full min-w-0 rounded-[10px] bg-card px-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-80"
          >
            <option value="">Choose…</option>
            {q.right.map((r) => (
              <option key={r.id} value={r.id}>
                {r.text}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function GradedInput({ q, value, onChange, disabled, marks, name }: { q: QuizQuestion; value: GradedValue; onChange: (v: GradedValue) => void; disabled: boolean; marks: Record<string, Mark>; name: string }) {
  if (q.type === 'choice' && value.type === 'choice')
    return <ChoiceInput q={q} value={value.optionIds} onChange={(optionIds) => onChange({ type: 'choice', optionIds })} disabled={disabled} marks={marks} name={name} />;
  if (q.type === 'order' && value.type === 'order')
    return <OrderInput q={q} value={value.itemIds} onChange={(itemIds) => onChange({ type: 'order', itemIds })} disabled={disabled} marks={marks} />;
  if (q.type === 'match' && value.type === 'match')
    return <MatchInput q={q} value={value.matches} onChange={(matches) => onChange({ type: 'match', matches })} disabled={disabled} marks={marks} />;
  return null;
}

/** The right answer spelled out, for order and match (choice shows it on the options). */
export function SolutionView({ q, result }: { q: QuizQuestion; result: BlockResult }) {
  const sol = result.solution;
  if (!sol) return null;
  if (q.type === 'order' && 'itemIds' in sol) {
    const text = Object.fromEntries(q.items.map((i) => [i.id, i.text]));
    return (
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-ink">The right order</p>
        <ol className="list-decimal space-y-1 pl-5 text-[14px] text-body marker:font-semibold marker:text-link">
          {sol.itemIds.map((id) => (
            <li key={id}>{text[id] ?? id}</li>
          ))}
        </ol>
      </div>
    );
  }
  if (q.type === 'match' && 'matches' in sol) {
    const right = Object.fromEntries(q.right.map((r) => [r.id, r.text]));
    return (
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-ink">The right pairs</p>
        <ul className="space-y-1 text-[14px] text-body">
          {q.left.map((l) => (
            <li key={l.id}>
              {l.text} <span aria-hidden>→</span>
              <span className="sr-only">matches</span> <span className="font-semibold text-ink">{right[sol.matches[l.id] ?? ''] ?? '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

/** The verdict under a question. */
export function Verdict({ q, result, onRetry }: { q?: QuizQuestion; result: BlockResult; onRetry?: () => void }) {
  if (result.correct === null) return null;
  const tone = result.correct ? 'right' : result.solution ? 'answer' : 'wrong';
  const box = { right: 'bg-success-tint ring-success-line', wrong: 'bg-gold-tint ring-gold-line', answer: 'bg-surface ring-line-strong' }[tone];
  const title = { right: 'That’s right.', wrong: 'Not quite.', answer: 'Here’s the answer.' }[tone];
  return (
    <div className={cx('space-y-2.5 rounded-[var(--radius-field)] p-4 ring-1', box)}>
      <p className={cx('font-display text-[16px] font-bold', tone === 'right' ? 'text-forest' : tone === 'wrong' ? 'text-gold-ink' : 'text-ink')}>
        <span aria-hidden>{tone === 'right' ? '✓ ' : tone === 'wrong' ? '↻ ' : '◆ '}</span>
        {title}
      </p>
      {result.feedback && <p className="text-[14.5px] leading-relaxed text-body">{result.feedback}</p>}
      {q && !result.correct && <SolutionView q={q} result={result} />}
      {result.explanation && <RichText text={result.explanation} size="sm" />}
      {tone === 'wrong' && result.canRetry && onRetry && (
        <button type="button" onClick={onRetry} className="h-10 rounded-[10px] bg-card px-4 text-[14px] font-semibold text-ink ring-1 ring-line-strong hover:ring-line-heavy">
          Try again
        </button>
      )}
    </div>
  );
}
