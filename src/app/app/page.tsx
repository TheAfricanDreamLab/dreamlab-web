import type { Metadata } from 'next';
import Link from 'next/link';
import { switchOrg } from '@/app/actions/auth';
import { Badge, ButtonLink, Card, Eyebrow, LogoMark, Notice } from '@/components/ui/primitives';
import { KIND_LABELS, ROLE_LABELS } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'My space' };

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const me = await getMe();
  const active = activeMembership(me);
  const firstName = me.user.fullName.split(' ')[0];
  const others = me.memberships.filter((m) => m.membershipId !== active?.membershipId && m.status === 'active');

  return (
    <div className="space-y-8">
      {sp.created === 'active' && <Notice tone="success">Your organisation is ready. Invite your team whenever you like.</Notice>}
      {sp.created === 'pending' && (
        <Notice tone="info">We’ve got your request. We review new organisations within two working days. Meanwhile you can set things up and invite co-admins.</Notice>
      )}
      {sp.joined && <Notice tone="success">You’ve joined. Welcome aboard!</Notice>}

      <section className="space-y-2">
        <Eyebrow tone="gold">{active ? active.org.name : 'Personal space'}</Eyebrow>
        <h1 className="text-[34px] font-extrabold leading-tight">Welcome, {firstName}.</h1>
        <p className="max-w-2xl text-[15px] text-muted">
          {active
            ? `You’re here as ${active.roles.map((r) => ROLE_LABELS[r.roleKey] ?? r.roleKey).join(', ') || 'a member'}.`
            : 'You’re learning on your own. Courses arrive here soon. You can also join or start an organisation.'}
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
                  { done: true, title: 'Create the organisation', text: 'Done. You’re its admin.' },
                  { done: false, title: 'Invite your people', text: 'Send invitations by email or phone.', href: can(me, 'org.members.invite') ? '/app/members' : undefined },
                  { done: false, title: 'Assign learning', text: 'Courses and programmes arrive in the next release.' },
                ]
              : [
                  { done: true, title: 'Create your account', text: 'Done. Welcome!' },
                  { done: false, title: 'Secure your account', text: 'Check your devices and password.', href: '/app/account' },
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

        <Card className="space-y-4 p-6">
          <h2 className="text-[18px] font-bold">Your organisations</h2>
          {others.length === 0 && !active ? (
            <p className="text-[14px] text-muted">None yet. When someone invites you, it appears here.</p>
          ) : (
            <form action={switchOrg} className="space-y-2">
              {others.map((m) => (
                <button key={m.membershipId} type="submit" name="orgId" value={m.org.id} className="flex w-full items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2.5 text-left ring-1 ring-line hover:ring-line-heavy">
                  <LogoMark size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{m.org.name}</span>
                    <span className="block text-[12px] text-muted">{KIND_LABELS[m.org.kinds[0] ?? ''] ?? 'Organisation'}</span>
                  </span>
                  {m.org.status === 'pending' && <Badge tone="gold">In review</Badge>}
                </button>
              ))}
              {active && (
                <button type="submit" name="orgId" value="" className="w-full rounded-[var(--radius-field)] px-3 py-2 text-left text-[13.5px] font-semibold text-link hover:bg-success-tint">
                  Switch to my personal space
                </button>
              )}
            </form>
          )}
          <ButtonLink href="/orgs/new" variant="secondary" className="w-full">
            Create an organisation
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
