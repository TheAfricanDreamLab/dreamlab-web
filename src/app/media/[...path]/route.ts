/*
 * Uploaded course media (MEDIA-1), served from this site's own address so pages need no extra
 * hosts in their content security policy. Files come from the public storage container, typed by
 * their extension (never by what the uploader claimed), in a sandbox, so an uploaded file can never
 * act as a page of this site:
 *   - courses/<org>/<upload>/<file>: course photos, videos uploaded before the library, and files
 *     learners download (always as an attachment);
 *   - videos/<id>/…: the video library's streams, posters and captions (CAT-6).
 */
export const dynamic = 'force-dynamic';

const ORIGIN = (process.env.MEDIA_ORIGIN_URL ?? '').replace(/\/+$/, '');
const COURSE_FILE = /^courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
/** manifest.json · captions/<lang>.vtt · v<n>/master.m3u8 · v<n>/<h>p/index.m3u8 · v<n>/<h>p/seg_0001.ts · v<n>/poster.jpg */
const LIBRARY_FILE = /^videos\/[0-9a-f-]{36}\/(manifest\.json|captions\/[a-z]{2,3}(-[A-Z]{2})?\.vtt|v\d{1,4}\/(master\.m3u8|poster\.jpg|thumb\.jpg|\d{3,4}p\/(index\.m3u8|seg_\d{4,6}\.ts)))$/;

const INLINE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  m3u8: 'application/vnd.apple.mpegurl',
  ts: 'video/mp2t',
  vtt: 'text/vtt; charset=utf-8',
  json: 'application/json',
};
/** Files learners download from a lesson: never shown in the browser, always saved. */
const DOWNLOAD: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  ppt: 'application/vnd.ms-powerpoint',
  xls: 'application/vnd.ms-excel',
  zip: 'application/zip',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  mp3: 'audio/mpeg',
};
const PASS_THROUGH = ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const library = LIBRARY_FILE.test(path);
  const course = COURSE_FILE.test(path);
  const type = library || course ? (INLINE[ext] ?? (course ? DOWNLOAD[ext] : undefined)) : undefined;
  if (!ORIGIN || !type) return new Response('Not found', { status: 404 });
  const download = course && !!DOWNLOAD[ext];

  const range = request.headers.get('range');
  // The timeout covers waiting for storage to answer, not streaming the file: a long video keeps playing.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const upstream = await fetch(`${ORIGIN}/${path}`, { headers: range ? { range } : {}, signal: controller.signal, cache: 'no-store' })
    .catch(() => null)
    .finally(() => clearTimeout(timer));
  if (!upstream || (upstream.status !== 200 && upstream.status !== 206)) {
    return new Response(upstream?.status === 404 ? 'Not found' : 'Unavailable', { status: upstream?.status === 404 ? 404 : 502 });
  }
  // Uploads and stream versions never change; a library video's manifest and captions are edited in place.
  const changing = library && (ext === 'json' || ext === 'vtt');
  const headers = new Headers({
    'content-type': type,
    'cache-control': changing ? 'public, max-age=30' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
    'cross-origin-resource-policy': 'same-origin',
  });
  if (download) headers.set('content-disposition', `attachment; filename="${path.split('/').pop()}"`);
  for (const h of PASS_THROUGH) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
