import type { CourseSummary, ProgramSummary } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Reveal, Tilt } from '@/components/landing/motion';
import { CourseCard, CourseCover, FeaturedCourseCard } from '@/components/learning/course-ui';
import { PageChrome } from '@/components/site/page-chrome';
import { Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { getClaims } from '@/lib/session';
import { DELIVERY_LABELS, LEVEL_LABELS, plural, PROGRAM_TYPE_LABELS } from '@/lib/learning';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Short, practical courses from The African Dream Lab. Free to start, made for phones and slow connections.',
};

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 80);
  const level = LEVELS.find((l) => l === sp.level);
  const program = sp.program && /^[a-z0-9-]{1,80}$/.test(sp.program) ? sp.program : undefined;

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (level) query.set('level', level);
  if (program) query.set('program', program);
  const [courses, programs, claims] = await Promise.all([
    api<{ items: CourseSummary[] }>('GET', `/v1/catalog/courses${query.size ? `?${query}` : ''}`),
    api<{ items: ProgramSummary[] }>('GET', '/v1/catalog/programs'),
    getClaims(),
  ]);
  // Signed in, the catalogue sits in the app beside the sidebar: a plain page heading, no marketing hero.
  const signedIn = Boolean(claims);

  const filtered = Boolean(q || level || program);
  const items = courses.ok ? courses.data.items : [];
  const featured = filtered ? [] : items.filter((c) => c.featured);
  const rest = filtered ? items : items.filter((c) => !c.featured);
  const programName = program && programs.ok ? programs.data.items.find((p) => p.slug === program)?.title : undefined;

  // Cards tilt in 3D on the public page; in the app they just lift a little, like the rest of it.
  const frame = (card: ReactNode, max: number) =>
    signedIn ? (
      <div className="h-full transition-transform duration-200 motion-safe:hover:-translate-y-0.5 [&>article]:h-full">{card}</div>
    ) : (
      <Tilt max={max} className="dl-tilt h-full rounded-[var(--radius-card)] [&>article]:h-full">
        {card}
      </Tilt>
    );

  const chipHref = (l?: string) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (l) p.set('level', l);
    if (program) p.set('program', program);
    return `/courses${p.size ? `?${p}` : ''}`;
  };

  return (
    <PageChrome next="/courses">
      <div className={cx('mx-auto max-w-6xl overflow-x-clip', signedIn ? 'space-y-8 py-2' : 'space-y-12 px-4 py-10 sm:px-6 sm:py-16')}>
        <section className={cx('space-y-6', !signedIn && 'text-center')}>
          {signedIn ? (
            <div className="space-y-1">
              <h1 className="text-[26px] font-bold">Courses</h1>
              <p className="text-[15px] text-muted">Short, practical courses you can take at your own pace.</p>
            </div>
          ) : (
            <div className="animate-rise mx-auto max-w-3xl space-y-3">
              <p className="font-display text-[13px] font-bold uppercase tracking-[0.16em] text-link">The African Dream Lab · Courses</p>
              <h1 className="text-[32px] font-extrabold leading-[1.05] min-[375px]:text-[36px] sm:text-[52px]">
                Learn the skills to <span className="text-link">build what you dream.</span>
              </h1>
              <p className="mx-auto max-w-2xl text-[16px] leading-relaxed text-body">
                Short, practical courses you can take at your own pace, on your phone. Free to start.
              </p>
            </div>
          )}

          <form
            action="/courses"
            method="get"
            role="search"
            className={cx(
              'flex max-w-xl gap-2 rounded-full bg-card p-1.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-primary',
              !signedIn && 'mx-auto shadow-[var(--shadow-soft)]',
            )}
          >
            {level && <input type="hidden" name="level" value={level} />}
            {program && <input type="hidden" name="program" value={program} />}
            <label htmlFor="course-search" className="sr-only">
              Search courses
            </label>
            <input
              id="course-search"
              type="search"
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder="Search courses"
              className="h-11 min-w-0 flex-1 rounded-full bg-transparent px-4 text-[15px] text-ink placeholder:text-faint focus:outline-none"
            />
            <button type="submit" className="h-11 shrink-0 rounded-full bg-primary px-5 text-[15px] font-semibold text-white hover:bg-primary-hover sm:px-6">
              Search
            </button>
          </form>

          <nav className={cx('flex flex-wrap gap-2', !signedIn && 'justify-center')} aria-label="Level">
            {[{ key: undefined, label: 'All levels' }, ...LEVELS.map((l) => ({ key: l, label: LEVEL_LABELS[l] }))].map((c) => (
              <Link
                key={c.label}
                href={chipHref(c.key)}
                aria-current={level === c.key ? 'page' : undefined}
                className={cx(
                  'inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-semibold ring-1',
                  level === c.key ? 'bg-forest text-white ring-forest' : 'bg-card text-body ring-line hover:ring-line-heavy',
                )}
              >
                {c.label}
              </Link>
            ))}
          </nav>
          {filtered && (
            <p className="text-[13.5px] text-muted">
              {courses.ok ? plural(items.length, 'course') : 'Courses'}
              {q && <> matching “{q}”</>}
              {programName && <> in {programName}</>}
              {level && <> · {LEVEL_LABELS[level]}</>} ·{' '}
              <Link href="/courses" className="font-semibold text-link hover:underline">
                Clear
              </Link>
            </p>
          )}
        </section>

        {!courses.ok ? (
          <Notice tone="error">{friendlyError(courses.error)}</Notice>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-[14.5px] text-muted">
            {filtered ? 'No courses match that. Try another word, or clear the filters.' : 'Courses are on their way. Check back soon.'}
          </Card>
        ) : (
          <>
            {featured.map((c) => (
              <Reveal key={c.id}>
                <FeaturedCourseCard course={c} />
              </Reveal>
            ))}
            <section className="space-y-5" aria-labelledby="all-courses">
              <h2 id="all-courses" className={cx('text-[24px] font-bold', !signedIn && 'text-center sm:text-left')}>
                {filtered ? 'Results' : featured.length ? 'More courses' : 'All courses'}
              </h2>
              <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((c) => (
                  <div key={c.id} data-stagger>
                    {frame(<CourseCard course={c} />, 6)}
                  </div>
                ))}
              </Reveal>
            </section>
          </>
        )}

        {programs.ok && programs.data.items.length > 0 && (
          <section className="space-y-4" aria-labelledby="programmes">
            <div className="space-y-1 text-center sm:text-left">
              <Eyebrow>Programmes</Eyebrow>
              <h2 id="programmes" className="text-[22px] font-bold">
                Go further with a programme
              </h2>
              <p className="text-[14px] text-muted">Courses in a set order, with a capstone project and a certificate at the end.</p>
            </div>
            <Reveal className="grid gap-4 md:grid-cols-2">
              {programs.data.items.map((p) => (
                <div key={p.id} data-stagger>
                  {frame(
                    <article className="relative flex overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-card)] ring-1 ring-line focus-within:ring-2 focus-within:ring-primary">
                      <CourseCover cover={p.cover} className="w-24 shrink-0 sm:w-32" symbolSize={36} />
                      <div className="space-y-1.5 p-4">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-gold-ink">
                          {PROGRAM_TYPE_LABELS[p.programType]} · {DELIVERY_LABELS[p.deliveryMode]}
                        </p>
                        <h3 className="text-[17px] font-bold leading-snug">
                          <Link href={`/programs/${p.slug}`} className="after:absolute after:inset-0 focus:outline-none">
                            {p.title}
                          </Link>
                        </h3>
                        <p className="line-clamp-2 text-[13.5px] text-muted">{p.subtitle}</p>
                        <p className="text-[12.5px] text-body">
                          {plural(p.courseCount, 'course')} · {p.creditTotal} credits{p.weeks ? ` · ${p.weeks} weeks` : ''}
                        </p>
                      </div>
                    </article>,
                    5,
                  )}
                </div>
              ))}
            </Reveal>
          </section>
        )}
      </div>
    </PageChrome>
  );
}
