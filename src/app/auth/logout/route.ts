import type { NextRequest } from 'next/server';
import { safeNext } from '@/lib/forms';
import { callGateway, incomingRequest } from '@/lib/gateway';
import { clearTokens, getAccessToken } from '@/lib/session';

/*
 * Redirects here use a relative Location: behind the edge proxy the server only knows its internal
 * address (e.g. 0.0.0.0:4100), so an absolute URL built from request.url would send people there.
 */
const goTo = (path: string) => new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } });

/**
 * Sign out: end the session at the API, then remove the session cookies everywhere they live (the
 * platform site and every organisation's site share them). A plain form POST, not a Server Action,
 * so the browser does a full page load afterwards and keeps no signed-in page in memory.
 * An invitation waiting in this browser is kept, so "sign out and continue as the invited person" works.
 */
export async function POST(request: NextRequest) {
  // Only our own pages (this site, organisation sites, the static site) may sign people out; another
  // site's form could otherwise sign someone out and land them on a page of its choosing.
  if (!fromOurSite(request)) return goTo('/app');
  const token = await getAccessToken();
  if (token) await callGateway('POST', '/v1/auth/logout', { body: {}, token, request: await incomingRequest() }).catch(() => undefined);
  await clearTokens();
  const form = await request.formData().catch(() => null);
  const next = form?.get('next');
  return goTo(safeNext(typeof next === 'string' ? next : null, '/'));
}

/**
 * Fetch metadata when the browser sends it; otherwise the Origin, which must be this host or one of
 * the sites sharing the session (SESSION_COOKIE_DOMAIN and its subdomains). Neither: refused.
 */
function fromOurSite(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'same-site' || site === 'none';
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    const shared = process.env.SESSION_COOKIE_DOMAIN;
    return host === request.nextUrl.hostname || (!!shared && (host === shared || host.endsWith(`.${shared}`)));
  } catch {
    return false;
  }
}

/** A link can't sign anyone out (a page could embed it); go to your space instead. */
export function GET() {
  return goTo('/app');
}
