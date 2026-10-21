import { callGateway, incomingRequest } from '@/lib/gateway';
import { clearTokens, getAccessToken } from '@/lib/session';

const goTo = (path: string) => new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } });

/**
 * A page found the session ended at the API (signed out everywhere, suspended). Clear this
 * browser's copy and go to sign-in; otherwise sign-in would see the cookie and send people back.
 * Only a session the API rejects is cleared, so a link here can't sign anyone out.
 */
export async function GET() {
  const token = await getAccessToken();
  if (token) {
    const me = await callGateway('GET', '/v1/me', { token, request: await incomingRequest() });
    if (me.ok) return goTo('/app');
  }
  await clearTokens();
  return goTo('/login?expired=1');
}
