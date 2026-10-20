import { NextResponse, type NextRequest } from 'next/server';

/*
 * Runs before every page. It keeps the session fresh (rotating the refresh token shortly before the
 * access token expires) and sends signed-out visitors away from signed-in pages.
 * Kept self-contained: Proxy should not rely on shared modules.
 */

const ACCESS_COOKIE = 'dl_at';
const REFRESH_COOKIE = 'dl_rt';
const REFRESH_BEFORE_SECONDS = 60;
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000';

// /courses and /programs are public; the course player needs an account.
const SIGNED_IN_ONLY = ['/app', '/orgs/new', '/learn', '/admin'];
const SIGNED_OUT_ONLY = ['/login', '/signup'];

function expiresAt(token: string | undefined): number {
  if (!token) return 0;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: number };
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

interface Refreshed {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

async function refresh(request: NextRequest, refreshToken: string): Promise<Refreshed | 'superseded' | null> {
  const realIp = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  try {
    const res = await fetch(new URL('/v1/auth/refresh', GATEWAY_URL), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: request.nextUrl.origin,
        ...(realIp ? { 'x-forwarded-for': realIp } : {}),
        'user-agent': request.headers.get('user-agent') ?? '',
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return (await res.json()) as Refreshed;
    const body = (await res.json().catch(() => null)) as { code?: string } | null;
    // A parallel request already rotated this token; its response carries the new cookies.
    return body?.code === 'refresh_token_superseded' ? 'superseded' : null;
  } catch {
    return 'superseded'; // network trouble: keep the cookies and let the page retry later
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Invitation emails link to /invitations/accept?token=…: move the secret into an httpOnly cookie
  // and drop it from the URL, so it never sits in history or reaches analytics.
  const inviteToken = request.nextUrl.searchParams.get('token');
  if (path === '/invitations/accept' && inviteToken) {
    const clean = new URL('/invitations/accept', request.url);
    const res = NextResponse.redirect(clean);
    res.cookies.set('dl_invite', inviteToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });
    return res;
  }
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let signedIn = expiresAt(access) > Date.now();

  let renewed: Refreshed | null = null;
  let cleared = false;
  if (refreshToken && expiresAt(access) - REFRESH_BEFORE_SECONDS * 1000 < Date.now()) {
    const result = await refresh(request, refreshToken);
    if (result === null) {
      cleared = true;
      signedIn = false;
    } else if (result !== 'superseded') {
      renewed = result;
      signedIn = true;
    }
  }

  let response: NextResponse;
  if (!signedIn && path === '/orgs/new') {
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
  } else if (!signedIn && path !== '/admin/login' && SIGNED_IN_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
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

  const secure = process.env.NODE_ENV === 'production';
  if (renewed) {
    response.cookies.set(ACCESS_COOKIE, renewed.accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: renewed.expiresIn });
    response.cookies.set(REFRESH_COOKIE, renewed.refreshToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: renewed.refreshExpiresIn });
  } else if (cleared) {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)'],
};
