import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/auth/forms';
import { AuthShell } from '@/components/auth/shells';
import { safeNext } from '@/lib/forms';
import { FlashToast } from '@/components/ui/toast';

export const metadata: Metadata = { title: 'Admin sign-in', robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, '/app/admin');
  const banner = sp.signedout ? <FlashToast clear={['signedout']}>You’ve been signed out.</FlashToast> : undefined;
  return (
    <AuthShell eyebrow="Platform admin" title="Admin sign-in" intro="For the people who run The African Dream Lab platform.">
      <AdminLoginForm next={next.startsWith('/app/admin') ? next : '/app/admin'} banner={banner} />
    </AuthShell>
  );
}
