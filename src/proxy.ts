import { NextResponse, type NextRequest } from 'next/server';

/*
 * Runs before every page. It keeps the session fresh (rotating the refresh token shortly before the
 * access token expires), sends signed-out visitors away from signed-in pages, and puts signed-in
 * people into the right organisation on an organisation's own site.
 * Kept self-contained: Proxy should not rely on shared modules (cookie names mirror lib/session.ts).
 */

const PREFIX = process.env.SESSION_COOKIE_PREFIX || 'dl';
const COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
const ACCESS_COOKIE = `${PREFIX}_at`;
const REFRESH_COOKIE = `${PREFIX}_rt`;
const INVITE_COOKIE = `${PREFIX}_invite`;
const REFRESH_BEFORE_SECONDS = 60;
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000';
const SITE_DOMAIN = (process.env.SITE_DOMAIN ?? process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'learn.theafricandreamlab.com').split(':')[0]!.toLowerCase();
const RESERVED = new Set(['www', 'api', 'app', 'admin', 'platform', 'static', 'cdn', 'mail', 'docs', 'status', 'staging']);

// /courses and /programs are public; the course player needs an account.
const SIGNED_IN_ONLY = ['/app', '/orgs/new', '/learn', '/admin', '/files'];
/** Signed-in people go straight to their space from these (the landing page included). */
const SIGNED_OUT_ONLY = ['/', '/login', '/signup'];
/** Pages that work in the organisation of the site they're on. */
const ORG_CONTEXT_PAGES = ['/app', '/learn'];
/** Where someone who isn't a member of this site's organisation is told so (never switched from). */
const NO_ACCESS_PATH = '/app/no-access';

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}) };
const under = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

interface Claims {
  exp?: number;
  org?: string | null;
}

function claimsOf(token: string | undefined): Claims {
  if (!token) return {};
  try {
    return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as Claims;
  } catch {
    return {};
  }
}
const expiresAt = (token: string | undefined): number => (claimsOf(token).exp ?? 0) * 1000;

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

function forwardedHeaders(request: NextRequest): Record<string, string> {
  const realIp = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  return {
    'content-type': 'application/json',
    // The gateway takes the organisation from the browser's origin.
    origin: host ? `${proto}://${host}` : request.nextUrl.origin,
    ...(realIp ? { 'x-forwarded-for': realIp } : {}),
    'user-agent': request.headers.get('user-agent') ?? '',
  };
}

async function refresh(request: NextRequest, refreshToken: string): Promise<Tokens | 'superseded' | null> {
  try {
    const res = await fetch(new URL('/v1/auth/refresh', GATEWAY_URL), {
      method: 'POST',
      headers: forwardedHeaders(request),
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return (await res.json()) as Tokens;
    const body = (await res.json().catch(() => null)) as { code?: string } | null;
    // A parallel request already rotated this token; its response carries the new cookies.
    return body?.code === 'refresh_token_superseded' ? 'superseded' : null;
  } catch {
    return 'superseded'; // network trouble: keep the cookies and let the page retry later
  }
}

/** The organisation slug of the site this request is on (<slug>.<SITE_DOMAIN> or <slug>.localhost), if any. */
function tenantSlug(request: NextRequest): string | null {
  const hostname = (request.headers.get('host') ?? '').split(':')[0]!.toLowerCase();
  for (const base of [SITE_DOMAIN, 'localhost']) {
    if (!hostname.endsWith(`.${base}`)) continue;
    const slug = hostname.slice(0, -(base.length + 1));
    return slug && !slug.includes('.') && !RESERVED.has(slug) ? slug : null;
  }
  return null;
}

const tenantIds = new Map<string, { id: string | null; until: number }>();
async function tenantId(request: NextRequest, slug: string): Promise<string | null> {
  const hit = tenantIds.get(slug);
  if (hit && hit.until > Date.now()) return hit.id;
  try {
    const res = await fetch(new URL(`/v1/orgs/resolve/${encodeURIComponent(slug)}`, GATEWAY_URL), {
      headers: forwardedHeaders(request),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const id = res.ok ? ((await res.json()) as { id: string }).id : null;
    // Slugs come from the Host header: keep the cache bounded.
    if (tenantIds.size > 1000) tenantIds.clear();
    tenantIds.set(slug, { id, until: Date.now() + (id ? 5 * 60_000 : 30_000) });
    return id;
  } catch {
    // Gateway unreachable: don't retry on every request for a few seconds.
    tenantIds.set(slug, { id: null, until: Date.now() + 5_000 });
    return null;
  }
}

/**
 * On an organisation's site, a signed-in person works in that organisation: switch the session
 * into it. Returns new tokens, 'not-member', or null (nothing to do, or the API is unreachable).
 */
async function contextForSite(request: NextRequest, access: string, orgId: string): Promise<Tokens | 'not-member' | null> {
  if (claimsOf(access).org === orgId) return null;
  try {
    const res = await fetch(new URL('/v1/auth/switch-org', GATEWAY_URL), {
      method: 'POST',
      headers: { ...forwardedHeaders(request), authorization: `Bearer ${access}` },
      body: JSON.stringify({ orgId }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return (await res.json()) as Tokens;
    return res.status === 403 ? 'not-member' : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Invitation emails link to /invitations/accept?token=…: move the secret into an httpOnly cookie
  // and drop it from the URL, so it never sits in history or reaches analytics.
  const inviteToken = request.nextUrl.searchParams.get('token');
  if (path === '/invitations/accept' && inviteToken) {
    const res = NextResponse.redirect(new URL('/invitations/accept', request.url));
    res.cookies.set(INVITE_COOKIE, inviteToken, { ...cookieBase, maxAge: 60 * 60 });
    return res;
  }
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let signedIn = expiresAt(access) > Date.now();

  let renewed: Tokens | null = null;
  let cleared = false;
  if (refreshToken && expiresAt(access) - REFRESH_BEFORE_SECONDS * 1000 < Date.now()) {
    const result = await refresh(request, refreshToken);
    if (result === null) {
      cleared = true;
      signedIn = false;
    } else if (result !== 'superseded') {
      renewed = result;
      access = result.accessToken;
      signedIn = true;
    }
  }

  // On an organisation's site, signed-in pages run in that organisation.
  let notMember = false;
  const slug = signedIn && access && under(path, ORG_CONTEXT_PAGES) && path !== NO_ACCESS_PATH ? tenantSlug(request) : null;
  if (slug) {
    const orgId = await tenantId(request, slug);
    const switched = orgId ? await contextForSite(request, access!, orgId) : null;
    if (switched === 'not-member') notMember = true;
    else if (switched) {
      renewed = switched;
      access = switched.accessToken;
    }
  }

  let response: NextResponse;
  if (notMember) {
    const to = new URL(NO_ACCESS_PATH, request.url);
    to.searchParams.set('org', slug!);
    response = NextResponse.redirect(to);
  } else if (!signedIn && path === '/orgs/new') {
    // Bringing an organisation starts with your own account: explain that instead of a bare sign-in page.
    const start = new URL('/orgs/start', request.url);
    const kind = request.nextUrl.searchParams.get('kind');
    if (kind) start.searchParams.set('kind', kind);
    response = NextResponse.redirect(start);
  } else if (!signedIn && (path === '/admin' || path === '/app/admin' || path.startsWith('/app/admin/'))) {
    // The admin console has its own sign-in page.
    const login = new URL('/admin/login', request.url);
    if (path !== '/admin') login.searchParams.set('next', path + request.nextUrl.search);
    response = NextResponse.redirect(login);
  } else if (signedIn && path === '/admin/login') {
    // Already signed in: the console decides (it sends anyone who isn't a platform admin to /app).
    response = NextResponse.redirect(new URL('/app/admin', request.url));
  } else if (!signedIn && path !== '/admin/login' && under(path, SIGNED_IN_ONLY)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', path + request.nextUrl.search);
    response = NextResponse.redirect(login);
  } else if (signedIn && SIGNED_OUT_ONLY.includes(path)) {
    response = NextResponse.redirect(new URL('/app', request.url));
  } else if (renewed) {
    // Hand the new token to this render too, not just to the browser.
    request.cookies.set(ACCESS_COOKIE, renewed.accessToken);
    request.cookies.set(REFRESH_COOKIE, renewed.refreshToken);
    response = NextResponse.next({ request: { headers: request.headers } });
  } else {
    response = NextResponse.next();
  }

  // Signed-in pages are never stored: after signing out, Back can't show them again.
  if (under(path, SIGNED_IN_ONLY) || path.startsWith('/invitations') || path === '/admin/login') {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }
  if (renewed) {
    response.cookies.set(ACCESS_COOKIE, renewed.accessToken, { ...cookieBase, maxAge: renewed.expiresIn });
    response.cookies.set(REFRESH_COOKIE, renewed.refreshToken, { ...cookieBase, maxAge: renewed.refreshExpiresIn });
  } else if (cleared) {
    response.cookies.set(ACCESS_COOKIE, '', { ...cookieBase, maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE, '', { ...cookieBase, maxAge: 0 });
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|media/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)'],
};
