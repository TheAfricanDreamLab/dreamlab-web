import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/forms';
import { callGateway, incomingRequest } from '@/lib/gateway';
import { clearTokens, getAccessToken } from '@/lib/session';

/**
 * Sign out: end the session at the API, then remove the session cookies everywhere they live (the
 * platform site and every organisation's site share them). A plain form POST, not a Server Action,
 * so the browser does a full page load afterwards and keeps no signed-in page in memory.
 * An invitation waiting in this browser is kept, so "sign out and continue as the invited person" works.
 */
export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (token) await callGateway('POST', '/v1/auth/logout', { body: {}, token, request: await incomingRequest() }).catch(() => undefined);
  await clearTokens();
  const form = await request.formData().catch(() => null);
  const next = safeNext(typeof form?.get('next') === 'string' ? (form.get('next') as string) : null, '/');
  return NextResponse.redirect(new URL(next, request.url), { status: 303, headers: { 'Cache-Control': 'no-store' } });
}

/** A link can't sign anyone out (a page could embed it); show the way to the real button instead. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/app', request.url), 303);
}
