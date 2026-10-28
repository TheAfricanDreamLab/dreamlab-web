/*
 * Uploaded course media (MEDIA-1), served from this site's own address so pages need no extra
 * hosts in their content security policy. Files come from the public storage container; only
 * course images and videos are served, typed by their extension (never by what the uploader
 * claimed), in a sandbox, so an uploaded file can never act as a page of this site.
 */
export const dynamic = 'force-dynamic';

const ORIGIN = (process.env.MEDIA_ORIGIN_URL ?? '').replace(/\/+$/, '');
const PATH = /^courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };
const PASS_THROUGH = ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  const type = TYPES[path.split('.').pop()?.toLowerCase() ?? ''];
  if (!ORIGIN || !PATH.test(path) || !type) return new Response('Not found', { status: 404 });

  const range = request.headers.get('range');
  const upstream = await fetch(`${ORIGIN}/${path}`, {
    headers: range ? { range } : {},
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  }).catch(() => null);
  if (!upstream || (upstream.status !== 200 && upstream.status !== 206)) {
    return new Response(upstream?.status === 404 ? 'Not found' : 'Unavailable', { status: upstream?.status === 404 ? 404 : 502 });
  }
  const headers = new Headers({
    'content-type': type,
    // Paths are unique per upload, so a file never changes.
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
    'cross-origin-resource-policy': 'same-origin',
  });
  for (const h of PASS_THROUGH) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
