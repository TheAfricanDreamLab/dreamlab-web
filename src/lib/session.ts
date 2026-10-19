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

export const cookieOptions = base;
