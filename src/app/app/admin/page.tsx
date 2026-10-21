import type { LearningStats, Organization, PlatformOverview, PlatformUser } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActivityFeed, DashboardGrid, type FeedEntry, inPeriod, PageTitle, periodOf, ProfileCard, SummaryHeader, SummaryTile } from '@/components/app/dashboard';
import { Card, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { initials, KIND_LABELS } from '@/lib/labels';
import { getMe } from '@/lib/me';

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
    <Link href={href} className="block rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line hover:ring-line-heavy sm:p-5">
      {body}
    </Link>
  ) : (
    <div className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line sm:p-5">{body}</div>
  );
}

export default async function PlatformOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const period = periodOf((await searchParams).period);
  const [me, overview, stats, users, pending] = await Promise.all([
    getMe(),
    api<PlatformOverview>('GET', '/v1/platform/overview'),
    api<LearningStats>('GET', '/v1/learning/admin/stats'),
    api<{ items: PlatformUser[] }>('GET', '/v1/platform/users?limit=100'),
    api<{ items: Organization[] }>('GET', '/v1/orgs?status=pending&limit=20'),
  ]);
  const people = users.ok ? users.data.items : [];
  const waiting = pending.ok ? pending.data.items : [];
  const total = overview.ok ? overview.data.users.total : people.length;
  // Newest first, at most 100: past that, "this month" is at least 100.
  const joined = people.filter((u) => inPeriod(u.createdAt, period)).length;
  const joinedLabel = period === 'all' ? total : people.length === 100 && joined === 100 ? '100+' : joined;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  const feed: FeedEntry[] = [
    ...people.slice(0, 6).map(
      (u): FeedEntry => ({
        id: u.id,
        at: u.createdAt,
        avatar: { initials: initials(u.fullName), tone: 'jade' },
        title: `${u.fullName} signed up`,
        subtitle: u.email ?? u.phone ?? undefined,
        tags: [u.verified ? 'Verified' : 'Unverified', ...(u.mfaEnabled ? ['2-step'] : [])],
        href: `/app/admin/users/${u.id}`,
        hrefLabel: `Open ${u.fullName}`,
      }),
    ),
    ...waiting.slice(0, 5).map(
      (o): FeedEntry => ({
        id: o.id,
        at: o.createdAt,
        avatar: { icon: 'building', tone: 'gold' },
        title: `${o.name} asked to join`,
        subtitle: 'Waiting for review',
        tags: o.kinds.map((k) => KIND_LABELS[k] ?? k),
        href: '/app/admin/organisations?status=pending',
        hrefLabel: `Review ${o.name}`,
      }),
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const main = (
    <>
      <PageTitle title="Platform overview" intro="People, organisations and learning across every space." />

      <ProfileCard
        name={me.user.fullName}
        role="Platform admin"
        since={me.user.createdAt}
        contact={[...(me.user.email ? [{ icon: 'mail', text: me.user.email }] : []), ...(me.user.phone ? [{ icon: 'phone', text: me.user.phone }] : [])]}
        stats={[
          { label: 'People', value: total, pct: overview.ok ? pct(overview.data.users.withMfa, total) : 0, tone: 'jade', hint: overview.ok ? `${n(overview.data.users.withMfa)} with 2-step` : undefined },
          {
            label: 'Organisations',
            value: overview.ok ? overview.data.organizations.total : '—',
            pct: overview.ok ? pct(overview.data.organizations.total - overview.data.organizations.pending, overview.data.organizations.total) : 0,
            tone: 'gold',
            hint: overview.ok ? `${n(overview.data.organizations.pending)} in review` : undefined,
          },
          { label: 'Enrolments', value: stats.ok ? stats.data.enrollments : '—', pct: stats.ok ? pct(stats.data.completions, stats.data.enrollments) : 0, tone: 'forest', hint: stats.ok ? `${n(stats.data.completions)} completed` : undefined },
        ]}
      />

      <section className="space-y-4" aria-labelledby="platform-summary">
        <SummaryHeader id="platform-summary" title="Summary" period={period} action="/app/admin" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            title="Pending organisations"
            text="Schools, partners and sponsors to check."
            href="/app/admin/organisations?status=pending"
            updated={waiting[0]?.createdAt ?? null}
            count={overview.ok ? overview.data.organizations.pending : waiting.length}
            tone="gold"
          />
          <SummaryTile
            title="New sign-ups"
            text={period === 'month' ? 'Accounts created this month.' : 'Accounts on the platform.'}
            href="/app/admin/users"
            updated={people[0]?.createdAt ?? null}
            count={joinedLabel}
            tone="jade"
          />
          <SummaryTile title="Completions" text="Courses finished, all time." href="/app/admin/catalog" note="Across every space" count={stats.ok ? stats.data.completions : '—'} tone="sky" />
          <SummaryTile
            title="Active learners"
            text="Learned something in the last 7 days."
            href="/app/admin/catalog"
            note={stats.ok ? `${n(stats.data.submissions7d)} submissions this week` : undefined}
            count={stats.ok ? stats.data.activeLearners7d : '—'}
            tone="sage"
          />
        </div>
      </section>

      {!overview.ok ? (
        <Notice tone="error">{friendlyError(overview.error)}</Notice>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3" aria-label="Account safety">
            <Stat label="Two-step sign-in" value={overview.data.users.withMfa} hint={overview.data.users.total ? `${Math.round((overview.data.users.withMfa / overview.data.users.total) * 100)}% of people` : undefined} />
            <Stat label="Suspended" value={overview.data.users.suspended} hint="Can’t sign in until reactivated" href="/app/admin/users?status=suspended" />
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <Card className="space-y-4 rounded-[var(--radius-tile)] p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[18px] font-bold">Sign-ups, last 14 days</h2>
                <span className="font-mono text-[12px] text-muted">{n(overview.data.signups.reduce((s, d) => s + d.count, 0))} total</span>
              </div>
              <SignupChart days={overview.data.signups} />
            </Card>
            <Card className="space-y-3 rounded-[var(--radius-tile)] p-5 sm:p-6">
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
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Stat label="Enrolments" value={stats.data.enrollments} />
              <Stat label="Active learners" value={stats.data.activeLearners7d} hint="in the last 7 days" />
              <Stat label="Completions" value={stats.data.completions} />
              <Stat label="Submissions" value={stats.data.submissions7d} hint="in the last 7 days" />
            </div>
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
                        <td data-label="Enrolled" className="px-5 py-3 text-right font-mono">{n(c.enrolled)}</td>
                        <td data-label="Completed" className="px-5 py-3 text-right font-mono">{n(c.completed)}</td>
                        <td data-label="Progress" className="px-5 py-3">
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
    </>
  );

  return <DashboardGrid main={main} feed={<ActivityFeed entries={feed} empty="Sign-ups and organisation requests will show here." />} />;
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
