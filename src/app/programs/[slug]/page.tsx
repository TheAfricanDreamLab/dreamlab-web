import type { ProgramDetail } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CourseCard, CourseCover } from '@/components/learning/course-ui';
import { RichText } from '@/components/learning/rich-text';
import { PublicFooter, PublicHeader } from '@/components/site/public-header';
import { Badge, ButtonLink, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { DELIVERY_LABELS, FEATURE_LABELS, plural, PROGRAM_TYPE_LABELS } from '@/lib/learning';
import { getClaims } from '@/lib/session';

type Params = { params: Promise<{ slug: string }> };

const loadProgram = cache((slug: string) => api<ProgramDetail>('GET', `/v1/catalog/programs/${slug}`));
const valid = (slug: string) => /^[a-z0-9-]{1,80}$/.test(slug);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!valid(slug)) return { title: 'Programme' };
  const res = await loadProgram(slug);
  return res.ok ? { title: res.data.title, description: res.data.subtitle } : { title: 'Programme' };
}

const weeks = (from: number | null, to: number | null) => (from && to ? (from === to ? `Week ${from}` : `Weeks ${from}–${to}`) : from ? `From week ${from}` : null);

export default async function ProgramPage({ params }: Params) {
  const { slug } = await params;
  if (!valid(slug)) notFound();
  const [res, claims] = await Promise.all([loadProgram(slug), getClaims()]);
  if (!res.ok && res.status === 404) notFound();
  const here = `/programs/${slug}`;
  if (!res.ok) {
    return (
      <div className="min-h-dvh">
        <PublicHeader next={here} />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Notice tone="error">{friendlyError(res.error)}</Notice>
        </main>
      </div>
    );
  }
  const p = res.data;
  const phases = [...p.phases].sort((a, b) => a.position - b.position);
  const stages = [...p.capstoneStages].sort((a, b) => a.position - b.position);
  const requirements = [...p.graduationRequirements].sort((a, b) => a.position - b.position);
  const calendar = [...p.calendar].sort((a, b) => a.weekNo - b.weekNo);
  const firstCourse = phases[0]?.courses[0];

  return (
    <div className="min-h-dvh">
      <PublicHeader next={here} />
      <main>
        <CourseCover cover={p.cover} symbolSize={140}>
          <div className="relative mx-auto max-w-6xl space-y-4 px-4 py-12 sm:px-6 sm:py-16">
            <nav aria-label="Breadcrumb" className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/75">
              <Link href="/courses" className="hover:text-white">
                Courses
              </Link>{' '}
              / Programme
            </nav>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
              {PROGRAM_TYPE_LABELS[p.programType]} · {DELIVERY_LABELS[p.deliveryMode]}
            </p>
            <h1 className="max-w-3xl text-[36px] font-extrabold leading-[1.05] text-white sm:text-[52px]">{p.title}</h1>
            <p className="max-w-2xl text-[16.5px] leading-relaxed text-white/85">{p.subtitle}</p>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2 text-white">
              {[
                ['Credits', String(p.creditTotal)],
                ['Weeks', p.weeks ? String(p.weeks) : '—'],
                ['Courses', String(p.courseCount)],
                ['Capstone stages', String(stages.length)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/70">{k}</dt>
                  <dd className="font-display text-[24px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            {firstCourse && (
              <div className="pt-2">
                <ButtonLink href={claims ? `/courses/${firstCourse.slug}` : `/signup?next=${encodeURIComponent(`/courses/${firstCourse.slug}`)}`} variant="secondary" className="sm:px-7">
                  {claims ? `Start with ${firstCourse.title}` : 'Create a free account to start'}
                </ButtonLink>
              </div>
            )}
          </div>
        </CourseCover>

        <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
          <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="overview">
            <div className="space-y-3">
              <h2 id="overview" className="text-[24px] font-bold">
                Overview
              </h2>
              <RichText text={p.description} />
              <p className="text-[13.5px] text-muted">From {p.provider}</p>
            </div>
            {p.features.length > 0 && (
              <ul className="grid gap-2 self-start sm:grid-cols-2 lg:grid-cols-1">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 rounded-[var(--radius-field)] bg-card p-3.5 ring-1 ring-line">
                    <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-tint text-[13px] text-gold-ink ring-1 ring-gold-line">
                      ✦
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-ink">{FEATURE_LABELS[f]?.title ?? f}</span>
                      <span className="block text-[12.5px] text-muted">{FEATURE_LABELS[f]?.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-6" aria-labelledby="phases">
            <div className="space-y-1">
              <Eyebrow>How it runs</Eyebrow>
              <h2 id="phases" className="text-[24px] font-bold">
                Phases
              </h2>
            </div>
            <ol className="relative space-y-8 border-l-2 border-line pl-6 sm:pl-8">
              {phases.map((ph, i) => (
                <li key={ph.id} className="relative space-y-4">
                  <span aria-hidden className="absolute -left-[35px] top-0 grid h-7 w-7 place-items-center rounded-full bg-primary font-display text-[13px] font-bold text-white ring-4 ring-page sm:-left-[43px]">
                    {i + 1}
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[19px] font-bold">{ph.name}</h3>
                      {ph.chooseN && <Badge tone="gold">Choose {ph.chooseN}</Badge>}
                    </div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                      {[weeks(ph.weekFrom, ph.weekTo), `${ph.weightPct}% of the programme score`, `${ph.creditHours} credits`].filter(Boolean).join(' · ')}
                    </p>
                    <p className="max-w-3xl text-[14.5px] leading-relaxed text-body">{ph.summary}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ph.courses.map((c) => (
                      <CourseCard key={c.id} course={c} extra={!c.required && !ph.chooseN ? <Badge>Optional</Badge> : undefined} />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {stages.length > 0 && (
            <section className="space-y-5" aria-labelledby="capstone">
              <div className="space-y-1">
                <Eyebrow tone="gold">Capstone</Eyebrow>
                <h2 id="capstone" className="text-[24px] font-bold">
                  The Dream Residency: {plural(stages.length, 'stage')}
                </h2>
                <p className="text-[14px] text-muted">Your capstone project, built in stages. Each stage ends with a document you can show.</p>
              </div>
              <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stages.map((s, i) => (
                  <li key={s.position} className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">Stage {i + 1}</span>
                      <span className="font-mono text-[11px] text-muted">{s.creditHours} credits</span>
                    </div>
                    <h3 className="text-[17px] font-bold">{s.name}</h3>
                    <p className="text-[13.5px] leading-relaxed text-body">{s.summary}</p>
                    <p className="mt-auto rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line">
                      <span className="text-muted">Output: </span>
                      <span className="font-semibold text-ink">{s.outputDocument}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {calendar.length > 0 && (
            <section className="space-y-4" aria-labelledby="calendar">
              <h2 id="calendar" className="text-[24px] font-bold">
                {calendar.length}-week calendar
              </h2>
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13.5px]">
                  <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Week
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Phase
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Focus
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Major output
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {calendar.map((w, i) => (
                      <tr key={w.weekNo} className={cx(i > 0 && calendar[i - 1]!.phase !== w.phase && 'border-t-2 border-t-line-heavy')}>
                        <td className="px-4 py-3 font-mono text-ink">{w.weekNo}</td>
                        <td className="px-4 py-3 text-muted">{w.phase}</td>
                        <td className="px-4 py-3 font-medium text-ink">{w.focus}</td>
                        <td className="px-4 py-3 text-body">{w.majorOutput}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          )}

          {requirements.length > 0 && (
            <section className="space-y-4" aria-labelledby="graduation">
              <div className="space-y-1">
                <Eyebrow tone="green">Graduation</Eyebrow>
                <h2 id="graduation" className="text-[24px] font-bold">
                  What it takes to graduate
                </h2>
              </div>
              <ol className="grid gap-2 sm:grid-cols-2">
                {requirements.map((r) => (
                  <li key={r.key} className="flex items-start gap-3 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
                    <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] ring-1 ring-line-heavy" />
                    <span className="text-[14px] text-ink">{r.label}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
