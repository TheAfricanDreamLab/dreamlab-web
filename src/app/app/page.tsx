import type { CourseSummary, EnrollmentSummary, InvitationSchema, JoinableOrganization, Membership } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { type AttentionItem, AttentionList, Figures, greetingFor, ProgressBar, SectionHeading } from '@/components/app/dashboard';
import { CourseCover } from '@/components/learning/course-ui';
import { ButtonLink, Notice } from '@/components/ui/primitives';
import { FlashToast } from '@/components/ui/toast';
import { messageForCode } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { ROLE_LABELS } from '@/lib/labels';
import { LEVEL_LABELS, plural } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'My space' };

/**
 * Home: a greeting, the one course to carry on with, a few more in progress, anything that needs a look,
 * and three small numbers. Everything else has its own page: Activity, Spaces and, for organisation
 * admins, the organisation Overview.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const me = await getMe();
  // The platform admin account does admin work only: its home is the console.
  if (me.platformAdmin) redirect('/app/admin');
  const active = activeMembership(me);
  const firstName = me.user.fullName.split(' ')[0];
  const waiting = me.memberships.filter((m) => m.status === 'requested');
  const orgId = active?.org.id;
  const [joinable, learning, catalog, members, invitations] = await Promise.all([
    api<{ items: JoinableOrganization[] }>('GET', '/v1/me/joinable-orgs'),
    api<{ items: EnrollmentSummary[] }>('GET', '/v1/learning/enrollments'),
    api<{ items: CourseSummary[] }>('GET', '/v1/catalog/courses'),
    orgId && can(me, 'org.members.read') ? api<{ items: Membership[] }>('GET', `/v1/orgs/${orgId}/members?limit=100`) : null,
    orgId && can(me, 'org.members.invite') ? api<{ items: z.infer<typeof InvitationSchema>[] }>('GET', `/v1/orgs/${orgId}/invitations?status=pending&limit=100`) : null,
  ]);

  const enrolments = learning.ok ? learning.data.items : [];
  const continuing = enrolments.filter((e) => e.status !== 'completed').sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
  const [current, ...others] = continuing;
  const upNext = others.slice(0, 3);
  const enrolledSlugs = new Set(enrolments.map((e) => e.courseSlug));
  const discover = (catalog.ok ? catalog.data.items : []).filter((c) => !enrolledSlugs.has(c.slug) && c.availability === 'available');
  // With nothing open: Problem Solving first (the free starting course), then whatever is featured.
  const suggestion = discover.find((c) => c.slug === 'problem-solving') ?? discover.find((c) => c.featured) ?? discover[0];
  const itemsDone = enrolments.reduce((n, e) => n + e.completedItems, 0);
  const creditsEarned = enrolments.filter((e) => e.status === 'completed').reduce((n, e) => n + e.course.creditHours, 0);
  const role = active ? active.roles.map((r) => ROLE_LABELS[r.roleKey] ?? r.roleKey).join(', ') || 'member' : null;

  // Needs your attention: only what is waiting on this person, most pressing first, at most four.
  const requests = members?.ok ? members.data.items.filter((m) => m.status === 'requested').length : 0;
  const activeMembers = members?.ok ? members.data.items.filter((m) => m.status === 'active').length : 0;
  const pendingInvites = invitations?.ok ? invitations.data.items.length : 0;
  const joinables = joinable.ok ? joinable.data.items : [];
  const attention: AttentionItem[] = [
    ...(requests > 0 ? [{ key: 'requests', icon: 'mail' as const, text: `${plural(requests, 'request')} to join ${active!.org.name}`, href: '/app/members' }] : []),
    ...(pendingInvites > 0 ? [{ key: 'invites', icon: 'mail' as const, text: `${plural(pendingInvites, 'invitation')} not yet accepted`, href: '/app/members' }] : []),
    // Setup is open while nobody else is in or invited yet.
    ...(active && invitations?.ok && members?.ok && activeMembers <= 1 && pendingInvites === 0
      ? [{ key: 'setup', icon: 'building' as const, text: `Finish setting up ${active.org.name}`, href: '/app/organisation' }]
      : []),
    ...(joinables.length > 0
      ? [{ key: 'joinable', icon: 'building' as const, text: joinables.length === 1 ? `You can join ${joinables[0]!.org.name}` : `${joinables.length} organisations you can join`, href: '/app/spaces' }]
      : []),
    ...waiting.map((m) => ({ key: `waiting-${m.membershipId}`, icon: 'users' as const, text: `Waiting for ${m.org.name} to let you in`, href: '/app/spaces' })),
  ].slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl">
      {sp.created === 'active' && <FlashToast clear={['created']}>Your organisation is ready. Invite your team whenever you like.</FlashToast>}
      {sp.joined && <FlashToast clear={['joined']}>You’ve joined. Welcome aboard.</FlashToast>}

      <div className="dl-stagger space-y-12 pb-8">
        <header className="space-y-1.5 pt-2">
          <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">
            {greetingFor()}, {firstName}
          </h1>
          <p className="text-[15px] text-muted">
            {active ? (
              <>
                You’re in <span className="font-semibold text-body">{active.org.name}</span> as {role}.
              </>
            ) : (
              'You’re learning on your own.'
            )}
          </p>
        </header>

        {(sp.created === 'pending' || sp.org_changed || sp.requested || sp.join_error) && (
          <div className="space-y-3">
            {sp.created === 'pending' && (
              <Notice tone="info">We’ve got your request. We review new organisations within two working days. Meanwhile you can set things up and invite co-admins.</Notice>
            )}
            {sp.org_changed && (
              <Notice tone="error">Nothing was changed: you switched organisation (perhaps in another tab) after that page opened. Open it again and retry.</Notice>
            )}
            {sp.requested && <Notice tone="info">We’ve asked the organisation’s admins. You’ll see it in your spaces once they say yes.</Notice>}
            {sp.join_error && <Notice tone="error">{messageForCode(sp.join_error)}</Notice>}
          </div>
        )}

        {current ? (
          <section aria-labelledby="continue-learning" className="space-y-4">
            <SectionHeading id="continue-learning" title="Continue learning" action={upNext.length ? undefined : { href: '/app/learning', label: 'All my courses' }} />
            <article className="dl-lift relative flex flex-col overflow-hidden rounded-[var(--radius-tile)] bg-card ring-1 ring-line focus-within:ring-2 focus-within:ring-primary sm:flex-row">
              <CourseCover cover={current.course.cover} className="aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-56" symbolSize={40} eager />
              <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 sm:p-6">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-[20px] font-bold leading-snug text-ink">{current.course.title}</h3>
                  <p className="text-[14px] text-muted">{current.nextItem ? `Next: ${current.nextItem.title}` : `${current.completedItems} of ${current.totalItems} done`}</p>
                </div>
                <div className="space-y-1.5">
                  <ProgressBar value={current.progressPct} label={`${current.course.title}: ${current.progressPct}% done`} />
                  <p className="text-[12.5px] text-muted">{current.completedItems ? `${current.progressPct}% done` : 'Just started'}</p>
                </div>
                <ButtonLink
                  href={current.nextItem ? `/learn/${current.id}/${current.nextItem.id}` : `/learn/${current.id}`}
                  aria-label={`Continue ${current.course.title}`}
                  className="dl-press w-full after:absolute after:inset-0 sm:w-auto sm:self-start"
                >
                  Continue
                </ButtonLink>
              </div>
            </article>
          </section>
        ) : suggestion ? (
          <section aria-labelledby="start-course" className="space-y-4">
            <SectionHeading
              id="start-course"
              title={enrolments.length ? 'Find your next course' : 'Start your first course'}
              action={{ href: '/courses', label: 'Browse the catalogue' }}
            />
            <article className="dl-lift relative flex flex-col overflow-hidden rounded-[var(--radius-tile)] bg-card ring-1 ring-line focus-within:ring-2 focus-within:ring-primary sm:flex-row">
              <CourseCover cover={suggestion.cover} className="aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-56" symbolSize={40} eager />
              <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 sm:p-6">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-[20px] font-bold leading-snug text-ink">{suggestion.title}</h3>
                  <p className="text-[14px] text-muted">
                    {LEVEL_LABELS[suggestion.level]} · {suggestion.creditHours} credits · {suggestion.provider}
                  </p>
                </div>
                <ButtonLink href={`/courses/${suggestion.slug}`} aria-label={`Have a look at ${suggestion.title}`} className="dl-press w-full after:absolute after:inset-0 sm:w-auto sm:self-start">
                  Have a look
                </ButtonLink>
              </div>
            </article>
          </section>
        ) : (
          <section aria-labelledby="start-course" className="space-y-2">
            <h2 id="start-course" className="text-[17px] font-bold">
              {enrolments.length ? 'You’ve finished everything you started' : 'Start your first course'}
            </h2>
            <p className="text-[14.5px] text-muted">
              <Link href="/courses" className="font-semibold text-link hover:underline">
                Browse the catalogue
              </Link>{' '}
              to find what’s next.
            </p>
          </section>
        )}

        {upNext.length > 0 && (
          <section aria-labelledby="up-next" className="space-y-2">
            <SectionHeading id="up-next" title="Up next" action={{ href: '/app/learning', label: 'All my courses' }} />
            <ul className="-mx-3 space-y-1">
              {upNext.map((e) => (
                <li key={e.id}>
                  <Link
                    href={e.nextItem ? `/learn/${e.id}/${e.nextItem.id}` : `/learn/${e.id}`}
                    aria-label={`Carry on with ${e.course.title}, ${e.progressPct}% done`}
                    className="dl-lift flex items-center gap-4 rounded-[var(--radius-field)] px-3 py-3 hover:bg-card"
                  >
                    <CourseCover cover={e.course.cover} className="h-12 w-12 shrink-0 rounded-xl" symbolSize={18} />
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="block truncate text-[15px] font-semibold text-ink">{e.course.title}</span>
                      <span className="flex items-center gap-3">
                        <ProgressBar value={e.progressPct} label={`${e.course.title}: ${e.progressPct}% done`} className="flex-1" />
                        <span className="w-10 shrink-0 text-right text-[12.5px] tabular-nums text-muted">{e.progressPct}%</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {attention.length > 0 && (
          <section aria-labelledby="attention" className="space-y-1">
            <SectionHeading id="attention" title="Needs your attention" />
            <AttentionList items={attention} />
          </section>
        )}

        {enrolments.length > 0 && (
          <section aria-labelledby="numbers" className="space-y-4">
            <SectionHeading id="numbers" title="Your learning so far" action={{ href: '/app/activity', label: 'See your activity' }} />
            <Figures
              label="Your learning so far"
              items={[
                { label: 'Courses in progress', value: continuing.length },
                { label: 'Lessons done', value: itemsDone },
                { label: 'Credits earned', value: creditsEarned },
              ]}
            />
          </section>
        )}
      </div>
    </div>
  );
}
