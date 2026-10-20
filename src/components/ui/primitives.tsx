import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** Small uppercase mono label used above headings ("ADMINISTRATOR ACCESS"). */
export function Eyebrow({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'gold' | 'green' | 'danger'; className?: string }) {
  const color = { muted: 'text-muted', gold: 'text-gold', green: 'text-link', danger: 'text-danger-ink' }[tone];
  return <p className={cx('font-mono text-[10.5px] uppercase tracking-[0.14em]', color, className)}>{children}</p>;
}

/**
 * The African Dream Network mark on a white tile (TADIS style: one squared corner), matching the
 * public site. Decorative: the link or text around it carries the name.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const h = Math.round(size * 0.775);
  const w = Math.round((h * 123) / 128);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cx('inline-grid shrink-0 place-items-center rounded-[12px_12px_12px_3px] bg-white shadow-[0_2px_8px_rgba(10,61,41,0.12)] ring-1 ring-line', className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 6 KB PNG, the only size there is */}
      <img src="/brand/adn-logo.png" alt="" width={w} height={h} decoding="async" />
    </span>
  );
}

/** An organisation's avatar: its initials (or "Me" for the personal space). Not the platform logo. */
export function OrgMark({ name, size = 30, personal = false, className }: { name: string; size?: number; personal?: boolean; className?: string }) {
  const letters = personal
    ? 'Me'
    : name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]!.toUpperCase())
        .join('');
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-[10px] font-display font-bold ring-1',
        personal ? 'bg-success-tint text-link ring-success-line' : 'bg-gold-tint text-gold-ink ring-gold-line',
        className,
      )}
    >
      {letters}
    </span>
  );
}

/** The logo. Always a link home: the site for visitors, the signed-in space (/app) for members. */
export function Brand({ subtitle, light = false, href = '/' }: { subtitle?: string; light?: boolean; href?: string }) {
  return (
    <Link href={href} aria-label="The African Dream Lab: home" className="inline-flex items-center gap-3">
      <LogoMark size={40} />
      <span className="leading-tight">
        <span className={cx('block font-display text-[15px] font-bold', light ? 'text-white' : 'text-ink')}>The African Dream Lab</span>
        {subtitle && <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-gold">{subtitle}</span>}
      </span>
    </Link>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-line-heavy disabled:text-white',
  secondary: 'bg-card text-ink ring-1 ring-line-strong hover:ring-line-heavy',
  ghost: 'text-link hover:bg-success-tint',
  danger: 'bg-card text-danger-ink ring-1 ring-danger-line hover:bg-danger-tint',
};

export function Button({
  variant = 'primary',
  size = 'lg',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: 'md' | 'lg' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-field)] font-semibold transition-colors disabled:cursor-not-allowed',
        size === 'lg' ? 'h-12 px-5 text-[15px]' : 'h-10 px-4 text-sm',
        buttonStyles[variant],
        className,
      )}
    />
  );
}

export function ButtonLink({ variant = 'primary', className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      {...props}
      className={cx('inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-field)] px-5 text-[15px] font-semibold transition-colors', buttonStyles[variant], className)}
    />
  );
}

export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={cx('font-semibold text-link hover:underline', className)} />;
}

/** Inline message box: info (gold), success (green), error (red), neutral. */
export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'success' | 'error' | 'neutral'; children: ReactNode; className?: string }) {
  const styles = {
    info: 'bg-gold-tint ring-gold-line text-gold-ink',
    success: 'bg-success-tint ring-success-line text-forest',
    error: 'bg-danger-tint ring-danger-line text-danger-ink',
    neutral: 'bg-surface ring-line text-body',
  }[tone];
  const dot = { info: 'bg-gold', success: 'bg-primary', error: 'bg-danger', neutral: 'bg-muted' }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-[var(--radius-field)] px-4 py-3 text-[13.5px] leading-relaxed ring-1', styles, className)}>
      <span aria-hidden className={cx('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
      <div>{children}</div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-card)] ring-1 ring-line', className)}>{children}</div>;
}

export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <span className="h-px flex-1 bg-line" />
      {label && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** A row of step dots: done, current, upcoming. */
export function Steps({ total, current, labels }: { total: number; current: number; labels?: string[] }) {
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <li key={n} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={cx(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                state === 'done' && 'bg-primary text-white',
                state === 'current' && 'bg-primary text-white ring-4 ring-success-tint',
                state === 'todo' && 'bg-card text-faint ring-1 ring-dashed ring-line-heavy',
              )}
              aria-current={state === 'current' ? 'step' : undefined}
              title={labels?.[i]}
            >
              {state === 'done' ? '✓' : n}
            </span>
            {n < total && <span className={cx('h-[3px] flex-1 rounded-full', n < current ? 'bg-primary' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'green' | 'gold' | 'danger'; children: ReactNode }) {
  const styles = {
    neutral: 'bg-surface text-muted ring-line',
    green: 'bg-success-tint text-link ring-success-line',
    gold: 'bg-gold-tint text-gold-ink ring-gold-line',
    danger: 'bg-danger-tint text-danger-ink ring-danger-line',
  }[tone];
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ring-1', styles)}>{children}</span>;
}
