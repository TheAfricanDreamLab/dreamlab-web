'use client';

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { cx } from './primitives';

const fieldBase =
  'h-12 w-full rounded-[var(--radius-field)] bg-card px-4 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[var(--shadow-focus)]';

export function Field({
  label,
  hint,
  error,
  aside,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="flex items-center gap-2 text-[12.5px] text-danger-ink" role="alert">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-danger" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  error,
  aside,
  className,
  ...props
}: ComponentProps<'input'> & { label: string; hint?: ReactNode; error?: string; aside?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} aside={aside} htmlFor={id}>
      <input id={id} {...props} aria-invalid={Boolean(error)} className={cx(fieldBase, error && 'ring-danger-line', className)} />
    </Field>
  );
}

export function PasswordInput({
  label = 'Password',
  hint,
  error,
  aside,
  onValue,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { label?: string; hint?: ReactNode; error?: string; aside?: ReactNode; onValue?: (v: string) => void }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} aside={aside} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          {...props}
          type={visible ? 'text' : 'password'}
          onChange={(e) => {
            props.onChange?.(e);
            onValue?.(e.target.value);
          }}
          aria-invalid={Boolean(error)}
          className={cx(fieldBase, 'pr-16', error && 'ring-danger-line')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-1 my-auto h-10 min-w-11 rounded-lg px-3 text-[13px] font-medium text-muted hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </Field>
  );
}

const RULES = [
  { label: 'At least 10 characters', test: (p: string) => p.length >= 10, required: true },
  { label: 'Mix letters with numbers or symbols', test: (p: string) => /[a-z]/i.test(p) && /[^a-z]/i.test(p), required: false },
  { label: 'Not your name or email', test: (p: string, avoid: string[]) => p.length > 0 && !avoid.some((a) => a.length >= 3 && p.toLowerCase().includes(a.toLowerCase())), required: false },
];

/** New-password field with a live checklist and strength bar (rules check as you type). */
export function NewPasswordInput({ name = 'password', avoid = [], label = 'Create a password' }: { name?: string; avoid?: string[]; label?: string }) {
  const [value, setValue] = useState('');
  const passed = RULES.map((r) => r.test(value, avoid));
  const score = value ? passed.filter(Boolean).length + (value.length >= 14 ? 1 : 0) : 0;
  const strength = ['', 'Weak', 'Fair', 'Good', 'Strong'][score] ?? 'Strong';
  return (
    <div className="space-y-3">
      <PasswordInput name={name} label={label} autoComplete="new-password" required minLength={10} maxLength={128} onValue={setValue} />
      <div className="flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cx('h-1 flex-1 rounded-full', i <= score ? (score >= 3 ? 'bg-primary' : 'bg-gold') : 'bg-line')} />
        ))}
        <span className="ml-2 w-14 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{strength}</span>
      </div>
      <ul className="space-y-1.5 rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
        {RULES.map((r, i) => (
          <li key={r.label} className={cx('flex items-center gap-2.5 text-[13px]', passed[i] ? 'text-ink' : 'text-muted')}>
            <span className={cx('grid h-4 w-4 place-items-center rounded-[5px] text-[10px] text-white', passed[i] ? 'bg-primary' : 'bg-card ring-1 ring-line-heavy')}>
              {passed[i] ? '✓' : ''}
            </span>
            {r.label}
            {!r.required && <span className="text-faint">(recommended)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Six boxes for a one-time code. Paste-friendly; also offers the OS's "from messages" autofill. */
export function OtpInput({ name = 'code', length = 6, autoFocus = true }: { name?: string; length?: number; autoFocus?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const setFrom = (start: number, text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, length - start);
    if (!clean) return;
    const next = [...digits];
    clean.split('').forEach((d, i) => (next[start + i] = d));
    setDigits(next);
    refs.current[Math.min(start + clean.length, length - 1)]?.focus();
  };
  return (
    <div>
      <input type="hidden" name={name} value={digits.join('')} />
      <div className="flex justify-between gap-2" role="group" aria-label="One-time code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            autoFocus={autoFocus && i === 0}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            maxLength={length}
            onChange={(e) => {
              const v = e.target.value;
              if (v.length > 1) return setFrom(i, v);
              const next = [...digits];
              next[i] = v.replace(/\D/g, '');
              setDigits(next);
              if (next[i] && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
              if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              setFrom(i, e.clipboardData.getData('text'));
            }}
            className="h-14 w-full min-w-0 rounded-[var(--radius-field)] bg-card text-center font-mono text-xl text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary focus:shadow-[var(--shadow-focus)]"
          />
        ))}
      </div>
    </div>
  );
}

/** A "Resend in 0:47" button that unlocks after a countdown. */
export function ResendButton({ seconds = 60, formAction, children = 'Send a new code' }: { seconds?: number; formAction: (fd: FormData) => void; children?: ReactNode }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <button
      type="submit"
      formAction={formAction}
      formNoValidate
      disabled={left > 0}
      onClick={() => setTimeout(() => setLeft(seconds), 0)}
      className="text-[13px] font-semibold text-link disabled:font-medium disabled:text-muted"
    >
      {left > 0 ? `Resend in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : children}
    </button>
  );
}
