import type { CourseSummary, EnrollmentSummary, InvitationSchema, JoinableOrganization, Membership } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { z } from 'zod';
import { switchOrg } from '@/app/actions/auth';
import { joinOrganisation } from '@/app/actions/security';
import { ActivityFeed, DashboardGrid, type FeedEntry, inPeriod, MediaCard, PageTitle, periodOf, ProfileCard, SummaryHeader, SummaryTile } from '@/components/app/dashboard';
import { Badge, Card, Notice, OrgMark } from '@/components/ui/primitives';
import { messageForCode } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { KIND_LABELS, ROLE_LABELS } from '@/lib/labels';
import { type JournalEntry, LEVEL_LABELS, plural } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'My space' };

const latest = (dates: (string | null | undefined)[]) => dates.filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const period = periodOf(sp.period);
  const me = await getMe();
  const active = activeMembership(me);
  const firstName = me.user.fullName.split(' ')[0];
  const spaces = me.memberships.filter((m) => m.status === 'active' && m.org.status !== 'suspended');
  const waiting = me.memberships.filter((m) => m.status === 'requested');
  const orgId = active?.org.id;
  const [joinable, learning, journal, catalog, members, invitations] = await Promise.all([
    api<{ items: JoinableOrganization[] }>('GET', '/v1/me/joinable-orgs'),
    api<{ items: EnrollmentSummary[] }>('GET', '/v1/learning/enrollments'),
    api<{ items: JournalEntry[] }>('GET', '/v1/learning/journal'),
    api<{ items: CourseSummary[] }>('GET', '/v1/catalog/courses'),
    orgId && can(me, 'org.members.read') ? api<{ items: Membership[] }>('GET', `/v1/orgs/${orgId}/members?limit=100`) : null,
    orgId && can(me, 'org.members.invite') ? api<{ items: z.infer<typeof InvitationSchema>[] }>('GET', `/v1/orgs/${orgId}/invitations?status=pending&limit=100`) : null,
  ]);

  const enrolments = learning.ok ? learning.data.items : [];
  const entries = journal.ok ? journal.data.items : [];
  const continuing = enrolments.filter((e) => e.status !== 'completed');
  const completed = enrolments.filter((e) => e.status === 'completed');
  const enrolledSlugs = new Set(enrolments.map((e) => e.courseSlug));
  const discover = (catalog.ok ? catalog.data.items : []).filter((c) => !enrolledSlugs.has(c.slug) && c.availability === 'available');
  const itemsDone = enrolments.reduce((n, e) => n + e.completedItems, 0);
  const itemsTotal = enrolments.reduce((n, e) => n + e.totalItems, 0);
  const creditsEarned = completed.reduce((n, e) => n + e.course.creditHours, 0);
  const creditsTotal = enrolments.reduce((n, e) => n + e.course.creditHours, 0);
  const role = active ? active.roles.map((r) => ROLE_LABELS[r.roleKey] ?? r.roleKey).join(', ') || 'Member' : me.platformAdmin ? 'Platform admin' : 'Learner';
  const periodText = period === 'month' ? 'this month' : 'so far';

  const tiles = [
    {
      title: 'In progress',
      text: continuing.length ? 'Pick up where you left off.' : 'Nothing open. Start a course.',
      href: '/app/learning',
      updated: latest(continuing.map((e) => e.lastActiveAt)),
      count: continuing.length,
      tone: 'jade' as const,
    },
    {
      title: 'Completed',
      text: `Courses you finished ${periodText}.`,
      href: '/app/learning',
      updated: latest(completed.map((e) => e.completedAt)),
      count: completed.filter((e) => inPeriod(e.completedAt, period)).length,
      tone: 'gold' as const,
    },
    {
      title: 'Reflections',
      text: `Saved to your journal ${periodText}.`,
      href: '/app/journal',
      updated: latest(entries.map((e) => e.createdAt)),
      count: entries.filter((e) => inPeriod(e.createdAt, period)).length,
      tone: 'sky' as const,
    },
    members?.ok && active
      ? {
          title: 'Members',
          text: `Everyone in ${active.org.name}.`,
          href: '/app/members',
          note: invitations?.ok && invitations.data.items.length ? `${plural(invitations.data.items.length, 'invitation')} waiting` : 'No invitations waiting',
          count: members.data.items.filter((m) => m.status === 'active').length,
          tone: 'sage' as const,
        }
      : { title: 'New to explore', text: 'Open courses you haven’t started.', href: '/courses', note: 'Free to start', count: discover.length, tone: 'sage' as const },
  ];

  // The feed comes from what the learning service already records: enrolments, progress and journal entries.
  const feed: FeedEntry[] = [
    ...enrolments.flatMap((e): FeedEntry[] => {
      const out: FeedEntry[] = [
        {
          id: `${e.id}-in`,
          at: e.enrolledAt,
          avatar: { icon: 'book', tone: 'jade' },
          title: `Enrolled in ${e.course.title}`,
          tags: [LEVEL_LABELS[e.course.level], `${e.course.creditHours} credits`],
          href: `/learn/${e.id}`,
          hrefLabel: `Open the course home of ${e.course.title}`,
        },
      ];
      if (e.completedAt) out.push({ id: `${e.id}-done`, at: e.completedAt, avatar: { icon: 'check', tone: 'gold' }, title: `Completed ${e.course.title}`, subtitle: 'Your work is waiting for faculty review.', tags: ['Completed'] });
      else if (new Date(e.lastActiveAt).getTime() - new Date(e.enrolledAt).getTime() > 60_000)
        out.push({
          id: `${e.id}-active`,
          at: e.lastActiveAt,
          avatar: { icon: 'spark', tone: 'sage' },
          title: `Studied ${e.course.title}`,
          subtitle: e.nextItem ? `Next: ${e.nextItem.title}` : undefined,
          tags: [`${e.progressPct}% done`],
          href: e.nextItem ? `/learn/${e.id}/${e.nextItem.id}` : `/learn/${e.id}`,
          hrefLabel: `Carry on with ${e.course.title}`,
        });
      return out;
    }),
    ...entries.map(
      (j): FeedEntry => ({
        id: j.id,
        at: j.createdAt,
        avatar: { icon: 'journal', tone: 'sky' },
        title: 'Reflection saved',
        subtitle: j.itemTitle,
        tags: [j.course.title],
        href: '/app/journal',
        hrefLabel: `Read your reflection on ${j.itemTitle}`,
      }),
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const main = (
    <>
      <PageTitle
        title="My activity"
        intro={active ? `You’re working in ${active.org.name} as ${role}.` : 'You’re learning on your own. Pick a course and start.'}
      />

      {sp.created === 'active' && <Notice tone="success">Your organisation is ready. Invite your team whenever you like.</Notice>}
      {sp.created === 'pending' && (
        <Notice tone="info">We’ve got your request. We review new organisations within two working days. Meanwhile you can set things up and invite co-admins.</Notice>
      )}
      {sp.joined && <Notice tone="success">You’ve joined. Welcome aboard!</Notice>}
      {sp.requested && <Notice tone="info">We’ve asked the organisation’s admins. You’ll see it in your spaces once they say yes.</Notice>}
      {sp.join_error && <Notice tone="error">{messageForCode(sp.join_error)}</Notice>}
      {active?.org.status === 'pending' && (
        <Notice tone="info">
          <b>{active.org.name}</b> is in review. You can organise teams and invite co-admins now; learners can join once it’s approved.
        </Notice>
      )}

      <ProfileCard
        name={me.user.fullName}
        greeting={<h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-gold-ink">Welcome, {firstName}.</h2>}
        role={role}
        since={me.user.createdAt}
        contact={[...(me.user.email ? [{ icon: 'mail', text: me.user.email }] : []), ...(me.user.phone ? [{ icon: 'phone', text: me.user.phone }] : [])]}
        org={active?.org.name}
        stats={[
          { label: 'Courses enrolled', value: enrolments.length, pct: pct(completed.length, enrolments.length), tone: 'jade', hint: `${completed.length} finished` },
          { label: 'Lessons done', value: itemsDone, pct: pct(itemsDone, itemsTotal), tone: 'gold', hint: `of ${itemsTotal}` },
          { label: 'Credits earned', value: creditsEarned, pct: pct(creditsEarned, creditsTotal), tone: 'forest', hint: `of ${creditsTotal}` },
        ]}
      />

      <section className="space-y-4" aria-labelledby="my-summary">
        <SummaryHeader id="my-summary" title="My summary" period={period} action="/app" />
        <div className="grid gap-4 sm:grid-cols-2">
          {tiles.map((t) => (
            <SummaryTile key={t.title} {...t} />
          ))}
        </div>
      </section>

      {continuing.length > 0 && (
        <section className="space-y-4" aria-labelledby="continue-learning">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 id="continue-learning" className="text-[22px] font-bold">
              Continue learning
            </h2>
            <Link href="/app/learning" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-link hover:underline">
              All my courses →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {continuing.slice(0, 3).map((e) => (
              <MediaCard
                key={e.id}
                href={e.nextItem ? `/learn/${e.id}/${e.nextItem.id}` : `/learn/${e.id}`}
                label={`Continue ${e.course.title}`}
                cover={e.course.cover}
                title={e.course.title}
                meta={e.nextItem ? `Next: ${e.nextItem.title}` : `${e.completedItems} of ${e.totalItems} done`}
                badge={{ text: e.completedItems ? `In progress · ${e.progressPct}%` : 'Just started', tone: 'jade' }}
                progress={e.progressPct}
              />
            ))}
          </div>
        </section>
      )}

      {discover.length > 0 && (
        <section className="space-y-4" aria-labelledby="discover">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 id="discover" className="text-[22px] font-bold">
              {enrolments.length ? 'Your next course' : 'Start here'}
            </h2>
            <Link href="/courses" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-link hover:underline">
              Browse the catalogue →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {[...discover.filter((c) => c.featured), ...discover.filter((c) => !c.featured)].slice(0, 3).map((c) => (
              <MediaCard
                key={c.id}
                href={`/courses/${c.slug}`}
                cover={c.cover}
                title={c.title}
                meta={`${LEVEL_LABELS[c.level]} · ${c.creditHours} credits · ${c.provider}`}
                badge={c.featured ? { text: 'Featured', tone: 'gold' } : { text: LEVEL_LABELS[c.level], tone: 'light' }}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <Card className="space-y-5 rounded-[var(--radius-tile)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[20px] font-bold">{active ? 'Get your organisation going' : 'Your next steps'}</h2>
            <Badge tone="green">{active ? (KIND_LABELS[active.org.kinds[0] ?? ''] ?? 'Organisation') : 'Learner'}</Badge>
          </div>
          <ol className="space-y-3">
            {(active
              ? [
                  { done: true, title: 'Create the organisation', text: 'Done.' },
                  { done: false, title: 'Invite your people', text: 'Send invitations by email or phone.', href: can(me, 'org.members.invite') ? '/app/members' : undefined },
                  {
                    done: false,
                    title: 'Connect your company sign-in (optional)',
                    text: 'Verify your email domain, then add Microsoft, Google Workspace, Okta or any SAML/OIDC sign-on.',
                    href: can(me, 'org.security.manage') ? '/app/settings' : undefined,
                  },
                  { done: false, title: 'Explore learning', text: 'Browse the course catalogue. Assigning courses to your people comes next.', href: '/courses' },
                ]
              : [
                  { done: true, title: 'Create your account', text: 'Done. Welcome!' },
                  { done: false, title: 'Secure your account', text: 'Turn on two-step sign-in and check your devices.', href: '/app/account' },
                  {
                    done: enrolments.length > 0,
                    title: 'Start a course',
                    text: enrolments.length > 0 ? 'Done. Keep going a little each day.' : 'Problem Solving is a good first one. It’s free.',
                    href: enrolments.length > 0 ? '/app/learning' : '/courses',
                  },
                ]
            ).map((s) => (
              <li key={s.title} className="flex items-start gap-3 rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${s.done ? 'bg-primary text-white' : 'ring-1 ring-line-heavy'}`}>
                  {s.done ? '✓' : ''}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">{s.title}</p>
                  <p className="text-[14px] text-muted">{s.text}</p>
                </div>
                {s.href && (
                  <Link href={s.href} className="-my-1 inline-flex min-h-11 items-center self-center px-1 text-[14px] font-semibold text-link">
                    Go →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4 rounded-[var(--radius-tile)] p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-[18px] font-bold">Your spaces</h2>
              <p className="text-[14px] text-muted">Each space has its own courses and people. Switch any time.</p>
            </div>
            <form action={switchOrg} className="space-y-2">
              <SpaceRow name="Just me" detail="Your own learning" here={!active} value="" />
              {spaces.map((m) => (
                <SpaceRow
                  key={m.membershipId}
                  name={m.org.name}
                  detail={`${KIND_LABELS[m.org.kinds[0] ?? ''] ?? 'Organisation'} · ${m.roles.map((r) => ROLE_LABELS[r.roleKey] ?? r.roleKey).join(', ') || 'member'}`}
                  here={m.membershipId === active?.membershipId}
                  value={m.org.id}
                  badge={m.org.status === 'pending' ? 'In review' : undefined}
                />
              ))}
            </form>
            {waiting.map((m) => (
              <div key={m.membershipId} className="flex items-center gap-3 rounded-[var(--radius-field)] border border-dashed border-line-strong px-3 py-2.5">
                <OrgMark size={28} name={m.org.name} className="opacity-60" />
                <span className="min-w-0 flex-1 text-[13.5px] text-muted">
                  <span className="block truncate font-semibold text-ink">{m.org.name}</span>
                  Waiting for an admin to let you in
                </span>
              </div>
            ))}
          </Card>

          {joinable.ok && joinable.data.items.length > 0 && (
            <Card className="space-y-3 rounded-[var(--radius-tile)] p-5 sm:p-6">
              <h2 className="text-[18px] font-bold">You can join</h2>
              <p className="text-[14px] text-muted">These organisations recognise your email address.</p>
              {joinable.data.items.map((j) => (
                <form key={j.org.id} action={joinOrganisation} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2.5 ring-1 ring-line">
                  <input type="hidden" name="orgId" value={j.org.id} />
                  <OrgMark size={28} name={j.org.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{j.org.name}</span>
                    <span className="block break-all text-[12.5px] text-muted">Everyone at @{j.domain}</span>
                  </span>
                  <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-[14px] font-semibold text-white hover:bg-primary-hover">
                    {j.joinPolicy === 'auto' ? 'Join' : 'Ask to join'}
                  </button>
                </form>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );

  return <DashboardGrid main={main} feed={<ActivityFeed entries={feed} empty="Your activity will show here: courses you start, lessons you finish and reflections you save." />} />;
}

function SpaceRow({ name, detail, here, value, badge }: { name: string; detail: string; here: boolean; value: string; badge?: string }) {
  return (
    <button
      type="submit"
      name="orgId"
      value={value}
      disabled={here}
      className="flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2.5 text-left ring-1 ring-line enabled:hover:ring-line-heavy disabled:cursor-default disabled:ring-2 disabled:ring-primary"
    >
      <OrgMark size={28} name={name} personal={!value} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
        <span className="block truncate text-[12.5px] text-muted">{detail}</span>
      </span>
      {here ? <Badge tone="green">You’re here</Badge> : badge ? <Badge tone="gold">{badge}</Badge> : <span className="text-[13px] font-semibold text-link">Open</span>}
    </button>
  );
}
