import type { JoinableOrganization } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { switchOrg } from '@/app/actions/auth';
import { joinOrganisation } from '@/app/actions/security';
import { Badge, ButtonLink, Card, Eyebrow, LogoMark, Notice } from '@/components/ui/primitives';
import { messageForCode } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { KIND_LABELS, ROLE_LABELS } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'My space' };

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const me = await getMe();
  const active = activeMembership(me);
  const firstName = me.user.fullName.split(' ')[0];
  const spaces = me.memberships.filter((m) => m.status === 'active' && m.org.status !== 'suspended');
  const waiting = me.memberships.filter((m) => m.status === 'requested');
  const joinable = await api<{ items: JoinableOrganization[] }>('GET', '/v1/me/joinable-orgs');

  return (
    <div className="space-y-8">
      {sp.created === 'active' && <Notice tone="success">Your organisation is ready. Invite your team whenever you like.</Notice>}
      {sp.created === 'pending' && (
        <Notice tone="info">We’ve got your request. We review new organisations within two working days. Meanwhile you can set things up and invite co-admins.</Notice>
      )}
      {sp.joined && <Notice tone="success">You’ve joined. Welcome aboard!</Notice>}
      {sp.requested && <Notice tone="info">We’ve asked the organisation’s admins. You’ll see it in your spaces once they say yes.</Notice>}
      {sp.join_error && <Notice tone="error">{messageForCode(sp.join_error)}</Notice>}

      <section className="space-y-2">
        <Eyebrow tone="gold">{active ? active.org.name : 'Just me · your personal space'}</Eyebrow>
        <h1 className="text-[34px] font-extrabold leading-tight">Welcome, {firstName}.</h1>
        <p className="max-w-2xl text-[15px] text-muted">
          {active
            ? `You’re working in ${active.org.name} as ${active.roles.map((r) => ROLE_LABELS[r.roleKey] ?? r.roleKey).join(', ') || 'a member'}.`
            : 'You’re learning on your own. Courses arrive here soon. You can also join or set up an organisation.'}
        </p>
      </section>

      {active?.org.status === 'pending' && (
        <Notice tone="info">
          <b>{active.org.name}</b> is in review. You can organise teams and invite co-admins now; learners can join once it’s approved.
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-bold">{active ? 'Get your organisation going' : 'Your next steps'}</h2>
            <Badge tone="green">{active ? KIND_LABELS[active.org.kinds[0] ?? ''] ?? 'Organisation' : 'Learner'}</Badge>
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
                  { done: false, title: 'Assign learning', text: 'Courses and programmes arrive in the next release.' },
                ]
              : [
                  { done: true, title: 'Create your account', text: 'Done. Welcome!' },
                  { done: false, title: 'Secure your account', text: 'Turn on two-step sign-in and check your devices.', href: '/app/account' },
                  { done: false, title: 'Start a course', text: 'The course catalogue opens in the next release.' },
                ]
            ).map((s) => (
              <li key={s.title} className="flex items-start gap-3 rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${s.done ? 'bg-primary text-white' : 'ring-1 ring-line-heavy'}`}>
                  {s.done ? '✓' : ''}
                </span>
                <div className="flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">{s.title}</p>
                  <p className="text-[13px] text-muted">{s.text}</p>
                </div>
                {s.href && (
                  <Link href={s.href} className="self-center text-[13.5px] font-semibold text-link">
                    Go →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4 p-6">
            <div className="space-y-1">
              <h2 className="text-[18px] font-bold">Your spaces</h2>
              <p className="text-[13px] text-muted">Each space has its own courses and people. Switch any time.</p>
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
                <LogoMark size={28} className="opacity-60" />
                <span className="min-w-0 flex-1 text-[13.5px] text-muted">
                  <span className="block truncate font-semibold text-ink">{m.org.name}</span>
                  Waiting for an admin to let you in
                </span>
              </div>
            ))}
            <ButtonLink href="/orgs/new" variant="secondary" className="w-full">
              Set up a new organisation
            </ButtonLink>
          </Card>

          {joinable.ok && joinable.data.items.length > 0 && (
            <Card className="space-y-3 p-6">
              <h2 className="text-[18px] font-bold">You can join</h2>
              <p className="text-[13px] text-muted">These organisations recognise your email address.</p>
              {joinable.data.items.map((j) => (
                <form key={j.org.id} action={joinOrganisation} className="flex items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2.5 ring-1 ring-line">
                  <input type="hidden" name="orgId" value={j.org.id} />
                  <LogoMark size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{j.org.name}</span>
                    <span className="block text-[12px] text-muted">Everyone at @{j.domain}</span>
                  </span>
                  <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-primary-hover">
                    {j.joinPolicy === 'auto' ? 'Join' : 'Ask to join'}
                  </button>
                </form>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SpaceRow({ name, detail, here, value, badge }: { name: string; detail: string; here: boolean; value: string; badge?: string }) {
  return (
    <button
      type="submit"
      name="orgId"
      value={value}
      disabled={here}
      className="flex w-full items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2.5 text-left ring-1 ring-line enabled:hover:ring-line-heavy disabled:cursor-default disabled:ring-2 disabled:ring-primary"
    >
      <LogoMark size={28} className={value ? '' : 'bg-success-tint text-link'} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
        <span className="block truncate text-[12px] text-muted">{detail}</span>
      </span>
      {here ? <Badge tone="green">You’re here</Badge> : badge ? <Badge tone="gold">{badge}</Badge> : <span className="text-[12.5px] font-semibold text-link">Open</span>}
    </button>
  );
}
