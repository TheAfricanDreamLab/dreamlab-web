import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CodeForm } from '@/components/auth/forms';
import { CenteredCard } from '@/components/auth/shells';
import { Steps } from '@/components/ui/primitives';
import { safeNext } from '@/lib/forms';
import { getPending } from '@/lib/session';

export const metadata: Metadata = { title: 'Confirm it’s you' };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  const pending = await getPending();
  if (!pending || pending.purpose !== 'verify') redirect('/signup');
  const isEmail = pending.identifier.includes('@');
  return (
    <CenteredCard
      eyebrow="Step 2 of 2 · Confirm it’s you"
      title={isEmail ? 'Check your email' : 'Check your messages'}
      intro={
        <>
          We sent a 6-digit code to <b className="text-ink">{pending.identifier}</b>. It lasts 10 minutes.
        </>
      }
    >
      <Steps total={2} current={2} labels={['Your details', 'Confirm']} />
      <CodeForm next={next} />
    </CenteredCard>
  );
}
