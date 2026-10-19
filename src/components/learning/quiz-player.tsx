'use client';

import type { BlockResponse, QuizAttempt } from '@dreamlab/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { submitQuiz } from '@/app/actions/learning';
import { cx, Notice } from '@/components/ui/primitives';
import { dateTime, type QuizContent } from '@/lib/learning';
import { GradedInput, type GradedValue, initialValue, isComplete, marksFor, Verdict } from './answer-inputs';
import { RichText } from './rich-text';

export function QuizPlayer({
  enrollmentId,
  itemId,
  quiz,
  attempts,
  next,
}: {
  enrollmentId: string;
  itemId: string;
  quiz: QuizContent;
  attempts: QuizAttempt[];
  next: { id: string; title: string } | null;
}) {
  const fresh = () => Object.fromEntries(quiz.questions.map((q) => [q.id, initialValue(q)])) as Record<string, GradedValue>;
  const [answers, setAnswers] = useState<Record<string, GradedValue>>(fresh);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = [...attempts].sort((a, b) => b.attemptNo - a.attemptNo);
  const used = Math.max(attempts.length, attempt?.attemptNo ?? 0);
  const passedBefore = attempts.some((a) => a.passed) || Boolean(attempt?.passed);
  const left = quiz.maxAttempts === null ? null : Math.max(0, quiz.maxAttempts - used);
  const canTry = left === null || left > 0;
  const answered = quiz.questions.filter((q) => isComplete(q, answers[q.id]!)).length;
  const results = Object.fromEntries((attempt?.results ?? []).map((r) => [r.blockId, r]));

  const submit = async () => {
    setPending(true);
    setError(null);
    const res = await submitQuiz(enrollmentId, itemId, answers as Record<string, BlockResponse>)
      .catch(() => ({ ok: false as const, error: 'We couldn’t reach the server. Check your connection and try again.' }))
      .finally(() => setPending(false));
    if (!res.ok) return setError(res.error);
    setAttempt(res.data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const retry = () => {
    setAttempt(null);
    setAnswers(fresh());
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line sm:p-6">
        <RichText text={quiz.intro} />
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Questions', String(quiz.questions.length)],
            ['Pass mark', `${quiz.passPct}%`],
            ['Attempts', quiz.maxAttempts === null ? `${used} used` : `${used} of ${quiz.maxAttempts}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[var(--radius-field)] bg-surface px-2 py-2.5 ring-1 ring-line">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">{k}</dt>
              <dd className="font-display text-[17px] font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div aria-live="polite">
        {attempt && (
          <section className={cx('space-y-3 rounded-[var(--radius-card)] p-5 ring-1 sm:p-6', attempt.passed ? 'bg-success-tint ring-success-line' : 'bg-gold-tint ring-gold-line')}>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">Attempt {attempt.attemptNo}</p>
            <p className={cx('font-display text-[28px] font-extrabold', attempt.passed ? 'text-forest' : 'text-gold-ink')}>
              {attempt.scorePct}% · {attempt.passed ? 'Passed' : 'Not passed yet'}
            </p>
            <p className="text-[14.5px] text-body">
              {attempt.passed ? 'Well done. Look over the feedback below, then carry on.' : `You need ${quiz.passPct}% to pass. Read the feedback on each question, then try again.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {!attempt.passed && canTry && (
                <button type="button" onClick={retry} className="h-11 rounded-[var(--radius-field)] bg-primary px-5 text-[14.5px] font-semibold text-white hover:bg-primary-hover">
                  Try again
                </button>
              )}
              {attempt.passed && next && (
                <Link href={`/learn/${enrollmentId}/${next.id}`} className="inline-flex h-11 items-center rounded-[var(--radius-field)] bg-primary px-5 text-[14.5px] font-semibold text-white hover:bg-primary-hover">
                  Next: {next.title} <span aria-hidden className="ml-1.5">→</span>
                </Link>
              )}
            </div>
            {!attempt.passed && !canTry && <p className="text-[13.5px] text-gold-ink">You’ve used every attempt for this quiz.</p>}
          </section>
        )}
      </div>

      {!attempt && passedBefore && (
        <Notice tone="success">
          You’ve passed this quiz. You can take it again to practise{left !== null ? ` (${left} ${left === 1 ? 'attempt' : 'attempts'} left)` : ''}.
          {next && (
            <>
              {' '}
              <Link href={`/learn/${enrollmentId}/${next.id}`} className="font-semibold underline">
                Or go on to {next.title}.
              </Link>
            </>
          )}
        </Notice>
      )}

      {canTry || attempt ? (
        <ol className="space-y-5">
          {quiz.questions.map((q, i) => {
            const result = results[q.id];
            return (
              <li key={q.id} data-block-type={q.type} className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-6">
                <div className="space-y-1">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-link">
                    Question {i + 1} of {quiz.questions.length}
                  </p>
                  <p id={`${q.id}-prompt`} className="font-display text-[17.5px] font-semibold leading-snug text-ink">
                    {q.prompt}
                  </p>
                </div>
                <div role="group" aria-labelledby={`${q.id}-prompt`}>
                  <GradedInput
                    q={q}
                    value={answers[q.id]!}
                    onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                    disabled={Boolean(attempt) || pending}
                    marks={result ? marksFor(q, answers[q.id]!, result) : {}}
                    name={q.id}
                  />
                </div>
                {result && <Verdict q={q} result={result} />}
              </li>
            );
          })}
        </ol>
      ) : (
        <Notice tone="neutral">You’ve used every attempt for this quiz.</Notice>
      )}

      {!attempt && canTry && (
        <div className="space-y-2">
          {error && <Notice tone="error">{error}</Notice>}
          <button
            type="button"
            onClick={submit}
            disabled={pending || answered < quiz.questions.length}
            className="h-12 w-full rounded-[var(--radius-field)] bg-primary px-5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-heavy"
          >
            {pending ? 'Marking…' : 'Submit answers'}
          </button>
          <p className="text-center text-[12.5px] text-muted">
            {answered} of {quiz.questions.length} answered
          </p>
        </div>
      )}

      {history.length > 0 && (
        <section className="space-y-2" aria-labelledby="past-attempts">
          <h2 id="past-attempts" className="text-[16px] font-bold">
            Your attempts
          </h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-card ring-1 ring-line">
            {history.map((a) => (
              <li key={a.attemptNo} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                <span className="text-ink">Attempt {a.attemptNo}</span>
                <span className="text-muted">{dateTime(a.submittedAt)}</span>
                <span className={cx('font-mono font-semibold', a.passed ? 'text-link' : 'text-gold-ink')}>
                  {a.scorePct}% {a.passed ? '✓' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
