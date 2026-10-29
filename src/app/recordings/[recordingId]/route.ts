import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

/*
 * Opens a class recording (LIVE-1). The API checks the person is in the cohort (a learner or its
 * staff) and returns a link that works for a few minutes.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ recordingId: string }> }) {
  const { recordingId } = await params;
  if (!isUuid(recordingId)) return new NextResponse('Not found', { status: 404 });
  const res = await api<{ url: string }>('GET', `/v1/learning/recordings/${recordingId}`);
  if (!res.ok) {
    if (res.status === 401) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/recordings/${recordingId}`)}`, request.url));
    return new NextResponse(res.status === 404 ? 'This recording was not found, is still uploading, or you can’t open it.' : 'We could not open this recording. Try again shortly.', {
      status: res.status === 404 ? 404 : 502,
    });
  }
  return NextResponse.redirect(res.data.url, { headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}
