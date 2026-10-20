import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CenteredCard } from '@/components/auth/shells';
import { MfaForm } from '@/components/auth/sso-forms';
import { safeNext } from '@/lib/forms';
import { getMfaChallenge } from '@/lib/session';

export const metadata: Metadata = { title: 'Two-step sign-in' };

export default async function MfaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  if (!(await getMfaChallenge())) redirect(`/login?next=${encodeURIComponent(next)}`);
  return (
    <CenteredCard back={{ href: `/login?next=${encodeURIComponent(next)}`, label: 'sign in' }} eyebrow="Two-step sign-in" eyebrowTone="green" title="One more step" intro="Your password was right. Now confirm it’s you with your authenticator app.">
      <MfaForm next={next} />
    </CenteredCard>
  );
}
