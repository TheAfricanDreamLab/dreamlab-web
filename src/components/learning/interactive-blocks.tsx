'use client';

import type { Block, BlockResponse, BlockResult } from '@dreamlab/contracts';
import { useState, type ReactNode } from 'react';
import { cx, Notice } from '@/components/ui/primitives';
import { isSettled, plural, type QuizQuestion, wordCount } from '@/lib/learning';
import { GradedInput, type GradedValue, initialValue, isComplete, marksFor, Verdict } from './answer-inputs';
import { RichText } from './rich-text';

/*
 * Lesson blocks the learner answers. Each one posts its answer to the server (which holds the
 * answers) and shows the verdict in place.
 */

type Interactive = Extract<Block, { type: 'choice' | 'order' | 'match' | 'poll' | 'scale' | 'reflection' | 'scenario' }>;
export type CheckFn = (response: BlockResponse) => Promise<string | null>;

export const isInteractive = (b: Block): b is Interactive => ['choice', 'order', 'match', 'poll', 'scale', 'reflection', 'scenario'].includes(b.type);

const primaryBtn =
  'inline-flex h-11 items-center justify-center rounded-[var(--radius-field)] bg-primary px-5 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-heavy';

function Shell({ block, result, label, prompt, children }: { block: Interactive; result?: BlockResult; label: string; prompt: ReactNode; children: ReactNode }) {
  const settled = isSettled(result);
  return (
    <section
      data-block-type={block.type}
      data-block-id={block.id}
      data-settled={settled ? 'true' : 'false'}
      aria-labelledby={`${block.id}-prompt`}
      className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-6"
    >
      <div className="space-y-1.5">
        <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-link">
          {label}
          {settled && (
            <span className="rounded-full bg-success-tint px-2 py-0.5 text-[9.5px] text-link ring-1 ring-success-line">
              Done <span aria-hidden>✓</span>
            </span>
          )}
        </p>
        <div id={`${block.id}-prompt`} className="font-display text-[18px] font-semibold leading-snug text-ink">
          {prompt}
        </div>
      </div>
      {children}
    </section>
  );
}

function useSubmit(onCheck: CheckFn) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (response: BlockResponse) => {
    setPending(true);
    setError(null);
    const err = await onCheck(response);
    setError(err);
    setPending(false);
    return !err;
  };
  return { pending, error, submit };
}

function Live({ children }: { children: ReactNode }) {
  return (
    <div aria-live="polite" className="space-y-3 empty:hidden">
      {children}
    </div>
  );
}

// ---------- Graded: choice, order, match ----------

function GradedBlock({ block, result, response, onCheck }: { block: Extract<Interactive, { type: 'choice' | 'order' | 'match' }>; result?: BlockResult; response?: BlockResponse; onCheck: CheckFn }) {
  const q = block as QuizQuestion;
  const [value, setValue] = useState<GradedValue>(() => initialValue(q, response));
  const [retrying, setRetrying] = useState(false);
  const { pending, error, submit } = useSubmit(onCheck);
  const showVerdict = Boolean(result) && !retrying;
  const locked = showVerdict || pending;
  const marks = showVerdict ? marksFor(q, value, result) : {};
  const label = block.type === 'choice' ? 'Question' : block.type === 'order' ? 'Put in order' : 'Match';

  return (
    <Shell block={block} result={retrying ? undefined : result} label={label} prompt={block.prompt}>
      <GradedInput q={q} value={value} onChange={setValue} disabled={locked} marks={marks} name={block.id} />
      {!showVerdict && (
        <button
          type="button"
          className={primaryBtn}
          disabled={pending || !isComplete(q, value)}
          onClick={async () => {
            if (await submit(value as BlockResponse)) setRetrying(false);
          }}
        >
          {pending ? 'Checking…' : 'Check'}
        </button>
      )}
      <Live>
        {error && <Notice tone="error">{error}</Notice>}
        {showVerdict && result && <Verdict q={q} result={result} onRetry={() => setRetrying(true)} />}
      </Live>
    </Shell>
  );
}

// ---------- Poll and scale: everyone's answers ----------

function Distribution({ rows, mine, total }: { rows: { key: string; label: string; count: number }[]; mine: string | undefined; total: number }) {
  return (
    <ul className="space-y-2" aria-label="How everyone answered">
      {rows.map((r) => {
        const pct = total ? Math.round((r.count / total) * 100) : 0;
        const isMine = r.key === mine;
        return (
          <li key={r.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className={cx(isMine ? 'font-semibold text-ink' : 'text-body')}>
                {r.label}
                {isMine && <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-link">Your answer</span>}
              </span>
              <span className="font-mono text-[12.5px] text-muted">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface ring-1 ring-line">
              <div className={cx('h-full rounded-full', isMine ? 'bg-primary' : 'bg-line-heavy')} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
      <li className="pt-1 text-[12px] text-muted">{plural(total, 'learner')} answered</li>
    </ul>
  );
}

const totalOf = (d: Record<string, number> | null) => Object.values(d ?? {}).reduce((s, n) => s + n, 0);

function PollBlock({ block, result, response, onCheck }: { block: Extract<Interactive, { type: 'poll' }>; result?: BlockResult; response?: BlockResponse; onCheck: CheckFn }) {
  const saved = response?.type === 'poll' ? response.optionId : undefined;
  const [choice, setChoice] = useState<string | undefined>(saved);
  const { pending, error, submit } = useSubmit(onCheck);
  return (
    <Shell block={block} result={result} label="Poll" prompt={block.prompt}>
      {!result ? (
        <>
          <fieldset className="space-y-2" disabled={pending}>
            <legend className="sr-only">Choose one</legend>
            {block.options.map((o) => (
              <label key={o.id} className={cx('flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-field)] px-4 py-3 text-[15px] text-ink has-[:focus-visible]:shadow-[var(--shadow-focus)]', choice === o.id ? 'bg-card ring-2 ring-primary' : 'bg-card ring-1 ring-line-strong hover:ring-line-heavy')}>
                <input type="radio" name={block.id} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="h-4 w-4 accent-[var(--color-primary)]" />
                {o.text}
              </label>
            ))}
          </fieldset>
          <button type="button" className={primaryBtn} disabled={!choice || pending} onClick={() => choice && submit({ type: 'poll', optionId: choice })}>
            {pending ? 'Sending…' : 'Vote'}
          </button>
        </>
      ) : null}
      <Live>
        {error && <Notice tone="error">{error}</Notice>}
        {result && (
          <>
            <Distribution rows={block.options.map((o) => ({ key: o.id, label: o.text, count: result.distribution?.[o.id] ?? 0 }))} mine={saved ?? choice} total={totalOf(result.distribution)} />
            {result.afterword && <RichText text={result.afterword} size="sm" className="rounded-[var(--radius-field)] bg-surface p-4 ring-1 ring-line" />}
          </>
        )}
      </Live>
    </Shell>
  );
}

function ScaleBlock({ block, result, response, onCheck }: { block: Extract<Interactive, { type: 'scale' }>; result?: BlockResult; response?: BlockResponse; onCheck: CheckFn }) {
  const saved = response?.type === 'scale' ? response.value : undefined;
  const [picked, setPicked] = useState<number | undefined>(saved);
  const { pending, error, submit } = useSubmit(onCheck);
  return (
    <Shell block={block} result={result} label="Your view" prompt={block.prompt}>
      {!result && (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2" role="group" aria-label={`1 means ${block.minLabel}, 5 means ${block.maxLabel}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                data-value={n}
                disabled={pending}
                aria-pressed={picked === n}
                onClick={() => {
                  setPicked(n);
                  void submit({ type: 'scale', value: n });
                }}
                className={cx(
                  'h-14 rounded-[var(--radius-field)] font-display text-[20px] font-bold transition-colors',
                  picked === n ? 'bg-primary text-white' : 'bg-surface text-ink ring-1 ring-line-strong hover:bg-success-tint hover:ring-success-line',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between gap-4 text-[12.5px] text-muted">
            <span>1 · {block.minLabel}</span>
            <span className="text-right">5 · {block.maxLabel}</span>
          </div>
        </div>
      )}
      <Live>
        {error && <Notice tone="error">{error}</Notice>}
        {result && (
          <>
            <Distribution
              rows={[1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: n === 1 ? `1 · ${block.minLabel}` : n === 5 ? `5 · ${block.maxLabel}` : String(n), count: result.distribution?.[String(n)] ?? 0 }))}
              mine={String(saved ?? picked)}
              total={totalOf(result.distribution)}
            />
            {result.afterword && <RichText text={result.afterword} size="sm" className="rounded-[var(--radius-field)] bg-surface p-4 ring-1 ring-line" />}
          </>
        )}
      </Live>
    </Shell>
  );
}

function ReflectionBlock({ block, result, response, onCheck }: { block: Extract<Interactive, { type: 'reflection' }>; result?: BlockResult; response?: BlockResponse; onCheck: CheckFn }) {
  const saved = response?.type === 'reflection' ? response.text : '';
  const [text, setText] = useState(saved);
  const [savedText, setSavedText] = useState(saved);
  const { pending, error, submit } = useSubmit(onCheck);
  const words = wordCount(text);
  const min = block.minWords ?? 0;
  const enough = words >= Math.max(1, min);
  const changed = text.trim() !== savedText.trim();
  return (
    <Shell block={block} result={result} label="Reflect" prompt={block.prompt}>
      {block.guidance && <p className="text-[14px] leading-relaxed text-muted">{block.guidance}</p>}
      <div className="space-y-1.5">
        <label htmlFor={`${block.id}-text`} className="sr-only">
          Your reflection
        </label>
        <textarea
          id={`${block.id}-text`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          maxLength={8000}
          aria-describedby={`${block.id}-count`}
          className="w-full rounded-[var(--radius-field)] bg-surface p-4 text-[15px] leading-relaxed text-ink ring-1 ring-line-strong placeholder:text-faint focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Write freely. Only you can see this."
        />
        <p id={`${block.id}-count`} className={cx('font-mono text-[11.5px]', enough ? 'text-link' : 'text-muted')}>
          {words} {words === 1 ? 'word' : 'words'}
          {min > 0 && ` · at least ${min}`}
          {enough && ' ✓'}
        </p>
      </div>
      {(!result || changed) && (
        <button
          type="button"
          className={primaryBtn}
          disabled={!enough || pending}
          onClick={async () => {
            if (await submit({ type: 'reflection', text: text.trim() })) setSavedText(text);
          }}
        >
          {pending ? 'Saving…' : result ? 'Save changes' : 'Save to my journal'}
        </button>
      )}
      <Live>
        {error && <Notice tone="error">{error}</Notice>}
        {result && !changed && (
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-link">
            <span aria-hidden>✓</span> Saved to your journal
          </p>
        )}
      </Live>
    </Shell>
  );
}

function ScenarioBlock({ block, result, response, onCheck }: { block: Extract<Interactive, { type: 'scenario' }>; result?: BlockResult; response?: BlockResponse; onCheck: CheckFn }) {
  const [chosen, setChosen] = useState<string | undefined>(response?.type === 'scenario' ? response.optionId : undefined);
  const { pending, error, submit } = useSubmit(onCheck);
  return (
    <Shell block={block} result={result} label="Scenario" prompt={block.prompt}>
      <div className="rounded-[var(--radius-field)] bg-gold-tint p-4 ring-1 ring-gold-line">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold-ink">The situation</p>
        <RichText text={block.situation} size="sm" />
      </div>
      <div className="space-y-2" role="group" aria-label="Your options">
        {block.options.map((o) => {
          const isChosen = chosen === o.id && Boolean(result);
          return (
            <button
              key={o.id}
              type="button"
              disabled={pending}
              aria-pressed={chosen === o.id}
              onClick={() => {
                setChosen(o.id);
                void submit({ type: 'scenario', optionId: o.id });
              }}
              className={cx(
                'flex w-full items-start gap-3 rounded-[var(--radius-field)] px-4 py-3 text-left text-[15px] text-ink transition-shadow',
                isChosen ? (result?.outcome?.best ? 'bg-success-tint ring-2 ring-primary' : 'bg-card ring-2 ring-gold') : 'bg-card ring-1 ring-line-strong hover:ring-line-heavy',
              )}
            >
              <span aria-hidden className={cx('mt-0.5 h-4 w-4 shrink-0 rounded-full ring-2', chosen === o.id ? 'bg-primary ring-primary' : 'ring-line-heavy')} />
              <span className="flex-1">{o.text}</span>
              {isChosen && result?.outcome?.best && <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-white">Best choice</span>}
            </button>
          );
        })}
      </div>
      <Live>
        {error && <Notice tone="error">{error}</Notice>}
        {result?.outcome && (
          <div className={cx('space-y-2 rounded-[var(--radius-field)] p-4 ring-1', result.outcome.best ? 'bg-success-tint ring-success-line' : 'bg-surface ring-line-strong')}>
            <p className={cx('font-display text-[16px] font-bold', result.outcome.best ? 'text-forest' : 'text-ink')}>
              {result.outcome.best ? '✓ The strongest choice.' : 'What happens next'}
            </p>
            <RichText text={result.outcome.text} size="sm" />
            {!result.outcome.best && <p className="text-[13px] text-muted">There may be a stronger move. Try another option to see where it leads.</p>}
          </div>
        )}
      </Live>
    </Shell>
  );
}

export function InteractiveBlock({ block, result, response, onCheck }: { block: Interactive; result?: BlockResult; response?: BlockResponse; onCheck: CheckFn }) {
  switch (block.type) {
    case 'choice':
    case 'order':
    case 'match':
      return <GradedBlock block={block} result={result} response={response} onCheck={onCheck} />;
    case 'poll':
      return <PollBlock block={block} result={result} response={response} onCheck={onCheck} />;
    case 'scale':
      return <ScaleBlock block={block} result={result} response={response} onCheck={onCheck} />;
    case 'reflection':
      return <ReflectionBlock block={block} result={result} response={response} onCheck={onCheck} />;
    case 'scenario':
      return <ScenarioBlock block={block} result={result} response={response} onCheck={onCheck} />;
  }
}
