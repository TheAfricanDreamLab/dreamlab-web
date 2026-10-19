'use server';

import type { TokenResponse } from '@dreamlab/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { friendlyError, fieldErrors } from '@/lib/errors';
import { FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { cookies } from 'next/headers';
import { getClaims, REFRESH_COOKIE, saveTokens } from '@/lib/session';

async function activeOrg(): Promise<string> {
  const claims = await getClaims();
  if (!claims?.org) redirect('/app');
  return claims.org;
}

/** Re-issue tokens now (the session changed), instead of waiting for the next automatic refresh. */
async function refreshNow(): Promise<void> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return;
  const res = await api<TokenResponse>('POST', '/v1/auth/refresh', { refreshToken });
  if (res.ok) await saveTokens(res.data);
}

const done = (path: string, notice: string): FormState => {
  revalidatePath(path);
  return { notice };
};

// ---------- Two-step sign-in (your own account) ----------

export async function setupAuthenticator(): Promise<FormState> {
  const res = await api<{ secret: string; otpauthUrl: string }>('POST', '/v1/auth/mfa/totp/setup', {});
  if (!res.ok) return { error: friendlyError(res.error) };
  return { values: { secret: res.data.secret, otpauthUrl: res.data.otpauthUrl } };
}

export async function confirmAuthenticator(_: FormState, fd: FormData): Promise<FormState> {
  const res = await api<{ recoveryCodes: string[] }>('POST', '/v1/auth/mfa/totp/confirm', { code: str(fd, 'code') });
  if (!res.ok) return { error: friendlyError(res.error), values: { secret: str(fd, 'secret'), otpauthUrl: str(fd, 'otpauthUrl') } };
  // This session has now passed a second factor; refresh so the new tokens say so.
  await refreshNow();
  revalidatePath('/app/account');
  return { notice: 'Two-step sign-in is on.', values: { recoveryCodes: res.data.recoveryCodes.join(' ') } };
}

export async function stepUp(_: FormState, fd: FormData): Promise<FormState> {
  const res = await api<TokenResponse>('POST', '/v1/auth/mfa/step-up', { code: str(fd, 'code') });
  if (!res.ok) return { error: friendlyError(res.error) };
  await saveTokens(res.data);
  return done('/app', 'Confirmed. You can manage your organisation now.');
}

export async function newRecoveryCodes(_: FormState, fd: FormData): Promise<FormState> {
  const res = await api<{ recoveryCodes: string[] }>('POST', '/v1/auth/mfa/recovery-codes', { code: str(fd, 'code') });
  if (!res.ok) return { error: friendlyError(res.error) };
  return { notice: 'New recovery codes. The old ones no longer work.', values: { recoveryCodes: res.data.recoveryCodes.join(' ') } };
}

export async function disableAuthenticator(_: FormState, fd: FormData): Promise<FormState> {
  const res = await api('POST', '/v1/auth/mfa/disable', { code: str(fd, 'code') });
  if (!res.ok) return { error: friendlyError(res.error) };
  return done('/app/account', 'Two-step sign-in is off.');
}

// ---------- Email domains ----------

export async function addDomain(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const domain = str(fd, 'domain').toLowerCase().replace(/^https?:\/\//, '').replace(/^.*@/, '').replace(/\/.*$/, '');
  const res = await api('POST', `/v1/orgs/${orgId}/domains`, { domain });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values: { domain } };
  return done('/app/settings', `${domain} added. Publish the TXT record below, then verify.`);
}

export async function verifyDomain(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const res = await api<{ domain: string }>('POST', `/v1/orgs/${orgId}/domains/${str(fd, 'domainId')}/verify`);
  if (!res.ok) return { error: friendlyError(res.error) };
  return done('/app/settings', `${res.data.domain} is verified.`);
}

export async function setJoinPolicy(fd: FormData): Promise<void> {
  const orgId = await activeOrg();
  await api('PATCH', `/v1/orgs/${orgId}/domains/${str(fd, 'domainId')}`, { joinPolicy: str(fd, 'joinPolicy') });
  revalidatePath('/app/settings');
}

export async function removeDomain(fd: FormData): Promise<void> {
  const orgId = await activeOrg();
  await api('DELETE', `/v1/orgs/${orgId}/domains/${str(fd, 'domainId')}`);
  revalidatePath('/app/settings');
}

// ---------- Single sign-on ----------

export async function saveSso(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const protocol = str(fd, 'protocol') === 'saml' ? 'saml' : 'oidc';
  const values = Object.fromEntries(['protocol', 'issuer', 'clientId', 'idpEntityId', 'idpSsoUrl', 'certificate'].map((k) => [k, str(fd, k)]));
  const body =
    protocol === 'oidc'
      ? { protocol, issuer: values.issuer, clientId: values.clientId, ...(str(fd, 'clientSecret') ? { clientSecret: str(fd, 'clientSecret') } : {}) }
      : { protocol, idpEntityId: values.idpEntityId, idpSsoUrl: values.idpSsoUrl, certificate: String(fd.get('certificate') ?? '') };
  const res = await api('PUT', `/v1/orgs/${orgId}/sso`, body);
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  return done('/app/settings', 'Saved. Run “Test sign-on” next.');
}

export async function updateSso(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const patch: Record<string, unknown> = {};
  // Each checkbox sends a hidden "false" first, then "true" when ticked.
  if (fd.has('enabled')) patch.enabled = fd.getAll('enabled').includes('true');
  if (fd.has('enforced')) patch.enforced = fd.getAll('enforced').includes('true');
  if (fd.has('defaultRoleKey')) patch.defaultRoleKey = str(fd, 'defaultRoleKey');
  const res = await api('PATCH', `/v1/orgs/${orgId}/sso`, patch);
  if (!res.ok) return { error: friendlyError(res.error) };
  return done('/app/settings', 'Updated.');
}

export async function removeSso(fd: FormData): Promise<void> {
  void fd;
  const orgId = await activeOrg();
  await api('DELETE', `/v1/orgs/${orgId}/sso`);
  revalidatePath('/app/settings');
}

// ---------- SCIM ----------

export async function createScimToken(): Promise<FormState> {
  const orgId = await activeOrg();
  const res = await api<{ token: string; baseUrl: string }>('POST', `/v1/orgs/${orgId}/scim/token`);
  if (!res.ok) return { error: friendlyError(res.error) };
  revalidatePath('/app/settings');
  return { notice: 'Copy this token now. It won’t be shown again.', values: { token: res.data.token, baseUrl: res.data.baseUrl } };
}

export async function disableScim(fd: FormData): Promise<void> {
  void fd;
  const orgId = await activeOrg();
  await api('DELETE', `/v1/orgs/${orgId}/scim`);
  revalidatePath('/app/settings');
}

// ---------- Security policy ----------

export async function setAdminMfa(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const res = await api('PATCH', `/v1/orgs/${orgId}/security`, { requireAdminMfa: str(fd, 'requireAdminMfa') === 'true' });
  if (!res.ok) return { error: friendlyError(res.error) };
  return done('/app/settings', 'Security policy updated.');
}

// ---------- Custom roles ----------

export async function createRole(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const values = { name: str(fd, 'name'), description: str(fd, 'description') };
  const permissions = fd.getAll('permissions').map(String);
  if (permissions.length === 0) return { error: 'Choose at least one thing this role can do.', values };
  const res = await api('POST', `/v1/orgs/${orgId}/roles`, { ...values, permissions: ['org.read', ...permissions.filter((p) => p !== 'org.read')] });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  return done('/app/roles', `“${values.name}” created. Give it to people from the People page.`);
}

export async function updateRole(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const permissions = fd.getAll('permissions').map(String);
  if (permissions.length === 0) return { error: 'Choose at least one thing this role can do.' };
  const res = await api('PATCH', `/v1/orgs/${orgId}/roles/${str(fd, 'roleKey')}`, { permissions: ['org.read', ...permissions.filter((p) => p !== 'org.read')] });
  if (!res.ok) return { error: friendlyError(res.error) };
  return done('/app/roles', 'Saved. Everyone with this role has the new permissions now.');
}

export async function deleteRole(_: FormState, fd: FormData): Promise<FormState> {
  const orgId = await activeOrg();
  const res = await api('DELETE', `/v1/orgs/${orgId}/roles/${str(fd, 'roleKey')}`);
  if (!res.ok) return { error: friendlyError(res.error) };
  return done('/app/roles', 'Role deleted.');
}

// ---------- Joining by email domain ----------

export async function joinOrganisation(fd: FormData): Promise<void> {
  const orgId = str(fd, 'orgId');
  const res = await api<{ status: 'active' | 'requested' }>('POST', `/v1/orgs/${orgId}/join`);
  if (res.ok && res.data.status === 'active') {
    const switched = await api<TokenResponse>('POST', '/v1/auth/switch-org', { orgId });
    if (switched.ok) await saveTokens(switched.data);
    redirect('/app?joined=1');
  }
  redirect(res.ok ? '/app?requested=1' : `/app?join_error=${encodeURIComponent(friendlyError(res.error))}`);
}

export async function answerJoinRequest(fd: FormData): Promise<void> {
  const orgId = await activeOrg();
  const membershipId = str(fd, 'membershipId');
  if (str(fd, 'answer') === 'approve') {
    await api('PATCH', `/v1/orgs/${orgId}/members/${membershipId}`, { status: 'active' });
    await api('POST', `/v1/orgs/${orgId}/members/${membershipId}/roles`, { roleKey: 'learner', scopeType: 'org' });
  } else {
    await api('DELETE', `/v1/orgs/${orgId}/members/${membershipId}`);
  }
  revalidatePath('/app/members');
}
