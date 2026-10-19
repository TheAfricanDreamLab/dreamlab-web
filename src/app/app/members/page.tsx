import type { InvitationSchema, Membership } from '@dreamlab/contracts';
import type { z } from 'zod';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { removeMember, revokeInvitation, revokeRole } from '@/app/actions/org';
import { AddRoleForm, InviteForm } from '@/components/directory/member-forms';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { api } from '@/lib/gateway';
import { initials, ROLE_LABELS } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'People' };

type InvitationRow = z.infer<typeof InvitationSchema>;

export default async function MembersPage() {
  const me = await getMe();
  const active = activeMembership(me);
  if (!active) redirect('/app');
  const orgId = active.org.id;
  const canInvite = can(me, 'org.members.invite');
  const canAssign = can(me, 'org.roles.assign');
  const canRevoke = can(me, 'org.roles.revoke');
  const canRemove = can(me, 'org.members.remove');

  const [members, invitations] = await Promise.all([
    api<{ items: Membership[] }>('GET', `/v1/orgs/${orgId}/members?limit=100`),
    canInvite ? api<{ items: InvitationRow[] }>('GET', `/v1/orgs/${orgId}/invitations?status=pending&limit=100`) : null,
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active.org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">People</h1>
        <p className="text-[14.5px] text-muted">Everyone in your organisation, and the invitations still waiting.</p>
      </header>

      {!members.ok && <Notice tone="error">{members.error.message}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[17px] font-bold">Members</h2>
            <Badge>{members.ok ? `${members.data.items.length}` : '—'}</Badge>
          </div>
          <ul className="divide-y divide-line">
            {members.ok &&
              members.data.items.map((m) => {
                const isMe = m.userId === me.user.id;
                return (
                  <li key={m.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-success-tint font-display text-sm font-bold text-link">{initials(m.user.fullName)}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[14.5px] font-semibold text-ink">
                        {m.user.fullName} {isMe && <span className="text-[12px] font-normal text-muted">(you)</span>}
                      </p>
                      <p className="truncate text-[12.5px] text-muted">{m.user.email ?? m.user.phone}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {m.roles.map((r) => (
                          <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-surface py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-ink ring-1 ring-line">
                            {ROLE_LABELS[r.roleKey] ?? r.roleKey}
                            {canRevoke && (
                              <form action={revokeRole}>
                                <input type="hidden" name="assignmentId" value={r.id} />
                                <button type="submit" className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-danger-tint hover:text-danger-ink" aria-label={`Remove ${ROLE_LABELS[r.roleKey] ?? r.roleKey} role`}>
                                  ×
                                </button>
                              </form>
                            )}
                          </span>
                        ))}
                        {canAssign && <AddRoleForm membershipId={m.id} has={m.roles.map((r) => r.roleKey)} />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.status !== 'active' && <Badge tone={m.status === 'suspended' ? 'danger' : 'gold'}>{m.status}</Badge>}
                      {canRemove && !isMe && (
                        <form action={removeMember}>
                          <input type="hidden" name="membershipId" value={m.id} />
                          <button type="submit" className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-danger-ink hover:bg-danger-tint">
                            Remove
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </Card>

        <div className="space-y-6">
          {canInvite && (
            <Card className="space-y-4 p-5">
              <h2 className="text-[17px] font-bold">Invite someone</h2>
              {active.org.status === 'pending' && <Notice tone="info">While you’re in review, you can invite co-admins. Learners can join after approval.</Notice>}
              <InviteForm orgPending={active.org.status === 'pending'} canAssignRoles={canAssign} />
            </Card>
          )}
          {invitations?.ok && invitations.data.items.length > 0 && (
            <Card className="overflow-hidden">
              <h2 className="border-b border-line px-5 py-4 text-[17px] font-bold">Waiting to join</h2>
              <ul className="divide-y divide-line">
                {invitations.data.items.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{inv.email ?? inv.phone}</p>
                      <p className="text-[12px] text-muted">
                        {inv.roleKeys.map((k) => ROLE_LABELS[k] ?? k).join(', ')} · expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <form action={revokeInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button type="submit" className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-danger-tint hover:text-danger-ink">
                        Cancel
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
