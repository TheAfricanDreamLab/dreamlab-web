'use server';

import { isMfaChallenge, type OtpPurpose, type SignInResponse, type SsoDiscoverySchema, type SsoStartSchema, type TokenResponse } from '@dreamlab/contracts';
import type { z } from 'zod';
import { redirect } from 'next/navigation';
import { friendlyError, fieldErrors } from '@/lib/errors';
import { FormState, normaliseIdentifier, PRIVACY_VERSION, safeNext, str, TERMS_VERSION } from '@/lib/forms';
import { api } from '@/lib/gateway';
import {
  clearMfaChallenge,
  clearPending,
  clearTokens,
  getInvite,
  getMfaChallenge,
  getPending,
  saveTokens,
  setMfaChallenge,
  setPending,
  setSsoState,
} from '@/lib/session';

/** Where to go after signing in: a pending invitation wins, then ?next, then the app. */
async function afterSignIn(next: string | null): Promise<never> {
  // The invitation token waits in an httpOnly cookie; the invitation page picks it up from there.
  if (await getInvite()) redirect('/invitations/accept');
  redirect(safeNext(next));
}

/** The first factor passed: either we have tokens, or the account's authenticator app is next. */
async function completeSignIn(result: SignInResponse, next: string | null): Promise<never> {
  if (isMfaChallenge(result)) {
    await setMfaChallenge(result.mfaToken, result.expiresIn);
    redirect(`/login/mfa?next=${encodeURIComponent(safeNext(next))}`);
  }
  await saveTokens(result);
  return afterSignIn(next);
}

/** Second step of sign-in: a code from the authenticator app, or a recovery code. */
export async function verifyMfa(_: FormState, fd: FormData): Promise<FormState> {
  const mfaToken = await getMfaChallenge();
  if (!mfaToken) return { error: 'This sign-in took too long. Please sign in again.' };
  const code = str(fd, 'code').replace(/\s+/g, '');
  if (!/^(\d{6}|[a-z0-9]{5}-[a-z0-9]{5})$/i.test(code)) return { error: 'Enter the 6-digit code, or a recovery code like k3x9q-7mz2p.' };
  const res = await api<TokenResponse>('POST', '/v1/auth/mfa/verify', { mfaToken, code });
  if (!res.ok) {
    if (res.error.code === 'mfa_challenge_invalid') await clearMfaChallenge();
    return { error: friendlyError(res.error) };
  }
  await clearMfaChallenge();
  await saveTokens(res.data);
  return afterSignIn(str(fd, 'next'));
}

type Discovery = z.infer<typeof SsoDiscoverySchema>;

/** Begin sign-on: remember the state in this browser, then hand the browser to the identity provider. */
async function startSso(orgId: string, next: string, mode: 'signin' | 'test' = 'signin'): Promise<FormState> {
  const res = await api<z.infer<typeof SsoStartSchema>>('POST', '/v1/auth/sso/start', {
    orgId,
    mode,
    returnTo: safeNext(next),
    // The page states the terms next to the button; a first sign-on creates the account.
    consent: { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, aiProcessing: false, marketing: false },
  });
  if (!res.ok) return { error: friendlyError(res.error) };
  await setSsoState(res.data.state, res.data.expiresIn, mode);
  redirect(res.data.redirectUrl);
}

/** "Sign in with your organisation": find the sign-on from a work email or an organisation address. */
export async function signInWithOrganisation(_: FormState, fd: FormData): Promise<FormState> {
  const raw = str(fd, 'organisation');
  const values = { organisation: raw };
  if (!raw) return { error: 'Enter your work email or your organisation’s address.', values };
  const slug = raw.includes('@') ? null : raw.toLowerCase().replace(/^https?:\/\//, '').split('.')[0]!;
  const found = await api<Discovery>('POST', '/v1/auth/sso/discover', slug ? { slug } : { email: raw.toLowerCase() });
  if (!found.ok) return { error: friendlyError(found.error), values };
  return startSso(found.data.orgId, str(fd, 'next'));
}

/** The organisation's own site already knows which sign-on to use. */
export async function signInWithTenantSso(fd: FormData): Promise<void> {
  const result = await startSso(str(fd, 'orgId'), str(fd, 'next'));
  redirect(`/login?sso_error=${encodeURIComponent(result.error ?? 'Sign-on could not start')}`);
}

/** Admins check their sign-on without creating a session. */
export async function testSso(fd: FormData): Promise<void> {
  const result = await startSso(str(fd, 'orgId'), '/app/settings', 'test');
  redirect(`/app/settings?sso_error=${encodeURIComponent(result.error ?? 'Sign-on could not start')}#sign-on`);
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const method = str(fd, 'method') === 'phone' ? 'phone' : 'email';
  const identifier = normaliseIdentifier(str(fd, method));
  const values = { fullName: str(fd, 'fullName'), [method]: str(fd, method), method };
  if (fd.get('terms') !== 'on') return { error: 'Please accept the terms and privacy policy to create your account.', values };
  const res = await api('POST', '/v1/auth/register', {
    fullName: values.fullName,
    [method]: identifier,
    password: String(fd.get('password') ?? ''),
    consent: { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, aiProcessing: fd.get('aiProcessing') === 'on', marketing: false },
  });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  await setPending(identifier, 'verify');
  redirect(`/verify?next=${encodeURIComponent(safeNext(str(fd, 'next')))}`);
}

export async function verifyCode(_: FormState, fd: FormData): Promise<FormState> {
  const pending = await getPending();
  if (!pending) return { error: 'Your code has expired. Start again from sign in.' };
  const code = str(fd, 'code');
  if (!/^\d{6}$/.test(code)) return { error: 'Enter all six digits of the code.' };
  const path = { verify: '/v1/auth/verify', login: '/v1/auth/login/otp', reset: '' }[pending.purpose];
  if (!path) return { error: 'Something went wrong. Start again from sign in.' };
  const res = await api<SignInResponse>('POST', path, { identifier: pending.identifier, code });
  if (!res.ok) return { error: friendlyError(res.error) };
  await clearPending();
  return completeSignIn(res.data, str(fd, 'next'));
}

/** "Send a new code" on any code screen. */
export async function resendCode(fd?: FormData): Promise<void> {
  const pending = await getPending();
  const channel = fd?.get('channel') === 'whatsapp' ? 'whatsapp' : undefined;
  if (pending) await api('POST', '/v1/auth/otp', { identifier: pending.identifier, purpose: pending.purpose, ...(channel ? { channel } : {}) });
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const identifier = normaliseIdentifier(str(fd, 'identifier'));
  const values = { identifier: str(fd, 'identifier') };
  const res = await api<SignInResponse>('POST', '/v1/auth/login', { identifier, password: String(fd.get('password') ?? '') });
  if (!res.ok) {
    if (res.error.code === 'sso_required') redirect(`/login/sso?organisation=${encodeURIComponent(identifier)}&required=1`);
    if (res.error.code === 'account_unverified') {
      await api('POST', '/v1/auth/otp', { identifier, purpose: 'verify' });
      await setPending(identifier, 'verify');
      redirect(`/verify?next=${encodeURIComponent(safeNext(str(fd, 'next')))}`);
    }
    return { error: friendlyError(res.error), values };
  }
  return completeSignIn(res.data, str(fd, 'next'));
}

/** Start a code-based flow: code sign-in or password reset. Always answers the same way. */
async function requestCode(fd: FormData, purpose: OtpPurpose, then: string): Promise<FormState> {
  const raw = str(fd, 'identifier');
  if (!raw) return { error: 'Enter your email or phone number.' };
  const identifier = normaliseIdentifier(raw);
  const channel = !identifier.includes('@') && fd.get('channel') === 'whatsapp' ? 'whatsapp' : undefined;
  const res = await api('POST', '/v1/auth/otp', { identifier, purpose, ...(channel ? { channel } : {}) });
  if (!res.ok && res.error.code === 'sso_required') redirect(`/login/sso?organisation=${encodeURIComponent(identifier)}&required=1`);
  if (!res.ok && res.status !== 429) return { error: friendlyError(res.error), values: { identifier: raw } };
  await setPending(identifier, purpose);
  redirect(then);
}

export async function requestLoginCode(_: FormState, fd: FormData): Promise<FormState> {
  return requestCode(fd, 'login', `/login/code?next=${encodeURIComponent(safeNext(str(fd, 'next')))}`);
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  return requestCode(fd, 'reset', '/reset-password');
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const pending = await getPending();
  if (!pending || pending.purpose !== 'reset') return { error: 'Your reset session has ended. Ask for a new code.' };
  const newPassword = String(fd.get('password') ?? '');
  if (newPassword !== String(fd.get('confirm') ?? '')) return { error: 'The two passwords don’t match yet.' };
  const res = await api('POST', '/v1/auth/password/reset', { identifier: pending.identifier, code: str(fd, 'code'), newPassword });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error) };
  await clearPending();
  redirect('/login?reset=1');
}

export async function googleSignIn(_: FormState, fd: FormData): Promise<FormState> {
  const idToken = str(fd, 'credential');
  const consent =
    fd.get('terms') === 'on'
      ? { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, aiProcessing: fd.get('aiProcessing') === 'on', marketing: false }
      : undefined;
  const res = await api<SignInResponse>('POST', '/v1/auth/google', { idToken, consent });
  if (!res.ok) {
    if (res.error.code === 'consent_required') return { needsConsent: true, values: { credential: idToken } };
    if (res.error.code === 'sso_required') return { error: `${friendlyError(res.error)} Use “Sign in with your organisation”.` };
    return { error: friendlyError(res.error) };
  }
  return completeSignIn(res.data, str(fd, 'next'));
}

export async function logout(): Promise<void> {
  await api('POST', '/v1/auth/logout', {});
  await clearTokens();
  redirect('/');
}

export async function switchOrg(fd: FormData): Promise<void> {
  const orgId = str(fd, 'orgId') || null;
  const res = await api<TokenResponse>('POST', '/v1/auth/switch-org', { orgId });
  if (res.ok) await saveTokens(res.data);
  redirect(safeNext(str(fd, 'next'), '/app'));
}
