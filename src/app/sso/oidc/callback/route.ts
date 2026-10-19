import type { SsoResult } from '@dreamlab/contracts';
import type { NextRequest } from 'next/server';
import { safeEqual } from '@/lib/crypto';
import { api } from '@/lib/gateway';
import { takeSsoState } from '@/lib/session';
import { finishSignOn, signOnExpired } from '@/lib/sso';

/** The identity provider sends the browser back here with ?code&state (OIDC authorization code flow). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pending = await takeSsoState();
  const state = params.get('state') ?? '';
  // The state must be the one this browser started with, or someone else's sign-on is being replayed here.
  if (!pending || !safeEqual(pending.state, state)) return signOnExpired(request, pending?.mode ?? null);
  const error = params.get('error');
  const code = params.get('code');
  if (error || !code) {
    return finishSignOn(
      request,
      { ok: false, status: 400, error: { statusCode: 400, error: 'Bad Request', message: params.get('error_description') ?? 'Sign-on was cancelled.', code: 'sso_failed' } },
      pending.mode,
    );
  }
  const res = await api<SsoResult>('POST', '/v1/auth/sso/oidc/callback', { state, code });
  return finishSignOn(request, res, pending.mode);
}
