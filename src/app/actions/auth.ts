'use server';

import type { OtpPurpose, TokenResponse } from '@dreamlab/contracts';
import { redirect } from 'next/navigation';
import { friendlyError, fieldErrors } from '@/lib/errors';
import { FormState, normaliseIdentifier, PRIVACY_VERSION, safeNext, str, TERMS_VERSION } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { clearPending, clearTokens, getInvite, getPending, saveTokens, setPending } from '@/lib/session';

/** Where to go after signing in: a pending invitation wins, then ?next, then the app. */
async function afterSignIn(next: string | null): Promise<never> {
  // The invitation token waits in an httpOnly cookie; the invitation page picks it up from there.
  if (await getInvite()) redirect('/invitations/accept');
  redirect(safeNext(next));
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
  const res = await api<TokenResponse>('POST', path, { identifier: pending.identifier, code });
  if (!res.ok) return { error: friendlyError(res.error) };
  await saveTokens(res.data);
  await clearPending();
  return afterSignIn(str(fd, 'next'));
}

/** "Send a new code" on any code screen. */
export async function resendCode(): Promise<void> {
  const pending = await getPending();
  if (pending) await api('POST', '/v1/auth/otp', { identifier: pending.identifier, purpose: pending.purpose });
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const identifier = normaliseIdentifier(str(fd, 'identifier'));
  const values = { identifier: str(fd, 'identifier') };
  const res = await api<TokenResponse>('POST', '/v1/auth/login', { identifier, password: String(fd.get('password') ?? '') });
  if (!res.ok) {
    if (res.error.code === 'account_unverified') {
      await api('POST', '/v1/auth/otp', { identifier, purpose: 'verify' });
      await setPending(identifier, 'verify');
      redirect(`/verify?next=${encodeURIComponent(safeNext(str(fd, 'next')))}`);
    }
    return { error: friendlyError(res.error), values };
  }
  await saveTokens(res.data);
  return afterSignIn(str(fd, 'next'));
}

/** Start a code-based flow: code sign-in or password reset. Always answers the same way. */
async function requestCode(fd: FormData, purpose: OtpPurpose, then: string): Promise<FormState> {
  const raw = str(fd, 'identifier');
  if (!raw) return { error: 'Enter your email or phone number.' };
  const identifier = normaliseIdentifier(raw);
  const res = await api('POST', '/v1/auth/otp', { identifier, purpose });
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
  const res = await api<TokenResponse>('POST', '/v1/auth/google', { idToken, consent });
  if (!res.ok) {
    if (res.error.code === 'consent_required') return { needsConsent: true, values: { credential: idToken } };
    return { error: friendlyError(res.error) };
  }
  await saveTokens(res.data);
  return afterSignIn(str(fd, 'next'));
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
