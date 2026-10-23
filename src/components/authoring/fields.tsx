'use client';

import { useId, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui/primitives';

/*
 * Small controlled inputs for the draft editor. Every change goes straight into the document held
 * by DraftEditor; nothing is submitted until the author saves.
 */

const box =
  'w-full rounded-[var(--radius-field)] bg-card px-3 py-2.5 text-[15px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface disabled:text-muted';

function Label({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, placeholder, maxLength, className }: { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; placeholder?: string; maxLength?: number; className?: string }) {
  const id = useId();
  return (
    <div className={cx('space-y-1.5', className)}>
      <Label htmlFor={id} label={label} hint={hint} />
      <input id={id} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(box, 'h-11')} />
    </div>
  );
}

export function AreaField({ label, value, onChange, hint, placeholder, rows = 4, maxLength }: { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; placeholder?: string; rows?: number; maxLength?: number }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} label={label} hint={hint} />
      <textarea id={id} rows={rows} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={box} />
    </div>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, allowEmpty = false, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; step?: number; allowEmpty?: boolean; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} label={label} hint={hint} />
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        placeholder={allowEmpty ? 'None' : undefined}
        onChange={(e) => onChange(e.target.value === '' ? (allowEmpty ? null : 0) : Number(e.target.value))}
        className={cx(box, 'h-11')}
      />
    </div>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} label={label} />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(box, 'h-11')}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** One entry per line ("What learners will be able to do"). */
export function LinesField({ label, value, onChange, hint, rows = 4 }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: ReactNode; rows?: number }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <AreaField
      label={label}
      hint={hint ?? 'One per line'}
      rows={rows}
      value={text}
      onChange={(v) => {
        setText(v);
        onChange(v.split('\n').map((l) => l.trim()).filter(Boolean));
      }}
    />
  );
}

/**
 * Structured content as JSON (lesson blocks, quiz questions, anything the forms don't cover). Valid
 * JSON goes into the document as you type; while it doesn't parse, the document keeps the last valid value.
 */
export function JsonField({ label, value, onChange, rows = 10, hint }: { label: string; value: unknown; onChange: (v: unknown) => void; rows?: number; hint?: ReactNode }) {
  const id = useId();
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} label={label} hint={hint} />
      <textarea
        id={id}
        rows={rows}
        spellCheck={false}
        value={text}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Not valid JSON');
          }
        }}
        className={cx(box, 'font-mono text-[13px] leading-relaxed', error && 'ring-danger-line')}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12.5px] text-danger-ink">
          Not valid JSON yet ({error}). The last valid version is kept.
        </p>
      )}
    </div>
  );
}

export function SmallButton({ children, onClick, tone = 'default', label, disabled }: { children: ReactNode; onClick: () => void; tone?: 'default' | 'danger'; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cx(
        'min-h-9 rounded-lg px-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger' ? 'text-danger-ink hover:bg-danger-tint' : 'text-link hover:bg-success-tint',
      )}
    >
      {children}
    </button>
  );
}
