import type { CourseProgress, EnrollmentSummary, ItemType } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { CourseCover, ItemIcon, ProgressBar, StatusTick } from '@/components/learning/course-ui';
import { VideoFacade } from '@/components/learning/media';
import { BackLink, Breadcrumbs } from '@/components/ui/nav';
import { Badge, ButtonLink, Card, cx, Eyebrow, LogoMark, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api, type ApiResult } from '@/lib/gateway';
import { formatMinutes, hours, isUuid, ITEM_LABELS, plural, shortDate } from '@/lib/learning';

type Params = { params: Promise<{ enrollmentId: string }> };

/** The course behind an enrolment, with the learner's progress. */
const loadHome = cache(async (enrollmentId: string): Promise<ApiResult<CourseProgress> | { ok: false; status: 404 }> => {
  const mine = await api<{ items: EnrollmentSummary[] }>('GET', '/v1/learning/enrollments');
  if (!mine.ok) return mine;
  const found = mine.data.items.find((e) => e.id === enrollmentId);
  if (!found) return { ok: false, status: 404 };
  return api<CourseProgress>('GET', `/v1/learning/courses/${found.courseSlug}`);
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { enrollmentId } = await params;
  if (!isUuid(enrollmentId)) return { title: 'Course home' };
  const res = await loadHome(enrollmentId);
  return { title: res.ok ? `${res.data.course.title} · Course home` : 'Course home' };
}

const HOW: Record<ItemType, { one: string; many: string; text: string }> = {
  lesson: { one: 'lesson', many: 'lessons', text: 'Short steps with videos, examples and questions to try as you go. Wrong answers are how you learn here.' },
  quiz: { one: 'quiz', many: 'quizzes', text: 'A check at the end of a module. You can try again.' },
  assignment: { one: 'project', many: 'projects', text: 'Practical work you submit for faculty review.' },
  discussion: { one: 'discussion', many: 'discussions', text: 'Share your thinking, then read what classmates wrote.' },
};

export default async function CourseHomePage({ params }: Params) {
  const { enrollmentId } = await params;
  if (!isUuid(enrollmentId)) notFound();
  const res = await loadHome(enrollmentId);
  if (!res.ok) {
    if (res.status === 404) notFound();
    if (res.status === 401) redirect(`/login?next=${encodeURIComponent(`/learn/${enrollmentId}`)}`);
    return (
      <main className="mx-auto max-w-[680px] space-y-4 px-4 py-16">
        <Notice tone="error">{'error' in res ? friendlyError(res.error) : 'Something went wrong. Please try again.'}</Notice>
        <Link href="/app/learning" className="text-[14px] font-semibold text-link hover:underline">
          ← Back to my learning
        </Link>
      </main>
    );
  }

  const { course, enrollment, itemStatus, nextItem } = res.data;
  if (!enrollment) notFound();
  // The course page reports the enrolment for the current space; follow it if this link is an older one.
  if (enrollment.id !== enrollmentId) redirect(`/learn/${enrollment.id}`);

  const items = course.modules.flatMap((m) => m.items);
  const first = items[0];
  const started = enrollment.completedItems > 0 || Object.values(itemStatus).some((s) => s !== 'not_started');
  const finished = enrollment.status === 'completed';
  const counts = items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.type]: (acc[i.type] ?? 0) + 1 }), {});
  const totalMinutes = course.estimatedMinutes ?? items.reduce((s, i) => s + i.minutes, 0);
  const weeks = Math.max(0, ...course.modules.map((m) => m.weekNo ?? 0));
  const href = (id: string) => `/learn/${enrollment.id}/${id}`;

  const cta = finished ? (
    first && (
      <ButtonLink href={href(first.id)} variant="secondary" className="w-full sm:w-auto sm:px-7">
        Review the course
      </ButtonLink>
    )
  ) : nextItem && started ? (
    <ButtonLink href={href(nextItem.id)} className="w-full min-w-0 max-w-full sm:w-auto sm:px-7">
      <span className="min-w-0 truncate">Continue: {nextItem.title}</span>
    </ButtonLink>
  ) : (
    (nextItem ?? first) && (
      <ButtonLink href={href((nextItem ?? first)!.id)} className="w-full sm:w-auto sm:px-7">
        Start the course <span aria-hidden>→</span>
      </ButtonLink>
    )
  );

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-page/90">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link href="/app" aria-label="The African Dream Lab: home" className="shrink-0">
            <LogoMark size={36} />
          </Link>
          <BackLink href="/app/learning" label="My learning" />
          <Link href={`/courses/${course.slug}`} className="ml-auto inline-flex min-h-11 shrink-0 items-center text-[14px] font-semibold text-link hover:underline">
            Course page
          </Link>
        </div>
      </header>

      <CourseCover cover={course.cover} symbolSize={110} showCredit eager>
        <div className="relative mx-auto max-w-5xl space-y-4 px-4 py-10 sm:py-14">
          <Breadcrumbs tone="light" items={[{ label: 'My learning', href: '/app/learning' }, { label: course.title, href: `/courses/${course.slug}` }, { label: 'Course home' }]} />
          <Eyebrow tone="gold">Course home · {course.provider}</Eyebrow>
          <h1 className="max-w-3xl text-[28px] font-extrabold leading-[1.08] text-white min-[375px]:text-[32px] sm:text-[44px]">Welcome to {course.title}</h1>
          <p className="max-w-2xl text-[16px] leading-relaxed text-white/85">{course.subtitle}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {cta}
            {finished && <Badge tone="gold">Completed</Badge>}
          </div>
        </div>
      </CourseCover>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px] [&>*]:min-w-0">
        <div className="space-y-8">
          <section className="space-y-4" aria-labelledby="how">
            <h2 id="how" className="text-[22px] font-bold">
              How this course works
            </h2>
            {course.practicalOutput && (
              <div className="flex gap-4 rounded-[var(--radius-card)] bg-forest p-5 text-white">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold font-display text-[20px] font-bold text-forest">
                  ◆
                </span>
                <div className="space-y-1">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold">What you’ll make</p>
                  <p className="font-display text-[19px] font-bold text-white">{course.practicalOutput}</p>
                  <p className="text-[14px] leading-relaxed text-white/75">
                    Each lesson adds a piece. By the end you’ll have something real to use and to show.
                  </p>
                </div>
              </div>
            )}
            <ul className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(HOW) as ItemType[])
                .filter((t) => counts[t])
                .map((t) => (
                  <li key={t} className="flex gap-3 rounded-[var(--radius-field)] bg-card p-4 ring-1 ring-line">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success-tint text-link ring-1 ring-success-line">
                      <ItemIcon type={t} className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-[14.5px] font-semibold text-ink">
                        {counts[t]} {counts[t] === 1 ? HOW[t].one : HOW[t].many}
                      </span>
                      <span className="block text-[13px] leading-relaxed text-body">{HOW[t].text}</span>
                    </span>
                  </li>
                ))}
            </ul>
            <p className="text-[14px] leading-relaxed text-body">
              <span className="font-semibold text-ink">
                {course.creditHours} credit hours · about {hours(totalMinutes) ?? 1} hours of learning.
              </span>{' '}
              Go at your own pace{weeks ? `: the course is planned for ${plural(weeks, 'week')}` : ''}. A little every day works best, and your place is saved
              as you go, on any device. Reflections you write are kept in{' '}
              <Link href="/app/journal" className="font-semibold text-link hover:underline">
                your journal
              </Link>
              .
            </p>
          </section>

          {course.trailer && (
            <section className="space-y-3" aria-labelledby="trailer">
              <h2 id="trailer" className="text-[22px] font-bold">
                Start here
              </h2>
              <VideoFacade video={course.trailer} />
            </section>
          )}

          <section className="space-y-3" aria-labelledby="modules">
            <h2 id="modules" className="text-[22px] font-bold">
              Modules
            </h2>
            <ol className="space-y-4">
              {course.modules.map((m, mi) => {
                const done = m.items.filter((i) => itemStatus[i.id] === 'completed').length;
                const pct = m.items.length ? Math.round((done / m.items.length) * 100) : 0;
                return (
                  <li key={m.id}>
                    <Card className="overflow-hidden">
                      <div className="space-y-2 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-[15px] font-bold ring-1', done === m.items.length && m.items.length ? 'bg-primary text-white ring-primary' : 'bg-surface text-link ring-line')}>
                            {done === m.items.length && m.items.length ? '✓' : mi + 1}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="text-[17px] font-bold leading-snug">{m.title}</h3>
                            <p className="text-[13.5px] leading-relaxed text-muted">{m.summary}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:pl-12">
                          <ProgressBar pct={pct} label={`${m.title}: ${done} of ${m.items.length} done`} className="h-1.5" />
                          <span className="shrink-0 font-mono text-[11px] text-muted">
                            {done}/{m.items.length}
                            {m.weekNo ? ` · week ${m.weekNo}` : ''}
                          </span>
                        </div>
                      </div>
                      <ol className="divide-y divide-line border-t border-line">
                        {m.items.map((i) => (
                          <li key={i.id}>
                            <Link
                              href={href(i.id)}
                              className={cx('flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface sm:px-5', i.id === nextItem?.id && 'bg-success-tint/60')}
                            >
                              <StatusTick status={itemStatus[i.id]} />
                              <ItemIcon type={i.type} className="text-link" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[14.5px] font-medium text-ink">{i.title}</span>
                                <span className="block text-[12px] text-muted">
                                  {ITEM_LABELS[i.type]} · {i.minutes} min{i.required ? '' : ' · optional'}
                                </span>
                              </span>
                              {i.id === nextItem?.id && <Badge tone="green">Up next</Badge>}
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4 p-5 lg:sticky lg:top-6">
            <div className="space-y-1">
              <Eyebrow tone="green">Your progress</Eyebrow>
              <p className="font-display text-[30px] font-extrabold leading-none text-ink">{enrollment.progressPct}%</p>
            </div>
            <ProgressBar pct={enrollment.progressPct} label={`Course progress: ${enrollment.progressPct}%`} />
            <dl className="space-y-1.5 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Done</dt>
                <dd className="font-semibold text-ink">
                  {enrollment.completedItems} of {enrollment.totalItems}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Time to finish</dt>
                <dd className="font-semibold text-ink">
                  {formatMinutes(items.filter((i) => itemStatus[i.id] !== 'completed').reduce((s, i) => s + i.minutes, 0))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Enrolled</dt>
                <dd className="font-semibold text-ink">{shortDate(enrollment.enrolledAt)}</dd>
              </div>
            </dl>
            {nextItem && !finished && (
              <div className="space-y-2 border-t border-line pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Up next</p>
                <Link href={href(nextItem.id)} className="flex items-center gap-2 text-[14px] font-semibold text-link hover:underline">
                  <ItemIcon type={nextItem.type} />
                  <span className="min-w-0 truncate">{nextItem.title}</span>
                </Link>
                <p className="text-[12px] text-muted">{nextItem.moduleTitle}</p>
              </div>
            )}
          </Card>
        </aside>
      </main>
    </div>
  );
}
