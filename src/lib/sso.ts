import 'server-only';
import type { SsoResult } from '@dreamlab/contracts';
import { NextResponse } from 'next/server';
import { safeNext } from './forms';
import type { ApiResult } from './gateway';
import { getInvite, saveTokens } from './session';

/** Where a page lives on this site, for redirects from Route Handlers (which need absolute URLs). */
export function here(request: Request, path: string): URL {
  return new URL(path, request.url);
}

/** Turn the API's sign-on result into cookies and a redirect. */
export async function finishSignOn(request: Request, res: ApiResult<SsoResult>, mode: 'signin' | 'test'): Promise<NextResponse> {
  if (!res.ok) return failed(request, res.error.code ?? 'sso_failed', mode);
  if (res.data.kind === 'test') {
    return NextResponse.redirect(here(request, '/app/settings?sso_tested=1#sign-on'), 303);
  }
  await saveTokens(res.data.tokens);
  // A pending invitation still wins, as with every other way of signing in.
  const next = (await getInvite()) ? '/invitations/accept' : safeNext(res.data.returnTo);
  return NextResponse.redirect(here(request, next), 303);
}

export function signOnExpired(request: Request, mode: 'signin' | 'test' | null): NextResponse {
  return failed(request, 'sso_state_invalid', mode);
}

/** Back to where the sign-on started, with an error code (pages map it to our own wording). */
function failed(request: Request, code: string, mode: 'signin' | 'test' | null): NextResponse {
  const safe = encodeURIComponent(code.replace(/[^a-z_]/g, '').slice(0, 64) || 'sso_failed');
  const to = mode === 'test' ? `/app/settings?sso_error=${safe}#sign-on` : `/login/sso?error=${safe}`;
  return NextResponse.redirect(here(request, to), 303);
}
