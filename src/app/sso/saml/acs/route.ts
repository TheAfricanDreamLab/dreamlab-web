import { NextResponse, type NextRequest } from 'next/server';
import { api } from '@/lib/gateway';
import { here } from '@/lib/sso';

/**
 * SAML Assertion Consumer Service (HTTP-POST binding). The identity provider's page posts here
 * cross-site, so this browser's cookies may not come along. The API validates the response and
 * holds the result; the browser then finishes with a same-site GET that does carry the cookie.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const samlResponse = String(form.get('SAMLResponse') ?? '');
  const relayState = String(form.get('RelayState') ?? '');
  if (!samlResponse || !relayState) return NextResponse.redirect(here(request, '/login/sso?error=Sign-on%20did%20not%20complete'), 303);
  const res = await api<{ state: string }>('POST', '/v1/auth/sso/saml/acs', { samlResponse, relayState });
  if (!res.ok) return NextResponse.redirect(here(request, `/sso/finish?failed=${encodeURIComponent(res.error.code ?? 'sso_failed')}`), 303);
  return NextResponse.redirect(here(request, `/sso/finish?state=${encodeURIComponent(res.data.state)}`), 303);
}
