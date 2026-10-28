import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

/*
 * Opens a learner's attached file (MEDIA-1). The API checks the person may see it (its owner, or
 * faculty who may grade the work) and returns a link that works for a few minutes.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!isUuid(fileId)) return new NextResponse('Not found', { status: 404 });
  const res = await api<{ url: string }>('GET', `/v1/learning/files/${fileId}`);
  if (!res.ok) {
    if (res.status === 401) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/files/${fileId}`)}`, request.url));
    return new NextResponse(res.status === 404 ? 'This file was not found, or you can’t open it.' : 'We could not open this file. Try again shortly.', { status: res.status === 404 ? 404 : 502 });
  }
  return NextResponse.redirect(res.data.url, { headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}
