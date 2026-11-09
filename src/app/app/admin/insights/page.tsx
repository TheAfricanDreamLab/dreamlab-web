import type { LearningStats, PlatformOverview, PlatformUser } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CountUp } from '@/components/ui/motion';
import { Card, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { KIND_LABELS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Insights' };

const n = (v: number) => v.toLocaleString('en-GB');
const joinedOn = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** The detailed platform figures moved off the overview: sign-ups, account safety, organisations and learning. Access: admin/layout.tsx. */
export default async function PlatformInsightsPage() {
  const [overview, stats, users] = await Promise.all([
    api<PlatformOverview>('GET', '/v1/platform/overview'),
    api<LearningStats>('GET', '/v1/learning/admin/stats'),
    api<{ items: PlatformUser[] }>('GET', '/v1/platform/users?limit=6'),
  ]);
  const recent = users.ok ? users.data.items.slice(0, 6) : [];

  return (
    <div className="space-y-12">
      <header className="space-y-1">
        <Link href="/app/admin" className="dl-press inline-flex min-h-10 items-center text-[13.5px] font-semibold text-link hover:underline">
          Platform overview
        </Link>
        <h1 className="text-[30px] font-extrabold leading-tight sm:text-[38px]">Insights</h1>
        <p className="text-[14.5px] text-muted">The detailed figures for people, organisations and learning.</p>
      </header>

      {!overview.ok ? (
        <Notice tone="error">{friendlyError(overview.error)}</Notice>
      ) : (
        <>
          <section aria-labelledby="signups" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="signups" className="text-[19px] font-bold">
                Sign-ups, last 14 days
              </h2>
              <span className="font-mono text-[12px] text-muted">
                {n(overview.data.signups.reduce((sum, d) => sum + d.count, 0))} total · {n(overview.data.users.new7d)} in the last 7 days
              </span>
            </div>
            <SignupChart days={overview.data.signups} />
            {recent.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-[15px] font-semibold text-ink">Newest people</h3>
                <ul className="dl-stagger -mx-3 space-y-0.5">
                  {recent.map((u) => (
                    <li key={u.id}>
                      <Link href={`/app/admin/users/${u.id}`} className="dl-lift flex min-h-11 flex-wrap items-center justify-between gap-x-3 rounded-[var(--radius-card)] px-3 py-2 hover:bg-card">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{u.fullName}</span>
                          <span className="block truncate text-[12.5px] text-muted">{u.email ?? u.phone ?? (u.verified ? 'Verified' : 'Not verified yet')}</span>
                        </span>
                        <span className="font-mono text-[12px] text-muted">{joinedOn(u.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="account-safety" className="space-y-4">
            <h2 id="account-safety" className="text-[19px] font-bold">
              Account safety
            </h2>
            <ul className="dl-stagger -mx-3 grid grid-cols-2 gap-1 md:grid-cols-3">
              <Stat
                label="Two-step sign-in"
                value={overview.data.users.withMfa}
                hint={overview.data.users.total ? `${Math.round((overview.data.users.withMfa / overview.data.users.total) * 100)}% of people` : undefined}
              />
              <Stat label="Suspended" value={overview.data.users.suspended} hint="Kept out for now" href="/app/admin/users?status=suspended" />
              <Stat label="Banned" value={overview.data.users.banned} hint="Accounts closed" href="/app/admin/users?status=banned" />
            </ul>
          </section>

          <section aria-labelledby="org-kinds" className="space-y-4">
            <h2 id="org-kinds" className="text-[19px] font-bold">
              Organisations by kind
            </h2>
            <ul className="max-w-xl divide-y divide-line">
              {Object.entries(overview.data.organizations.byKind)
                .filter(([k]) => k !== 'platform')
                .map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between py-2.5 text-[14px]">
                    <span className="text-body">{KIND_LABELS[k] ?? k}</span>
                    <span className="font-mono font-semibold text-ink">{n(v ?? 0)}</span>
                  </li>
                ))}
            </ul>
            <p className="text-[13px] text-muted">
              {n(overview.data.organizations.total)} in all, {n(overview.data.organizations.pending)} waiting for approval.{' '}
              <Link href="/app/admin/organisations" className="font-semibold text-link hover:underline">
                Manage organisations
              </Link>
            </p>
          </section>
        </>
      )}

      <section aria-labelledby="learning-heading" id="learning" className="scroll-mt-20 space-y-4">
        <h2 id="learning-heading" className="text-[19px] font-bold">
          Learning
        </h2>
        {!stats.ok ? (
          <Notice tone="error">{friendlyError(stats.error)}</Notice>
        ) : (
          <>
            <ul className="dl-stagger -mx-3 grid grid-cols-2 gap-1 xl:grid-cols-4">
              <Stat label="Enrolments" value={stats.data.enrollments} />
              <Stat label="Active learners" value={stats.data.activeLearners7d} hint="In the last 7 days" />
              <Stat label="Completions" value={stats.data.completions} />
              <Stat label="Submissions" value={stats.data.submissions7d} hint="In the last 7 days" />
            </ul>
            <h3 className="pt-2 text-[15px] font-semibold text-ink">By course</h3>
            <Card className="overflow-x-auto rounded-[var(--radius-tile)]">
              <table className="stack-table w-full text-left text-[14px] sm:min-w-[520px]">
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
                        <td data-label="Enrolled" className="px-5 py-3 text-right font-mono">
                          {n(c.enrolled)}
                        </td>
                        <td data-label="Completed" className="px-5 py-3 text-right font-mono">
                          {n(c.completed)}
                        </td>
                        <td data-label="Progress" className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-line" aria-hidden>
                              <div className="dl-bar h-full rounded-full bg-primary" style={{ width: `${c.avgProgressPct}%` }} />
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

/** One figure. A list item, so the groups above read as lists of figures; it links when there's a page behind it. */
function Stat({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const body = (
    <>
      <span className="block text-[13.5px] font-semibold text-body">{label}</span>
      <span className="block font-display text-[30px] font-extrabold leading-tight text-ink">
        <CountUp value={value} />
      </span>
      {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
    </>
  );
  return (
    <li className="min-w-0">
      {href ? (
        <Link href={href} className="dl-lift block h-full rounded-[var(--radius-card)] px-3 py-3 hover:bg-card">
          {body}
        </Link>
      ) : (
        <div className="px-3 py-3">{body}</div>
      )}
    </li>
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
