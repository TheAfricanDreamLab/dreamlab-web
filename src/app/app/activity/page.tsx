import type { CourseSummary, EnrollmentSummary, InvitationSchema, Membership } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { ActivityFeed, type FeedEntry, inPeriod, PageTitle, periodOf, SummaryHeader, SummaryTile } from '@/components/app/dashboard';
import { api } from '@/lib/gateway';
import { type JournalEntry, LEVEL_LABELS, plural } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Activity' };

const latest = (dates: (string | null | undefined)[]) => dates.filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;

/** What you've been doing: a summary for this month or all time, then the feed, newest first. */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const period = periodOf(sp.period);
  const me = await getMe();
  if (me.platformAdmin) redirect('/app/admin');
  const active = activeMembership(me);
  const orgId = active?.org.id;
  const [learning, journal, catalog, members, invitations] = await Promise.all([
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
    .slice(0, 30);

  return (
    <div className="dl-stagger space-y-10 pb-8">
      <PageTitle title="Activity" intro="What you’ve been doing: courses you start, lessons you finish and reflections you save." />

      <section className="space-y-4" aria-labelledby="my-summary">
        <SummaryHeader id="my-summary" title="Summary" period={period} action="/app/activity" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <SummaryTile key={t.title} {...t} />
          ))}
        </div>
      </section>

      <ActivityFeed entries={feed} empty="Your activity will show here: courses you start, lessons you finish and reflections you save." />
    </div>
  );
}
