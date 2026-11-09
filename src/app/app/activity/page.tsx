import type { CourseSummary, EnrollmentSummary } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ActivityFeed, type FeedEntry, inPeriod, LoadNote, PageTitle, periodOf, SummaryHeader, SummaryTile } from '@/components/app/dashboard';
import { api, countList } from '@/lib/gateway';
import { type JournalEntry, LEVEL_LABELS, pluralCount } from '@/lib/learning';
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
  const canRead = Boolean(orgId) && can(me, 'org.members.read');
  const canInvite = Boolean(orgId) && can(me, 'org.members.invite');
  const [learning, journal, catalog, members, invitations] = await Promise.all([
    api<{ items: EnrollmentSummary[] }>('GET', '/v1/learning/enrollments'),
    api<{ items: JournalEntry[] }>('GET', '/v1/learning/journal'),
    api<{ items: CourseSummary[] }>('GET', '/v1/catalog/courses'),
    canRead ? countList(`/v1/orgs/${orgId}/members?status=active`) : null,
    canInvite ? countList(`/v1/orgs/${orgId}/invitations?status=pending`) : null,
  ]);

  const enrolments = learning.ok ? learning.data.items : [];
  const entries = journal.ok ? journal.data.items : [];
  const continuing = enrolments.filter((e) => e.status !== 'completed');
  const completed = enrolments.filter((e) => e.status === 'completed');
  const enrolledSlugs = new Set(enrolments.map((e) => e.courseSlug));
  const discover = (catalog.ok ? catalog.data.items : []).filter((c) => !enrolledSlugs.has(c.slug) && c.availability === 'available');
  const periodText = period === 'month' ? 'this month' : 'so far';
  // A figure that didn't load shows a dash and says so, never a zero.
  const unknown = { count: '–', note: 'Couldn’t load just now' };

  const tiles = [
    {
      title: 'In progress',
      text: continuing.length ? 'Pick up where you left off.' : 'Nothing open. Start a course.',
      href: '/app/learning',
      updated: latest(continuing.map((e) => e.lastActiveAt)),
      count: continuing.length,
      tone: 'jade' as const,
      ...(learning.ok ? {} : { ...unknown, text: 'Courses you’ve started.' }),
    },
    {
      title: 'Completed',
      text: `Courses you finished ${periodText}.`,
      href: '/app/learning',
      updated: latest(completed.map((e) => e.completedAt)),
      count: completed.filter((e) => inPeriod(e.completedAt, period)).length,
      tone: 'gold' as const,
      ...(learning.ok ? {} : unknown),
    },
    {
      title: 'Reflections',
      text: `Saved to your journal ${periodText}.`,
      href: '/app/journal',
      updated: latest(entries.map((e) => e.createdAt)),
      count: entries.filter((e) => inPeriod(e.createdAt, period)).length,
      tone: 'sky' as const,
      ...(journal.ok ? {} : unknown),
    },
    canRead && active
      ? {
          title: 'Members',
          text: `Everyone in ${active.org.name}.`,
          href: '/app/members',
          note: invitations?.n ? `${pluralCount(invitations, 'invitation')} waiting` : canInvite && !invitations ? 'Invitations couldn’t load just now' : 'No invitations waiting',
          count: members ? (members.more ? `${members.n}+` : members.n) : '–',
          tone: 'sage' as const,
        }
      : {
          title: 'New to explore',
          text: 'Open courses you haven’t started.',
          href: '/courses',
          note: 'Free to start',
          count: discover.length,
          tone: 'sage' as const,
          ...(learning.ok && catalog.ok ? {} : unknown),
        },
  ];
  const feedGaps = [!learning.ok && 'courses', !journal.ok && 'reflections'].filter(Boolean).join(' and ');

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
        {(!learning.ok || !journal.ok || (canRead && !members) || (canInvite && !invitations)) && (
          <LoadNote retry={`/app/activity?period=${period}`}>We couldn’t load some of these figures just now.</LoadNote>
        )}
      </section>

      <ActivityFeed
        entries={feed}
        empty={feedGaps ? 'Nothing to show yet.' : 'Your activity will show here: courses you start, lessons you finish and reflections you save.'}
        notice={feedGaps ? <LoadNote retry={`/app/activity?period=${period}`}>{`We couldn’t load your ${feedGaps} just now, so this feed may be missing some activity.`}</LoadNote> : undefined}
      />
    </div>
  );
}
