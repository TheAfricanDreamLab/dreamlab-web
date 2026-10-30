import type { CourseDetail, CourseProgress } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CourseCover, ItemIcon, ProgressBar, StatusTick } from '@/components/learning/course-ui';
import { EnrolForm } from '@/components/learning/enrol-form';
import { VideoFacade } from '@/components/learning/media';
import { RichText } from '@/components/learning/rich-text';
import { PageChrome } from '@/components/site/page-chrome';
import { Breadcrumbs } from '@/components/ui/nav';
import { Badge, ButtonLink, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api, type ApiResult } from '@/lib/gateway';
import { formatMinutes, hours, ITEM_LABELS, LEVEL_LABELS, plural, SLUG } from '@/lib/learning';
import { initials } from '@/lib/labels';
import { getClaims } from '@/lib/session';

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

/** The course with this visitor's progress; falls back to the plain catalogue page if learning is unavailable. */
const loadCourse = cache(async (slug: string): Promise<ApiResult<CourseProgress>> => {
  const res = await api<CourseProgress>('GET', `/v1/learning/courses/${slug}`);
  if (res.ok || res.status === 404) return res;
  const plain = await api<CourseDetail>('GET', `/v1/catalog/courses/${slug}`);
  if (!plain.ok) return res;
  return { ok: true, status: 200, data: { course: { ...plain.data, trailer: plain.data.trailer ?? null }, enrollment: null, itemStatus: {}, nextItem: null, learnerCount: 0 } };
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG.test(slug)) return { title: 'Course' };
  const res = await loadCourse(slug);
  return res.ok ? { title: res.data.course.title, description: res.data.course.subtitle } : { title: 'Course' };
}

export default async function CoursePage({ params, searchParams }: Params) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const sp = await searchParams;
  const [res, claims] = await Promise.all([loadCourse(slug), getClaims()]);
  if (!res.ok && res.status === 404) notFound();

  const here = `/courses/${slug}`;
  if (!res.ok) {
    return (
      <PageChrome next={here}>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Notice tone="error">{friendlyError(res.error)}</Notice>
        </div>
      </PageChrome>
    );
  }

  const { course, enrollment, itemStatus, nextItem, learnerCount } = res.data;
  const comingSoon = course.availability === 'coming_soon';
  const items = course.modules.flatMap((m) => m.items);
  const totalMinutes = course.estimatedMinutes ?? items.reduce((s, i) => s + i.minutes, 0);
  const openModule = course.modules.find((m) => m.items.some((i) => i.id === nextItem?.id))?.id ?? course.modules[0]?.id;

  const cta = comingSoon ? (
    <button type="button" disabled className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-field)] bg-line-heavy px-5 text-[15px] font-semibold text-white">
      Coming soon
    </button>
  ) : enrollment ? (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-semibold text-ink">{enrollment.status === 'completed' ? 'Completed' : 'Your progress'}</span>
        <span className="font-mono text-muted">
          {enrollment.completedItems} of {enrollment.totalItems} · {enrollment.progressPct}%
        </span>
      </div>
      <ProgressBar pct={enrollment.progressPct} label={`Course progress: ${enrollment.progressPct}%`} />
      <ButtonLink href={`/learn/${enrollment.id}`} className="w-full">
        Go to course home
      </ButtonLink>
      {nextItem && (
        <ButtonLink href={`/learn/${enrollment.id}/${nextItem.id}`} variant="secondary" className="w-full min-w-0">
          <span className="min-w-0 truncate">
            {enrollment.completedItems > 0 ? 'Continue' : 'Start'}: {nextItem.title}
          </span>
        </ButtonLink>
      )}
    </div>
  ) : claims ? (
    <EnrolForm courseSlug={slug} />
  ) : (
    <ButtonLink href={`/signup?next=${encodeURIComponent(here)}`} className="w-full">
      Sign up to enrol
    </ButtonLink>
  );

  return (
    <PageChrome next={here}>
      <div className="pb-6">
        <CourseCover cover={course.cover} symbolSize={120} className={claims ? 'overflow-hidden rounded-[var(--radius-card)] text-white' : 'text-white'} showCredit eager>
          <div className="relative mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6 sm:py-14">
            <Breadcrumbs
              tone="light"
              items={[
                { label: 'Courses', href: '/courses' },
                ...(course.programs[0] ? [{ label: course.programs[0].title, href: `/programs/${course.programs[0].slug}` }] : []),
                { label: course.title },
              ]}
            />
            {comingSoon && <Badge tone="gold">Coming soon</Badge>}
            <h1 className="max-w-3xl text-[32px] font-extrabold leading-[1.05] text-white min-[375px]:text-[36px] sm:text-[48px]">{course.title}</h1>
            <p className="max-w-2xl text-[16.5px] leading-relaxed text-white/85">{course.subtitle}</p>
            <p className="text-[14px] text-white/80">
              From <span className="font-semibold text-white">{course.provider}</span>
            </p>
          </div>
        </CourseCover>

        {sp.completed && enrollment?.status === 'completed' && (
          <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
            <div role="status" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-gold-tint p-5 ring-1 ring-gold-line">
              <span aria-hidden className="text-[34px]">
                🎉
              </span>
              <div>
                <p className="font-display text-[19px] font-bold text-gold-ink">You’ve completed {course.title}!</p>
                <p className="text-[14px] text-gold-ink">Well done. Your reflections are in your journal, and your work is waiting for faculty review.</p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
          <div className="order-2 space-y-8 lg:order-1">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ['Credits', String(course.creditHours)],
                ['Time', totalMinutes ? `${hours(totalMinutes)} h` : '—'],
                ['Modules', String(course.moduleCount || course.modules.length)],
                ['Level', LEVEL_LABELS[course.level]],
                ['Learners', learnerCount ? learnerCount.toLocaleString('en-GB') : 'Be the first'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{k}</dt>
                  <dd className="font-display text-[18px] font-bold text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            {course.trailer && (
              <section className="space-y-3" aria-labelledby="trailer">
                <h2 id="trailer" className="text-[22px] font-bold">
                  Watch the introduction
                </h2>
                <VideoFacade video={course.trailer} />
              </section>
            )}

            <section className="space-y-3" aria-labelledby="outcomes">
              <h2 id="outcomes" className="text-[22px] font-bold">
                What you’ll learn
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 rounded-[var(--radius-field)] bg-card p-4 text-[14px] leading-relaxed text-body ring-1 ring-line">
                    <span aria-hidden className="mt-0.5 font-bold text-primary">
                      ✓
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </section>

            {course.skills.length > 0 && (
              <section className="space-y-3" aria-labelledby="skills">
                <h2 id="skills" className="text-[18px] font-bold">
                  Skills you’ll practise
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {course.skills.map((s) => (
                    <li key={s} className="rounded-full bg-success-tint px-3 py-1 text-[13px] font-medium text-link ring-1 ring-success-line">
                      {s}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {course.practicalOutput && (
              <section className="flex gap-4 rounded-[var(--radius-card)] bg-forest p-5 text-white sm:p-6">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold font-display text-[20px] font-bold text-forest">
                  ◆
                </span>
                <div className="space-y-1">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold">Your practical output</p>
                  <p className="font-display text-[20px] font-bold text-white">{course.practicalOutput}</p>
                  <p className="text-[14px] leading-relaxed text-white/75">Something real you make during the course, built step by step, that you can use and show.</p>
                </div>
              </section>
            )}

            <section className="space-y-3" aria-labelledby="about">
              <h2 id="about" className="text-[22px] font-bold">
                About this course
              </h2>
              <RichText text={course.description} />
            </section>

            <section className="space-y-3" aria-labelledby="syllabus">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="syllabus" className="text-[22px] font-bold">
                  Syllabus
                </h2>
                {items.length > 0 && (
                  <p className="text-[13px] text-muted">
                    {plural(course.modules.length, 'module')} · {plural(items.length, 'item')}
                  </p>
                )}
              </div>
              {course.modules.length === 0 ? (
                <Card className="p-6 text-[14px] text-muted">The full syllabus will appear here when the course opens.</Card>
              ) : (
                <div className="space-y-3">
                  {course.modules.map((m, mi) => {
                    const done = m.items.filter((i) => itemStatus[i.id] === 'completed').length;
                    return (
                      <details key={m.id} open={m.id === openModule} className="group rounded-[var(--radius-card)] bg-card ring-1 ring-line open:shadow-[var(--shadow-card)]">
                        <summary className="flex cursor-pointer list-none items-start gap-4 rounded-[var(--radius-card)] p-4 sm:p-5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface font-display text-[15px] font-bold text-link ring-1 ring-line">{mi + 1}</span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="block font-display text-[16.5px] font-bold text-ink">{m.title}</span>
                            <span className="block text-[13px] leading-relaxed text-muted">{m.summary}</span>
                            <span className="block font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
                              {m.weekNo ? `Week ${m.weekNo} · ` : ''}
                              {plural(m.items.length, 'item')} · {formatMinutes(m.items.reduce((s, i) => s + i.minutes, 0))}
                              {enrollment ? ` · ${done} of ${m.items.length} done` : ''}
                            </span>
                          </span>
                          <span aria-hidden className="mt-2 text-muted transition-transform group-open:rotate-180">
                            ▾
                          </span>
                        </summary>
                        <ol className="divide-y divide-line border-t border-line">
                          {m.items.map((i) => {
                            const row = (
                              <>
                                <ItemIcon type={i.type} className="text-link" />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[14.5px] font-medium text-ink">{i.title}</span>
                                  <span className="block text-[12px] text-muted">
                                    {ITEM_LABELS[i.type]} · {i.minutes} min{i.required ? '' : ' · optional'}
                                  </span>
                                </span>
                                {enrollment && <StatusTick status={itemStatus[i.id]} />}
                              </>
                            );
                            return (
                              <li key={i.id}>
                                {enrollment ? (
                                  <Link href={`/learn/${enrollment.id}/${i.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface sm:px-5">
                                    {row}
                                  </Link>
                                ) : (
                                  <div className="flex items-center gap-3 px-4 py-3 sm:px-5">{row}</div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <Card className="space-y-2 p-5">
                <h2 className="text-[16px] font-bold">Who it’s for</h2>
                <p className="text-[14px] leading-relaxed text-body">{course.audience}</p>
              </Card>
              <Card className="space-y-2 p-5">
                <h2 className="text-[16px] font-bold">Before you start</h2>
                <p className="text-[14px] leading-relaxed text-body">{course.prerequisites}</p>
              </Card>
            </section>

            {course.instructors.length > 0 && (
              <section className="space-y-3" aria-labelledby="instructors">
                <h2 id="instructors" className="text-[22px] font-bold">
                  {course.instructors.length === 1 ? 'Your instructor' : 'Your instructors'}
                </h2>
                {course.instructors.map((p) => (
                  <Card key={p.name} className="flex gap-4 p-5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success-tint font-display text-[15px] font-bold text-link ring-1 ring-success-line">
                      {initials(p.name)}
                    </span>
                    <div className="space-y-1">
                      <p className="font-display text-[16px] font-bold text-ink">{p.name}</p>
                      <p className="text-[13px] font-medium text-link">{p.title}</p>
                      <p className="text-[14px] leading-relaxed text-body">{p.bio}</p>
                    </div>
                  </Card>
                ))}
              </section>
            )}
          </div>

          <aside className="order-1 lg:order-2">
            <Card className="space-y-4 p-5 lg:sticky lg:top-6">
              <div className="space-y-1">
                <Eyebrow tone="green">{comingSoon ? 'Opening soon' : 'Free · self-paced'}</Eyebrow>
                <p className="text-[14px] text-body">
                  {course.creditHours} credit hours{totalMinutes ? ` · about ${formatMinutes(totalMinutes)}` : ''}
                </p>
              </div>
              {cta}
              {course.programs.length > 0 && (
                <div className="space-y-1.5 border-t border-line pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Part of</p>
                  {course.programs.map((p) => (
                    <Link key={p.slug} href={`/programs/${p.slug}`} className="block text-[14px] font-semibold text-link hover:underline">
                      {p.title} →
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </PageChrome>
  );
}
