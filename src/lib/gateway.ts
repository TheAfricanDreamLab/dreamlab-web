import 'server-only';
import type { ErrorResponse } from '@dreamlab/contracts';
import { headers } from 'next/headers';
import { getAccessToken } from './session';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000';

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: ErrorResponse };

export interface ForwardedRequest {
  /** Host the browser used, e.g. dreamlab.theafricandreamlab.com: tells the gateway which tenant. */
  host: string | null;
  proto: string;
  /** The browser's IP, so per-user rate limits stay per user. */
  clientIp: string | null;
  userAgent: string | null;
}

/** Details of the incoming browser request (Server Components, Server Actions, Route Handlers). */
export async function incomingRequest(): Promise<ForwardedRequest> {
  const h = await headers();
  // The left-most X-Forwarded-For entry is whatever the browser claims; the edge proxy (Traefik)
  // sets X-Real-IP from the connection and appends the true address last.
  const forwarded = h.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    host: h.get('host'),
    proto: h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http'),
    clientIp: h.get('x-real-ip') ?? forwarded?.at(-1) ?? null,
    userAgent: h.get('user-agent'),
  };
}

/** Call the Dream Lab API through the gateway, server-side. */
export async function callGateway<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: unknown; token?: string | null; request: ForwardedRequest },
): Promise<ApiResult<T>> {
  const { request } = options;
  // Paths carry ids from the URL. A crafted id with dot segments or encoded slashes could turn a call
  // into a different endpoint (still with the user's token), so such paths are never sent.
  // Control characters too: URL parsing drops tabs and newlines before it resolves dot segments.
  if (/[\u0000-\u001f\u007f]|(^|\/)(\.|%2e){1,2}(\/|$|\?)|%2f|%5c|\\/i.test(path.split('?')[0]!)) {
    return { ok: false, status: 400, error: { statusCode: 400, error: 'Bad Request', message: 'That link isn’t right.', code: 'bad_path' } };
  }
  const headersOut: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headersOut['content-type'] = 'application/json';
  if (options.token) headersOut.authorization = `Bearer ${options.token}`;
  // The gateway derives the tenant from Origin when the API is on its own host.
  if (request.host) headersOut.origin = `${request.proto}://${request.host}`;
  if (request.clientIp) headersOut['x-forwarded-for'] = request.clientIp;
  if (request.userAgent) headersOut['user-agent'] = request.userAgent;

  let res: Response;
  try {
    res = await fetch(new URL(path, GATEWAY_URL), {
      method,
      headers: headersOut,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return {
      ok: false,
      status: 503,
      error: { statusCode: 503, error: 'Service Unavailable', message: 'We could not reach Dream Lab. Check your connection and try again.', code: 'network' },
    };
  }
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (res.ok) return { ok: true, status: res.status, data: json as T };
  return { ok: false, status: res.status, error: (json as ErrorResponse) ?? { statusCode: res.status, error: res.statusText, message: res.statusText } };
}

/** Same as callGateway, with the signed-in user's token and the current request. */
export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<ApiResult<T>> {
  return callGateway<T>(method, path, { body, token: await getAccessToken(), request: await incomingRequest() });
}
