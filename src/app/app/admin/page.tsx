import type { LearningStats, PlatformOverview } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { KIND_LABELS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Platform overview' };

const n = (v: number) => v.toLocaleString('en-GB');

function Stat({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="font-display text-[30px] font-extrabold leading-tight text-ink">{n(value)}</p>
      {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line hover:ring-line-heavy">
      {body}
    </Link>
  ) : (
    <div className="rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">{body}</div>
  );
}

export default async function PlatformOverviewPage() {
  const [overview, stats] = await Promise.all([api<PlatformOverview>('GET', '/v1/platform/overview'), api<LearningStats>('GET', '/v1/learning/admin/stats')]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">Platform admin</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Platform overview</h1>
        <p className="text-[14.5px] text-muted">People, organisations and learning across every space.</p>
      </header>

      {!overview.ok ? (
        <Notice tone="error">{friendlyError(overview.error)}</Notice>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="People and organisations">
            <Stat label="People" value={overview.data.users.total} hint={`${n(overview.data.users.new7d)} new this week`} href="/app/admin/users" />
            <Stat label="Two-step sign-in" value={overview.data.users.withMfa} hint={overview.data.users.total ? `${Math.round((overview.data.users.withMfa / overview.data.users.total) * 100)}% of people` : undefined} />
            <Stat label="Suspended" value={overview.data.users.suspended} href="/app/admin/users?status=suspended" />
            <Stat label="Organisations" value={overview.data.organizations.total} hint={`${n(overview.data.organizations.pending)} waiting for review`} href="/app/admin/organisations" />
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Card className="space-y-4 p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[18px] font-bold">Sign-ups, last 14 days</h2>
                <span className="font-mono text-[12px] text-muted">{n(overview.data.signups.reduce((s, d) => s + d.count, 0))} total</span>
              </div>
              <SignupChart days={overview.data.signups} />
            </Card>
            <Card className="space-y-3 p-6">
              <h2 className="text-[18px] font-bold">Organisations by kind</h2>
              <ul className="divide-y divide-line">
                {Object.entries(overview.data.organizations.byKind)
                  .filter(([k]) => k !== 'platform')
                  .map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between py-2.5 text-[14px]">
                      <span className="text-body">{KIND_LABELS[k] ?? k}</span>
                      <span className="font-mono font-semibold text-ink">{n(v ?? 0)}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <section className="space-y-4" aria-labelledby="learning-stats">
        <h2 id="learning-stats" className="text-[22px] font-bold">
          Learning
        </h2>
        {!stats.ok ? (
          <Notice tone="error">{friendlyError(stats.error)}</Notice>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Enrolments" value={stats.data.enrollments} />
              <Stat label="Active learners" value={stats.data.activeLearners7d} hint="in the last 7 days" />
              <Stat label="Completions" value={stats.data.completions} />
              <Stat label="Submissions" value={stats.data.submissions7d} hint="in the last 7 days" />
            </div>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">
                      Course
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Enrolled
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Completed
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Average progress
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stats.data.courses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-muted">
                        Nobody has enrolled yet.
                      </td>
                    </tr>
                  ) : (
                    stats.data.courses.map((c) => (
                      <tr key={c.slug}>
                        <td className="px-5 py-3">
                          <Link href={`/courses/${c.slug}`} className="font-semibold text-ink hover:underline">
                            {c.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right font-mono">{n(c.enrolled)}</td>
                        <td className="px-5 py-3 text-right font-mono">{n(c.completed)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-line" aria-hidden>
                              <div className="h-full rounded-full bg-primary" style={{ width: `${c.avgProgressPct}%` }} />
                            </div>
                            <span className="font-mono text-[12.5px] text-muted">{c.avgProgressPct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}

function SignupChart({ days }: { days: PlatformOverview['signups'] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const label = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <figure className="space-y-2">
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Sign-ups per day: ${days.map((d) => `${label(d.date)} ${d.count}`).join(', ')}`}>
        {days.map((d) => (
          <div key={d.date} className="group flex h-full flex-1 flex-col justify-end" title={`${label(d.date)}: ${d.count}`}>
            <span className="mb-1 text-center font-mono text-[10px] text-muted opacity-0 group-hover:opacity-100">{d.count}</span>
            <div className="min-h-[3px] rounded-t-md bg-primary/80 group-hover:bg-primary" style={{ height: `${(d.count / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between font-mono text-[10.5px] text-faint">
        <span>{days[0] ? label(days[0].date) : ''}</span>
        <span>{days.at(-1) ? label(days.at(-1)!.date) : ''}</span>
      </figcaption>
    </figure>
  );
}
