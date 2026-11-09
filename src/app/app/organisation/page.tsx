import type { InvitationSchema, Membership } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { Figures, PageTitle, SectionHeading } from '@/components/app/dashboard';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { api } from '@/lib/gateway';
import { KIND_LABELS } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Organisation overview' };

/** For organisation admins: a few figures about members, and the steps to get the organisation going. */
export default async function OrganisationOverviewPage() {
  const me = await getMe();
  if (me.platformAdmin) redirect('/app/admin');
  const active = activeMembership(me);
  const canRead = can(me, 'org.members.read');
  const canInvite = can(me, 'org.members.invite');
  if (!active || !(canRead || canInvite)) redirect('/app');
  const orgId = active.org.id;
  const [members, invitations] = await Promise.all([
    canRead ? api<{ items: Membership[] }>('GET', `/v1/orgs/${orgId}/members?limit=100`) : null,
    canInvite ? api<{ items: z.infer<typeof InvitationSchema>[] }>('GET', `/v1/orgs/${orgId}/invitations?status=pending&limit=100`) : null,
  ]);
  const all = members?.ok ? members.data.items : [];
  const activeCount = all.filter((m) => m.status === 'active').length;
  const requests = all.filter((m) => m.status === 'requested').length;
  const pending = invitations?.ok ? invitations.data.items.length : 0;
  const invited = activeCount > 1 || pending > 0;

  const steps = [
    { done: true, title: 'Create the organisation', text: 'Done.' },
    {
      done: invited,
      title: 'Invite your team',
      text: invited ? 'Done. Invite more whenever you like.' : 'Send invitations by email or phone.',
      href: canInvite ? '/app/members' : undefined,
      cta: 'Invite',
    },
    {
      done: false,
      title: 'Connect your company sign-in (optional)',
      text: 'Verify your email domain, then add Microsoft, Google Workspace, Okta or any SAML/OIDC sign-on.',
      href: can(me, 'org.security.manage') ? '/app/settings' : undefined,
      cta: 'Set up',
    },
    { done: false, title: 'Explore learning', text: 'Browse the course catalogue. Assigning courses to your team comes next.', href: '/courses', cta: 'Browse' },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="dl-stagger space-y-12 pb-8">
        <PageTitle title="Overview" intro={`${active.org.name} · ${KIND_LABELS[active.org.kinds[0] ?? ''] ?? 'Organisation'}`} />

        {canRead && members?.ok && (
          <section aria-labelledby="org-figures" className="space-y-4">
            <SectionHeading id="org-figures" title="Members" action={{ href: '/app/members', label: 'Manage members' }} />
            <Figures
              label="Members"
              items={[
                { label: 'Active members', value: activeCount },
                ...(canInvite ? [{ label: 'Invitations waiting', value: pending }] : []),
                { label: 'Asking to join', value: requests },
              ]}
            />
          </section>
        )}

        <section aria-labelledby="org-setup" className="space-y-2">
          <SectionHeading id="org-setup" title="Get your organisation going" />
          <ol className="divide-y divide-line">
            {steps.map((s) => (
              <li key={s.title} className="flex items-start gap-4 py-4">
                <span
                  aria-hidden
                  className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', s.done ? 'bg-primary text-white' : 'ring-1 ring-line-heavy')}
                >
                  {s.done && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className={cx('text-[15px] font-semibold', s.done ? 'text-muted' : 'text-ink')}>
                    {s.title}
                    <span className="sr-only">{s.done ? ' (done)' : ' (to do)'}</span>
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
