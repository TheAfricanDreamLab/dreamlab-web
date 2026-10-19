import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/forms';
import { AuthShell } from '@/components/auth/shells';
import { Steps } from '@/components/ui/primitives';
import { safeNext } from '@/lib/forms';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell
      eyebrow="Step 1 of 2 · Free to start"
      title="Create your account"
      intro="One account for learning on your own, with your school, or with your team."
      panelTitle="Start where you are."
      panelText="You don’t need a school or an employer to begin. Create an account, and you can join or start an organisation any time."
    >
      <Steps total={2} current={1} labels={['Your details', 'Confirm']} />
      <SignupForm next={next} />
    </AuthShell>
  );
}
