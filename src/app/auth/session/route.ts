import type { MeSchema } from '@dreamlab/contracts';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { api } from '@/lib/gateway';
import { getClaims } from '@/lib/session';

/**
 * Whether this browser is signed in, for the public site's static pages (same hostname), so they
 * show "My space" and "Sign out" instead of "Sign in". No personal data beyond a first name.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
  if (!(await getClaims())) return NextResponse.json({ signedIn: false }, { headers });
  const me = await api<z.infer<typeof MeSchema>>('GET', '/v1/me');
  if (!me.ok) return NextResponse.json({ signedIn: false }, { headers });
  const name = me.data.user.fullName.trim();
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return NextResponse.json({ signedIn: true, firstName: name.split(/\s+/)[0] ?? '', initials }, { headers });
}
