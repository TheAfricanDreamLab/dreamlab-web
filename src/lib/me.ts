import 'server-only';
import type { MeSchema } from '@dreamlab/contracts';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { z } from 'zod';
import { api } from './gateway';

export type Me = z.infer<typeof MeSchema>;

/** The signed-in user, once per request. Sends signed-out visitors to sign in. */
export const getMe = cache(async (): Promise<Me> => {
  const res = await api<Me>('GET', '/v1/me');
  // The session ended elsewhere (signed out everywhere, suspended): clear it, then sign in.
  if (!res.ok && res.status === 401) redirect('/auth/expired');
  // Anything else (the API busy or unreachable) is not a reason to sign in again: with the session
  // cookie still valid, sign-in sends people straight back here, a redirect loop. Show the error page.
  if (!res.ok) throw new Error(`Could not load the signed-in user (${res.status})`);
  return res.data;
});

export function activeMembership(me: Me) {
  return me.memberships.find((m) => m.membershipId === me.context.membershipId) ?? null;
}

export const can = (me: Me, permission: string) => me.platformAdmin || me.permissions.includes(permission as never);
