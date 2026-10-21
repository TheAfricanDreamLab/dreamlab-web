import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getMe } from '@/lib/me';

/* The console's sections live in the sidebar's "Platform admin" group (app/app/layout.tsx). */
export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (!me.platformAdmin) redirect('/app');
  return <>{children}</>;
}
