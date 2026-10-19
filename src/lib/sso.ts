import 'server-only';
import type { SsoResult } from '@dreamlab/contracts';
import { NextResponse } from 'next/server';
import { friendlyError } from './errors';
import { safeNext } from './forms';
import type { ApiResult } from './gateway';
import { getInvite, saveTokens } from './session';

/** Where a page lives on this site, for redirects from Route Handlers (which need absolute URLs). */
export function here(request: Request, path: string): URL {
  return new URL(path, request.url);
}

/** Turn the API's sign-on result into cookies and a redirect. */
export async function finishSignOn(request: Request, res: ApiResult<SsoResult>, mode: 'signin' | 'test'): Promise<NextResponse> {
  if (!res.ok) {
    const message = friendlyError(res.error);
    const to = mode === 'test' ? `/app/settings?sso_error=${encodeURIComponent(message)}#sign-on` : `/login/sso?error=${encodeURIComponent(message)}`;
    return NextResponse.redirect(here(request, to), 303);
  }
  if (res.data.kind === 'test') {
    return NextResponse.redirect(here(request, `/app/settings?sso_tested=${encodeURIComponent(res.data.email)}#sign-on`), 303);
  }
  await saveTokens(res.data.tokens);
  // A pending invitation still wins, as with every other way of signing in.
  const next = (await getInvite()) ? '/invitations/accept' : safeNext(res.data.returnTo);
  return NextResponse.redirect(here(request, next), 303);
}

export function signOnExpired(request: Request, mode: 'signin' | 'test' | null): NextResponse {
  const message = 'That sign-on took too long, or it started in another browser. Please start again.';
  const to = mode === 'test' ? `/app/settings?sso_error=${encodeURIComponent(message)}#sign-on` : `/login/sso?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(here(request, to), 303);
}
