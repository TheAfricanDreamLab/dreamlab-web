import type { Metadata } from 'next';
import { CodeForm, RequestCodeForm } from '@/components/auth/forms';
import { CenteredCard } from '@/components/auth/shells';
import { TextLink } from '@/components/ui/primitives';
import { safeNext } from '@/lib/forms';
import { getPending } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in with a code' };

const mask = (v: string) => (v.includes('@') ? `${v[0]}***@${v.split('@')[1]}` : `${v.slice(0, 4)}•••${v.slice(-3)}`);

export default async function CodeLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  const pending = await getPending();
  if (pending?.purpose === 'login') {
    return (
      <CenteredCard
        back={{ href: `/login?next=${encodeURIComponent(next)}`, label: 'sign in' }}
        eyebrow="Sign-in code"
        title="Enter your 6-digit code"
        intro={
          <>
            If <b className="text-ink">{mask(pending.identifier)}</b> has an account, a code is on its way. It works once and lasts 10 minutes.
          </>
        }
      >
        <CodeForm next={next} submitLabel="Sign in" />
      </CenteredCard>
    );
  }
  return (
    <CenteredCard back={{ href: `/login?next=${encodeURIComponent(next)}`, label: 'sign in' }} eyebrow="No password needed" title="We’ll send you a code" intro="Enter the email or phone you signed up with.">
      <RequestCodeForm purpose="login" next={next} />
      <p className="text-center text-[13.5px] text-muted">
        Remembered your password? <TextLink href="/login">Back to sign in</TextLink>
      </p>
    </CenteredCard>
  );
}
