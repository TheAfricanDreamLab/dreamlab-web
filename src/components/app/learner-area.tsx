import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getMe } from '@/lib/me';

/**
 * A learner's own area (learning, programme, journal, applications, credentials). The platform admin
 * account does admin work only, so it goes to the admin console instead.
 */
export async function LearnerArea({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (me.platformAdmin) redirect('/app/admin');
  return <>{children}</>;
}
