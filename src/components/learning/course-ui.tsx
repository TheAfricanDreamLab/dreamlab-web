import type { CourseSummary, ItemType } from '@dreamlab/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, cx } from '@/components/ui/primitives';
import { formatMinutes, LEVEL_LABELS } from '@/lib/learning';
import { safeImageUrl } from '@/lib/media';

type Cover = CourseSummary['cover'];

/**
 * Course artwork: the course's photo when it has one, under a wash of its two colours so text on
 * top stays readable; otherwise the gradient with its symbol. Photos load lazily from allowed hosts only.
 */
export function CourseCover({
  cover,
  className,
  symbolSize = 44,
  showCredit = false,
  eager = false,
  children,
}: {
  cover: Cover;
  className?: string;
  symbolSize?: number;
  showCredit?: boolean;
  eager?: boolean;
  children?: ReactNode;
}) {
  const photo = safeImageUrl(cover.imageUrl);
  return (
    <div className={cx('relative overflow-hidden', className)} style={{ background: `linear-gradient(135deg, ${cover.from} 0%, ${cover.to} 100%)` }}>
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote photo from an allowed host, served as it is */}
          <img
            src={photo}
            alt={cover.imageAlt ?? ''}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cover.from}e6 0%, ${cover.from}99 45%, ${cover.to}40 100%)` }} />
          {showCredit && cover.imageCredit && (
            <span className="absolute bottom-1.5 right-2.5 z-10 text-[10.5px] text-white/70">{cover.imageCredit}</span>
          )}
        </>
      ) : (
        <>
          <span aria-hidden className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-black/10" />
          <span aria-hidden style={{ fontSize: symbolSize }} className="absolute bottom-3 right-4 font-display font-bold leading-none text-white/85">
            {cover.symbol}
          </span>
        </>
      )}
      {children}
    </div>
  );
}

function Meta({ course }: { course: CourseSummary }) {
  return (
    <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
      {LEVEL_LABELS[course.level]} · {course.creditHours} credits
      {course.estimatedMinutes ? ` · ${formatMinutes(course.estimatedMinutes)}` : ''}
    </p>
  );
}

export function CourseCard({ course, extra }: { course: CourseSummary; extra?: ReactNode }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-card)] ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-primary hover:ring-line-heavy">
      <CourseCover cover={course.cover} className="h-28">
        {course.availability === 'coming_soon' && (
          <span className="absolute left-3 top-3">
            <Badge tone="gold">Coming soon</Badge>
          </span>
        )}
      </CourseCover>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[12px] font-semibold text-link">{course.provider}</p>
        <h3 className="text-[17px] font-bold leading-snug">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {course.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-[13.5px] leading-relaxed text-muted">{course.subtitle}</p>
        <div className="mt-auto space-y-2 pt-2">
          <Meta course={course} />
          {course.programs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {course.programs.map((p) => (
                <span key={p.slug} className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] text-body ring-1 ring-line">
                  {p.title}
                </span>
              ))}
            </div>
          )}
          {extra}
        </div>
      </div>
    </article>
  );
}

/** The big card at the top of the catalogue. */
export function FeaturedCourseCard({ course }: { course: CourseSummary }) {
  return (
    <article className="group relative grid overflow-hidden rounded-[var(--radius-panel)] bg-card shadow-[var(--shadow-panel)] ring-1 ring-line focus-within:ring-2 focus-within:ring-primary md:grid-cols-[0.9fr_1.1fr]">
      <CourseCover cover={course.cover} className="min-h-40 md:min-h-64" symbolSize={96}>
        <span className="absolute left-4 top-4">
          <Badge tone="gold">{course.availability === 'coming_soon' ? 'Coming soon' : 'Featured'}</Badge>
        </span>
      </CourseCover>
      <div className="space-y-3 p-6 sm:p-8">
        <p className="text-[13px] font-semibold text-link">{course.provider}</p>
        <h2 className="text-[28px] font-extrabold leading-tight">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {course.title}
          </Link>
        </h2>
        <p className="text-[15px] leading-relaxed text-body">{course.subtitle}</p>
        <Meta course={course} />
        {course.practicalOutput && (
          <p className="text-[13.5px] text-muted">
            You’ll make: <span className="font-semibold text-ink">{course.practicalOutput}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {course.skills.slice(0, 5).map((s) => (
            <span key={s} className="rounded-full bg-success-tint px-2.5 py-0.5 text-[12px] font-medium text-link ring-1 ring-success-line">
              {s}
            </span>
          ))}
        </div>
        <p className="pt-1 text-[14.5px] font-semibold text-link">
          See the course <span aria-hidden>→</span>
        </p>
      </div>
    </article>
  );
}

const ICONS: Record<ItemType, ReactNode> = {
  lesson: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v12H5.5A1.5 1.5 0 0 0 4 17.5v-12ZM16 5.5A1.5 1.5 0 0 0 14.5 4H10v12h4.5a1.5 1.5 0 0 1 1.5 1.5v-12Z" />,
  quiz: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M8 8a2 2 0 1 1 2.5 1.94c-.3.08-.5.35-.5.66V11.5M10 14h.01" />
    </>
  ),
  assignment: (
    <>
      <path d="M6 3h6l3 3v11H6z" />
      <path d="M8.5 10h4M8.5 13h4M12 3v3h3" />
    </>
  ),
  discussion: <path d="M4 5h12v8H9l-3 3v-3H4zM7.5 8.5h5M7.5 10.5h3" />,
};

export function ItemIcon({ type, className }: { type: ItemType; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cx('h-4 w-4 shrink-0', className)}>
      {ICONS[type]}
    </svg>
  );
}

/** A learner's mark on an item: done, started or not yet. */
export function StatusTick({ status }: { status: 'not_started' | 'in_progress' | 'completed' | undefined }) {
  if (status === 'completed')
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] text-white" role="img" aria-label="Done">
        ✓
      </span>
    );
  if (status === 'in_progress')
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full ring-2 ring-primary" role="img" aria-label="Started">
        <span className="h-2 w-2 rounded-full bg-primary" />
      </span>
    );
  return <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-line-heavy" role="img" aria-label="Not started" />;
}

export function ProgressBar({ pct, label, className, tone = 'primary' }: { pct: number; label: string; className?: string; tone?: 'primary' | 'gold' }) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
      <div className={cx('h-full rounded-full transition-[width]', tone === 'gold' ? 'bg-gold' : 'bg-primary')} style={{ width: `${value}%` }} />
    </div>
  );
}
