import type { InvitationSchema, Membership } from '@dreamlab/contracts';
import type { z } from 'zod';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { removeMember, revokeInvitation, revokeRole } from '@/app/actions/org';
import { answerJoinRequest } from '@/app/actions/security';
import { AddRoleForm, InviteForm } from '@/components/directory/member-forms';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { messageForCode } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { initials, ROLE_LABELS } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';
import { OrgField } from '@/components/app/org-binding';

export const metadata: Metadata = { title: 'People' };

type InvitationRow = z.infer<typeof InvitationSchema>;

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const me = await getMe();
  const active = activeMembership(me);
  if (!active) redirect('/app');
  const orgId = active.org.id;
  const canInvite = can(me, 'org.members.invite');
  const canAssign = can(me, 'org.roles.assign');
  const canRevoke = can(me, 'org.roles.revoke');
  const canRemove = can(me, 'org.members.remove');

  const [allMembers, invitations, orgRoles, authoring] = await Promise.all([
    api<{ items: Membership[] }>('GET', `/v1/orgs/${orgId}/members?limit=100`),
    canInvite ? api<{ items: InvitationRow[] }>('GET', `/v1/orgs/${orgId}/invitations?status=pending&limit=100`) : null,
    api<{ items: { key: string; name: string; description: string; system: boolean; scopeTypes: string[] }[] }>('GET', `/v1/orgs/${orgId}/roles`),
    // The organisation's courses, so a role such as Course author can be given for one course.
    canAssign ? api<{ courses: { courseId: string; title: string }[] }>('GET', '/v1/catalog/authoring') : null,
  ]);
  const customRoles = orgRoles.ok
    ? orgRoles.data.items.filter((r) => !r.system && r.scopeTypes.includes('org')).map((r) => ({ key: r.key, label: r.name, hint: r.description || 'Custom role' }))
    : [];
  const roleName = (key: string) => ROLE_LABELS[key] ?? customRoles.find((r) => r.key === key)?.label ?? key;
  const courses = authoring?.ok ? authoring.data.courses.map((c) => ({ id: c.courseId, title: c.title })) : [];
  const scopeName = (r: { scopeType: string; scopeId: string | null }) =>
    r.scopeType === 'course' ? (courses.find((c) => c.id === r.scopeId)?.title ?? 'one course') : r.scopeType === 'org' ? null : r.scopeType.replace('_', ' ');
  const requests = allMembers.ok ? allMembers.data.items.filter((m) => m.status === 'requested') : [];
  const members = allMembers.ok ? { ok: true as const, data: { items: allMembers.data.items.filter((m) => m.status !== 'requested') } } : allMembers;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active.org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">People</h1>
        <p className="text-[14.5px] text-muted">Everyone in your organisation, and the invitations still waiting.</p>
      </header>

      {!members.ok && <Notice tone="error">{members.error.message}</Notice>}
      {sp.error && <Notice tone="error">{messageForCode(sp.error)}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
                            {roleName(r.roleKey)}
                            {scopeName(r) && <span className="text-muted">· {scopeName(r)}</span>}
                            {canRevoke && (
                              <form action={revokeRole}>
                                <OrgField />
                                <input type="hidden" name="assignmentId" value={r.id} />
                                <button type="submit" className="-my-1 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-danger-tint hover:text-danger-ink sm:h-5 sm:w-5" aria-label={`Remove ${roleName(r.roleKey)} role`}>
                                  ×
                                </button>
                              </form>
                            )}
                          </span>
                        ))}
                        {canAssign && <AddRoleForm membershipId={m.id} has={m.roles.filter((r) => r.scopeType === 'org').map((r) => r.roleKey)} customRoles={customRoles} courses={courses} />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.status !== 'active' && <Badge tone={m.status === 'suspended' ? 'danger' : 'gold'}>{m.status}</Badge>}
                      {canRemove && !isMe && (
                        <form action={removeMember}>
                          <OrgField />
                          <input type="hidden" name="membershipId" value={m.id} />
                          <button type="submit" className="min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-danger-ink hover:bg-danger-tint">
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
          {requests.length > 0 && canInvite && (
            <Card className="overflow-hidden">
              <h2 className="border-b border-line px-5 py-4 text-[17px] font-bold">Asking to join</h2>
              <ul className="divide-y divide-line">
                {requests.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{m.user.fullName}</p>
                      <p className="truncate text-[12.5px] text-muted">{m.user.email}</p>
                    </div>
                    <form action={answerJoinRequest} className="flex gap-1">
                      <OrgField />
                      <input type="hidden" name="membershipId" value={m.id} />
                      <button type="submit" name="answer" value="approve" className="min-h-10 rounded-lg bg-primary px-3 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
                        Let in
                      </button>
                      <button type="submit" name="answer" value="decline" className="min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-muted hover:bg-danger-tint hover:text-danger-ink">
                        Decline
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {canInvite && (
            <Card className="space-y-4 p-5">
              <h2 className="text-[17px] font-bold">Invite someone</h2>
              {active.org.status === 'pending' && <Notice tone="info">While you’re in review, you can invite co-admins. Learners can join after approval.</Notice>}
              <InviteForm orgPending={active.org.status === 'pending'} canAssignRoles={canAssign} customRoles={customRoles} />
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
                        {inv.roleKeys.map(roleName).join(', ')} · expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <form action={revokeInvitation}>
                      <OrgField />
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button type="submit" className="min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-muted hover:bg-danger-tint hover:text-danger-ink">
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
