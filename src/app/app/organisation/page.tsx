import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Figures, LoadNote, PageTitle, SectionHeading } from '@/components/app/dashboard';
import type { DomainView, SsoView } from '@/components/settings/settings-forms';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { api, countList, type ListCount } from '@/lib/gateway';
import { KIND_LABELS } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Organisation overview' };

/** `done: null` means we couldn't check, so the step shows neither ticked nor to do. */
type Step = { done: boolean | null; title: string; text: string; href?: string; cta?: string };

const figure = (c: ListCount | null) => (c ? { value: c.n, suffix: c.more ? '+' : undefined } : { value: null });

/** For organisation admins: a few figures about members, and the steps to get the organisation going. */
export default async function OrganisationOverviewPage() {
  const me = await getMe();
  if (me.platformAdmin) redirect('/app/admin');
  const active = activeMembership(me);
  const canRead = can(me, 'org.members.read');
  const canInvite = can(me, 'org.members.invite');
  const canSecurity = can(me, 'org.security.manage');
  if (!active || !(canRead || canInvite)) redirect('/app');
  const orgId = active.org.id;
  // Counts follow every page (up to 500); sign-in settings are read the way /app/settings reads them.
  const [activeMembers, requests, pending, domains, sso] = await Promise.all([
    canRead ? countList(`/v1/orgs/${orgId}/members?status=active`) : null,
    canRead ? countList(`/v1/orgs/${orgId}/members?status=requested`) : null,
    canInvite ? countList(`/v1/orgs/${orgId}/invitations?status=pending`) : null,
    canSecurity ? api<{ items: DomainView[] }>('GET', `/v1/orgs/${orgId}/domains`) : null,
    canSecurity ? api<SsoView>('GET', `/v1/orgs/${orgId}/sso`) : null,
  ]);
  const membersFailed = canRead && (!activeMembers || !requests);
  const invitesFailed = canInvite && !pending;
  // One list showing someone else is in is enough; "to do" needs both the member count and the invitations,
  // so without either (not loaded, or not ours to see) the step stays unknown.
  const invited: boolean | null = (activeMembers && activeMembers.n > 1) || (pending && pending.n > 0) ? true : !activeMembers || !pending ? null : false;
  const signIn: boolean | null = domains?.ok && sso?.ok ? domains.data.items.some((d) => d.verified) && Boolean(sso.data.connection?.enabled) : null;

  const steps: Step[] = [
    { done: true, title: 'Create the organisation', text: 'Done.' },
    {
      done: invited,
      title: 'Invite your team',
      text: invited
        ? 'Done. Invite more whenever you like.'
        : invited === null
          ? canInvite && canRead
            ? 'We couldn’t check this just now.'
            : 'Someone who can see members and invitations can check this.'
          : 'Send invitations by email or phone.',
      href: canInvite ? '/app/members' : undefined,
      cta: 'Invite',
    },
    // Only people who can change sign-in settings see this step.
    ...(canSecurity
      ? [
          {
            done: signIn,
            title: 'Connect your company sign-in (optional)',
            text: signIn
              ? 'Done. Your verified domain signs in with your own sign-on.'
              : signIn === null
                ? 'We couldn’t check your sign-in settings just now.'
                : 'Verify your email domain, then add Microsoft, Google Workspace, Okta or any SAML/OIDC sign-on.',
            href: '/app/settings',
            cta: signIn === null ? 'Open settings' : 'Set up',
          },
        ]
      : []),
    { done: false, title: 'Explore learning', text: 'Browse the course catalogue. Assigning courses to your team comes next.', href: '/courses', cta: 'Browse' },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="dl-stagger space-y-12 pb-8">
        <PageTitle title="Overview" intro={`${active.org.name} · ${KIND_LABELS[active.org.kinds[0] ?? ''] ?? 'Organisation'}`} />

        {canRead && (
          <section aria-labelledby="org-figures" className="space-y-4">
            <SectionHeading id="org-figures" title="Members" action={{ href: '/app/members', label: 'Manage members' }} />
            <Figures
              label="Members"
              items={[
                { label: 'Active members', ...figure(activeMembers) },
                ...(canInvite ? [{ label: 'Invitations waiting', ...figure(pending) }] : []),
                { label: 'Asking to join', ...figure(requests) },
              ]}
            />
            {(membersFailed || invitesFailed) && <LoadNote retry="/app/organisation">We couldn’t load some of these figures just now.</LoadNote>}
          </section>
        )}

        <section aria-labelledby="org-setup" className="space-y-2">
          <SectionHeading id="org-setup" title="Get your organisation going" />
          <ol className="divide-y divide-line">
            {steps.map((s) => (
              <li key={s.title} className="flex items-start gap-4 py-4">
                <span
                  aria-hidden
                  className={cx(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full',
                    s.done ? 'bg-primary text-white' : s.done === null ? 'bg-surface ring-1 ring-line' : 'ring-1 ring-line-heavy',
                  )}
                >
                  {s.done && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className={cx('text-[15px] font-semibold', s.done ? 'text-muted' : 'text-ink')}>
                    {s.title}
                    <span className="sr-only">{s.done ? ' (done)' : s.done === null ? ' (couldn’t check)' : ' (to do)'}</span>
                  </p>
                  <p className="text-[14px] text-muted">{s.text}</p>
                </div>
                {s.href && !s.done && (
                  <Link href={s.href} className="dl-press -my-1 inline-flex min-h-11 shrink-0 items-center px-1 text-[14px] font-semibold text-link hover:underline">
                    {s.cta}
                    <span className="sr-only">: {s.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
