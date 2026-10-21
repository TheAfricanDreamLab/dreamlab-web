import Link from 'next/link';
import type { ReactNode } from 'react';
import { CourseCover } from '@/components/learning/course-ui';
import { Icon, type IconName } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';

/* Dashboard pieces shared by the learner home (/app) and the platform overview (/app/admin). */

export type Period = 'month' | 'all';
export const PERIODS: Record<Period, string> = { month: 'This month', all: 'All time' };
export const periodOf = (v: string | undefined): Period => (v === 'all' ? 'all' : 'month');

/** Start of the current calendar month (UTC), for "This month". */
export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export const inPeriod = (iso: string | null | undefined, period: Period) => Boolean(iso) && (period === 'all' || new Date(iso!) >= monthStart());

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const fmt = (n: number) => n.toLocaleString('en-GB');

export function relative(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** The big page title row, with optional actions on the right. */
export function PageTitle({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-[30px] font-extrabold leading-tight sm:text-[38px]">{title}</h1>
        {intro && <p className="text-[14.5px] text-muted">{intro}</p>}
      </div>
      {actions}
    </header>
  );
}

type Stat = { label: string; value: number | string; /** 0–100, drawn as the thin bar under the number. */ pct: number; tone: 'jade' | 'gold' | 'forest'; hint?: string };

const BAR = { jade: 'bg-primary', gold: 'bg-gold', forest: 'bg-forest' } as const;
const TRACK = { jade: 'bg-success-tint', gold: 'bg-gold-tint', forest: 'bg-sage-tint' } as const;

/** Who this is: initials, name, role, how long they've been here, contact, and a row of stats. */
export function ProfileCard({
  name,
  greeting,
  role,
  since,
  contact,
  org,
  stats,
}: {
  name: string;
  greeting?: ReactNode;
  role: string;
  since: string;
  contact: { icon: IconName; text: string }[];
  org?: string;
  stats: Stat[];
}) {
  const days = daysSince(since);
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <section aria-label="Your profile" className="overflow-hidden rounded-[var(--radius-tile)] bg-card/90 shadow-[var(--shadow-soft)] ring-1 ring-line">
      <div className="grid gap-5 p-5 sm:p-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] 2xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[radial-gradient(120%_120%_at_0%_0%,#0f6a49_0%,#0a3d29_70%)] font-display text-[22px] font-bold text-white shadow-[0_10px_24px_rgba(10,61,41,0.25)] sm:h-20 sm:w-20 sm:text-[26px]">
            {letters}
          </span>
          <div className="min-w-0 space-y-1.5">
            {greeting}
            <p className="font-display text-[19px] font-bold leading-tight text-ink">{name}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-muted">
              <span className="font-semibold text-link">{role}</span>
              <span aria-hidden>·</span>
              <span>{days === 0 ? 'Joined today' : `${fmt(days)} ${days === 1 ? 'day' : 'days'} on the platform`}</span>
            </p>
            <ul className="space-y-1 pt-1 text-[13.5px] text-body">
              {contact.map((c) => (
                <li key={c.text} className="flex min-w-0 items-center gap-2">
                  <Icon name={c.icon} className="h-4 w-4 text-faint" />
                  <span className="min-w-0 truncate" title={c.text}>
                    {c.text}
                  </span>
                </li>
              ))}
              {org && (
                <li className="flex min-w-0 items-center gap-2">
                  <Icon name="building" className="h-4 w-4 text-faint" />
                  <span className="min-w-0 break-words">{org}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col justify-between gap-2 rounded-[20px] bg-surface/80 p-3 ring-1 ring-line sm:p-4">
              <dt className="text-[12.5px] leading-snug text-muted [overflow-wrap:normal] sm:text-[13.5px]">{s.label}</dt>
              <dd className="space-y-2">
                <span className="block font-display text-[24px] font-extrabold leading-none text-ink sm:text-[30px]">{typeof s.value === 'number' ? fmt(s.value) : s.value}</span>
                <span className={cx('block h-1.5 overflow-hidden rounded-full', TRACK[s.tone])} aria-hidden>
                  <span className={cx('block h-full rounded-full', BAR[s.tone])} style={{ width: `${Math.max(4, Math.min(100, s.pct))}%` }} />
                </span>
                {s.hint && <span className="block text-[12px] text-muted">{s.hint}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** "My summary" header: the period picker and a refresh, as a plain GET form (works without JavaScript). */
export function SummaryHeader({ id, title, period, action }: { id: string; title: string; period: Period; action: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-[22px] font-bold">
        {title}
      </h2>
      <form action={action} method="get" className="flex items-center gap-2">
        <label htmlFor={`${id}-period`} className="sr-only">
          Period
        </label>
        <select
          id={`${id}-period`}
          name="period"
          defaultValue={period}
          className="h-11 rounded-full bg-card px-4 text-[14px] font-semibold text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {Object.entries(PERIODS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" aria-label="Refresh" title="Refresh" className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink ring-1 ring-line-strong hover:ring-line-heavy">
          <Icon name="refresh" className="h-[18px] w-[18px]" />
        </button>
      </form>
    </div>
  );
}

const TILE = {
  jade: { box: 'bg-success-tint ring-success-line', ink: 'text-forest', count: 'bg-primary text-white' },
  gold: { box: 'bg-gold-tint ring-gold-line', ink: 'text-gold-ink', count: 'bg-gold text-white' },
  sky: { box: 'bg-sky-tint ring-sky-line', ink: 'text-sky-ink', count: 'bg-sky-ink text-white' },
  sage: { box: 'bg-sage-tint ring-sage-line', ink: 'text-forest', count: 'bg-forest text-white' },
} as const;

/** A soft summary tile: title, an open button, when it last changed, and a count in a circle. */
export function SummaryTile({ title, text, href, updated, note, count, tone }: { title: string; text: string; href: string; updated?: string | null; /** Shown instead of "Updated: …". */ note?: string; count: number | string; tone: keyof typeof TILE }) {
  const t = TILE[tone];
  return (
    <article className={cx('group relative flex min-h-[168px] flex-col justify-between gap-4 rounded-[var(--radius-tile)] p-5 ring-1 transition-shadow focus-within:ring-2 focus-within:ring-primary hover:shadow-[var(--shadow-soft)]', t.box)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className={cx('font-display text-[17px] font-bold leading-snug', t.ink)}>
            <Link href={href} className="after:absolute after:inset-0 after:rounded-[var(--radius-tile)] focus:outline-none">
              {title}
            </Link>
          </h3>
          <p className="text-[13.5px] leading-snug text-body">{text}</p>
        </div>
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-ink ring-1 ring-black/5 transition-transform group-hover:rotate-45">
          <Icon name="arrow" className="h-4 w-4" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[12.5px] text-muted">{note ?? (updated ? `Updated: ${relative(updated)}` : 'Nothing yet')}</p>
        <span className={cx('grid h-12 min-w-12 place-items-center rounded-full px-2 font-display text-[18px] font-bold', t.count)}>{typeof count === 'number' ? fmt(count) : count}</span>
      </div>
    </article>
  );
}

/** A course as a photo card with a corner badge and an open button. The whole card is the link. */
export function MediaCard({
  href,
  label,
  cover,
  title,
  meta,
  badge,
  progress,
}: {
  href: string;
  /** Accessible name of the link, when the title alone isn't clear. */
  label?: string;
  cover: Parameters<typeof CourseCover>[0]['cover'];
  title: string;
  meta: string;
  badge?: { text: string; tone: 'jade' | 'gold' | 'light' };
  progress?: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-tile)] bg-card shadow-[var(--shadow-soft)] ring-1 ring-line focus-within:ring-2 focus-within:ring-primary">
      <CourseCover cover={cover} className="aspect-[16/10] w-full" symbolSize={44}>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
        {badge && (
          <span
            className={cx(
              'absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] shadow-sm',
              badge.tone === 'jade' ? 'bg-primary text-white' : badge.tone === 'gold' ? 'bg-gold text-white' : 'bg-white/90 text-ink',
            )}
          >
            {badge.text}
          </span>
        )}
        <span aria-hidden className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-sm transition-transform group-hover:rotate-45">
          <Icon name="arrow" className="h-4 w-4" />
        </span>
        <div className="absolute inset-x-0 bottom-0 space-y-1 p-4 text-white">
          <h3 className="line-clamp-2 font-display text-[17px] font-bold leading-snug text-white">
            <Link href={href} aria-label={label} className="after:absolute after:inset-0 focus:outline-none">
              {title}
            </Link>
          </h3>
          <p className="text-[13px] text-white/85">{meta}</p>
          {progress !== undefined && (
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/25" aria-hidden>
              <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.max(3, progress)}%` }} />
            </span>
          )}
        </div>
      </CourseCover>
    </article>
  );
}

export type FeedEntry = {
  id: string;
  at: string;
  /** Initials, or an icon, in the round avatar. */
  avatar: { initials?: string; icon?: IconName; tone: 'jade' | 'gold' | 'sky' | 'sage' };
  title: string;
  subtitle?: string;
  tags?: string[];
  href?: string;
  hrefLabel?: string;
};

const AVATAR = { jade: 'bg-success-tint text-link ring-success-line', gold: 'bg-gold-tint text-gold-ink ring-gold-line', sky: 'bg-sky-tint text-sky-ink ring-sky-line', sage: 'bg-sage-tint text-forest ring-sage-line' } as const;

/** The right-hand timeline of recent activity. Below 1280px it sits under the page. */
export function ActivityFeed({ title = 'Recent activity', entries, empty }: { title?: string; entries: FeedEntry[]; empty: string }) {
  return (
    <section id="recent-activity" aria-labelledby="recent-activity-title" className="scroll-mt-24 rounded-[var(--radius-tile)] bg-card/80 p-5 shadow-[var(--shadow-soft)] ring-1 ring-line backdrop-blur xl:sticky xl:top-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="recent-activity-title" className="text-[20px] font-bold">
          {title}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-tint px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-link ring-1 ring-success-line">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" /> Feed
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-[20px] bg-surface p-4 text-[14px] text-muted ring-1 ring-line">{empty}</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
              <time dateTime={e.at} className="pt-3 text-right font-mono text-[11px] leading-tight text-muted">
                {new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                <span className="block text-faint">{new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              </time>
              <div className="relative flex min-w-0 items-start gap-3 rounded-[20px] bg-card p-3 ring-1 ring-line">
                <span aria-hidden className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-[13px] font-bold ring-1', AVATAR[e.avatar.tone])}>
                  {e.avatar.icon ? <Icon name={e.avatar.icon} className="h-[18px] w-[18px]" /> : e.avatar.initials}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[14px] font-semibold leading-snug text-ink">{e.title}</p>
                  {e.subtitle && (
                    <p className="truncate text-[13px] leading-snug text-muted" title={e.subtitle}>
                      {e.subtitle}
                    </p>
                  )}
                  {e.tags && e.tags.length > 0 && (
                    <p className="flex flex-wrap gap-1.5 pt-0.5">
                      {e.tags.map((t) => (
                        <span key={t} className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-medium text-body ring-1 ring-line">
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                {e.href && (
                  <Link href={e.href} aria-label={e.hrefLabel ?? `Open: ${e.title}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink ring-1 ring-line hover:bg-success-tint hover:ring-success-line">
                    <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Main column + the feed column (side by side from 1280px). */
export function DashboardGrid({ main, feed }: { main: ReactNode; feed: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div className="min-w-0 space-y-8">{main}</div>
      <div className="min-w-0">{feed}</div>
    </div>
  );
}
