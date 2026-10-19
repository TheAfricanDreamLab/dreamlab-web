import 'server-only';
import type { TokenResponse } from '@dreamlab/contracts';
import { cookies } from 'next/headers';

/**
 * Tokens never reach browser JavaScript: they live in httpOnly cookies set by Server Actions,
 * and every API call is made by the Next.js server on the user's behalf.
 */
export const ACCESS_COOKIE = 'dl_at';
export const REFRESH_COOKIE = 'dl_rt';
/** Identifier waiting for an OTP (sign-up verification, code sign-in, reset). */
export const PENDING_COOKIE = 'dl_pending';
/** Invitation token kept across sign-in / sign-up so the invitation can be accepted afterwards. */
export const INVITE_COOKIE = 'dl_invite';
/** A password or code passed; the account has an authenticator app, so this waits for its code. */
export const MFA_COOKIE = 'dl_mfa';
/** Single sign-on in progress: compared when the identity provider sends the browser back. */
export const SSO_COOKIE = 'dl_sso';

const secure = process.env.NODE_ENV === 'production';
const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };

export interface AccessClaims {
  sub: string;
  sid: string;
  org: string | null;
  mid: string | null;
  roles: string[];
  pla: boolean;
  exp: number;
  /** pwd, otp, google, sso; plus mfa once a second factor passed. */
  amr?: string[];
  /** Admin actions here need a session that passed MFA. */
  mfr?: boolean;
}

/** Read the access token's claims for display and routing. The API verifies the signature. */
export function decodeClaims(token: string | undefined): AccessClaims | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AccessClaims;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getClaims(): Promise<AccessClaims | null> {
  const claims = decodeClaims(await getAccessToken());
  return claims && claims.exp * 1000 > Date.now() ? claims : null;
}

/** Store a fresh token pair. Server Actions and Route Handlers only. */
export async function saveTokens(tokens: TokenResponse): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: tokens.expiresIn });
  jar.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: tokens.refreshExpiresIn });
}

export async function clearTokens(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function setPending(identifier: string, purpose: 'verify' | 'login' | 'reset'): Promise<void> {
  (await cookies()).set(PENDING_COOKIE, JSON.stringify({ identifier, purpose }), { ...base, maxAge: 30 * 60 });
}

export async function getPending(): Promise<{ identifier: string; purpose: 'verify' | 'login' | 'reset' } | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { identifier: string; purpose: 'verify' | 'login' | 'reset' };
  } catch {
    return null;
  }
}

export async function clearPending(): Promise<void> {
  (await cookies()).delete(PENDING_COOKIE);
}

export async function setInvite(token: string): Promise<void> {
  (await cookies()).set(INVITE_COOKIE, token, { ...base, maxAge: 60 * 60 });
}

export async function getInvite(): Promise<string | null> {
  return (await cookies()).get(INVITE_COOKIE)?.value ?? null;
}

export async function clearInvite(): Promise<void> {
  (await cookies()).delete(INVITE_COOKIE);
}

export async function setMfaChallenge(mfaToken: string, expiresIn: number): Promise<void> {
  (await cookies()).set(MFA_COOKIE, mfaToken, { ...base, maxAge: expiresIn });
}

export async function getMfaChallenge(): Promise<string | null> {
  return (await cookies()).get(MFA_COOKIE)?.value ?? null;
}

export async function clearMfaChallenge(): Promise<void> {
  (await cookies()).delete(MFA_COOKIE);
}

/**
 * The sign-on state, bound to this browser. SameSite=Lax is enough: the identity provider sends
 * the browser back with a top-level GET (OIDC), or, for SAML's cross-site POST, we finish with a GET.
 */
export async function setSsoState(state: string, expiresIn: number, mode: 'signin' | 'test'): Promise<void> {
  (await cookies()).set(SSO_COOKIE, JSON.stringify({ state, mode }), { ...base, maxAge: expiresIn });
}

export async function takeSsoState(): Promise<{ state: string; mode: 'signin' | 'test' } | null> {
  const jar = await cookies();
  const raw = jar.get(SSO_COOKIE)?.value;
  jar.delete(SSO_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { state: string; mode: 'signin' | 'test' };
  } catch {
    return null;
  }
}

export const cookieOptions = base;
