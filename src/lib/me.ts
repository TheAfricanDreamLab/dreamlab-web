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
  if (!res.ok) redirect('/login');
  return res.data;
});

export function activeMembership(me: Me) {
  return me.memberships.find((m) => m.membershipId === me.context.membershipId) ?? null;
}

export const can = (me: Me, permission: string) => me.platformAdmin || me.permissions.includes(permission as never);
