import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/forms';
import { AuthShell } from '@/components/auth/shells';
import { Notice } from '@/components/ui/primitives';
import { safeNext } from '@/lib/forms';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const banner = sp.reset ? (
    <Notice tone="success">Your password is changed. Sign in with the new one.</Notice>
  ) : sp.signedout ? (
    <Notice tone="success">You’ve been signed out on every device.</Notice>
  ) : undefined;
  return (
    <AuthShell eyebrow="Welcome back" title="Sign in" intro="Pick up where you left off.">
      <LoginForm next={next} banner={banner} />
    </AuthShell>
  );
}
