'use server';

import type { Membership, Organization, TokenResponse } from '@dreamlab/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { friendlyError, fieldErrors } from '@/lib/errors';
import { FormState, normaliseIdentifier, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { clearInvite, getClaims, getInvite, saveTokens } from '@/lib/session';

/** Create an organisation as the signed-in user, then step into it. */
export async function createOrganisation(_: FormState, fd: FormData): Promise<FormState> {
  const kind = str(fd, 'kind');
  const name = str(fd, 'name');
  const slug = str(fd, 'slug').toLowerCase();
  const values = { kind, name, slug, sizeBand: str(fd, 'sizeBand'), industry: str(fd, 'industry') };
  const res = await api<Organization>('POST', '/v1/orgs/signup', {
    name,
    kind,
    ...(slug ? { slug } : {}),
    profile: kind === 'enterprise' ? { ...(values.sizeBand ? { sizeBand: values.sizeBand } : {}), ...(values.industry ? { industry: values.industry } : {}) } : {},
  });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  const switched = await api<TokenResponse>('POST', '/v1/auth/switch-org', { orgId: res.data.id });
  if (switched.ok) await saveTokens(switched.data);
  redirect(`/app?created=${res.data.status}`);
}

export async function acceptInvitation(): Promise<FormState> {
  const token = await getInvite();
  if (!token) return { error: 'This invitation link isn’t valid any more. Open the link from your email again.' };
  const res = await api<Membership>('POST', '/v1/invitations/accept', { token });
  if (!res.ok) return { error: friendlyError(res.error) };
  await clearInvite();
  const switched = await api<TokenResponse>('POST', '/v1/auth/switch-org', { orgId: res.data.orgId });
  if (switched.ok) await saveTokens(switched.data);
  redirect('/app?joined=1');
}

export async function declineInvitation(): Promise<void> {
  await clearInvite();
  redirect('/');
}

/**
 * The organisation an org-admin action works on: the session's active one, provided it is the one the
 * form was shown for (OrgField). If the session moved to another organisation since (another tab, or
 * another organisation's site), nothing is changed.
 */
async function activeOrg(fd?: FormData): Promise<string> {
  const claims = await getClaims();
  if (!claims?.org) redirect('/app');
  const shown = fd?.get('orgId');
  if (typeof shown === 'string' && shown && shown !== claims.org) redirect('/app?org_changed=1');
  return claims.org;
}

export async function inviteMember(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg(fd);
  const raw = str(fd, 'identifier');
  const identifier = normaliseIdentifier(raw);
  const role = str(fd, 'role') || 'learner';
  const res = await api('POST', `/v1/orgs/${orgId}/invitations`, {
    ...(identifier.includes('@') ? { email: identifier } : { phone: identifier }),
    roleKeys: [role],
  });
  if (!res.ok) return { error: friendlyError(res.error), values: { identifier: raw, role } };
  revalidatePath('/app/members');
  return { notice: `Invitation sent to ${raw}.` };
}

export async function revokeInvitation(fd: FormData): Promise<void> {
  const orgId = await activeOrg(fd);
  await api('DELETE', `/v1/orgs/${orgId}/invitations/${str(fd, 'invitationId')}`);
  revalidatePath('/app/members');
}

export async function assignRole(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg(fd);
  const scope = str(fd, 'scope');
  const courseId = scope.startsWith('course:') ? scope.slice('course:'.length) : null;
  if (courseId !== null && !isUuid(courseId)) return { error: 'Choose a course from the list.' };
  const res = await api('POST', `/v1/orgs/${orgId}/members/${str(fd, 'membershipId')}/roles`, {
    roleKey: str(fd, 'roleKey'),
    ...(courseId ? { scopeType: 'course', scopeId: courseId } : { scopeType: 'org' }),
  });
  if (!res.ok) return { error: friendlyError(res.error) };
  revalidatePath('/app/members');
  return { notice: 'Role added.' };
}

export async function revokeRole(fd: FormData): Promise<void> {
  const orgId = await activeOrg(fd);
  await api('DELETE', `/v1/orgs/${orgId}/role-assignments/${str(fd, 'assignmentId')}`);
  revalidatePath('/app/members');
}

export async function removeMember(fd: FormData): Promise<void> {
  const orgId = await activeOrg(fd);
  await api('DELETE', `/v1/orgs/${orgId}/members/${str(fd, 'membershipId')}`);
  revalidatePath('/app/members');
}

/** Platform admins approve (pending → active) or suspend organisations. */
export async function setOrganisationStatus(fd: FormData): Promise<void> {
  const status = str(fd, 'status');
  if (!['active', 'suspended'].includes(status)) return;
  await api('PATCH', `/v1/orgs/${str(fd, 'orgId')}`, { status });
  revalidatePath('/app/admin/organisations');
}
