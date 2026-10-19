import type { SsoResult } from '@dreamlab/contracts';
import type { NextRequest } from 'next/server';
import { safeEqual } from '@/lib/crypto';
import { api } from '@/lib/gateway';
import { takeSsoState } from '@/lib/session';
import { finishSignOn, signOnExpired } from '@/lib/sso';

/** Second half of SAML sign-on: same-site, so the state cookie proves this browser started it. */
export async function GET(request: NextRequest) {
  const pending = await takeSsoState();
  const failed = request.nextUrl.searchParams.get('failed');
  if (failed) {
    return finishSignOn(
      request,
      { ok: false, status: 401, error: { statusCode: 401, error: 'Unauthorized', message: 'Sign-on failed.', code: failed } },
      pending?.mode ?? 'signin',
    );
  }
  const state = request.nextUrl.searchParams.get('state') ?? '';
  if (!pending || !safeEqual(pending.state, state)) return signOnExpired(request, pending?.mode ?? null);
  const res = await api<SsoResult>('POST', '/v1/auth/sso/finish', { state });
  return finishSignOn(request, res, pending.mode);
}
