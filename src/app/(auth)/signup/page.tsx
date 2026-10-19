import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/forms';
import { AuthShell } from '@/components/auth/shells';
import { Notice, Steps } from '@/components/ui/primitives';
import { safeNext } from '@/lib/forms';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  // Coming from "Bring your organisation": the account comes first, then the organisation.
  const forOrg = next.startsWith('/orgs/new');
  return (
    <AuthShell
      eyebrow={forOrg ? 'Step 1 of 3 · Your own account' : 'Step 1 of 2 · Free to start'}
      title="Create your account"
      intro={forOrg ? 'First, your own account. You’ll use it to run your organisation, and to learn too.' : 'One account for learning on your own, with your school, or with your team.'}
      panelTitle={forOrg ? 'You, then your organisation.' : 'Start where you are.'}
      panelText={
        forOrg
          ? 'Every organisation is run by people with their own accounts. Create yours, confirm it, then name your organisation. You’ll be its admin.'
          : 'You don’t need a school or an employer to begin. Create an account, and you can join or start an organisation any time.'
      }
    >
      {forOrg ? (
        <Steps total={3} current={1} labels={['Your account', 'Confirm', 'Your organisation']} />
      ) : (
        <Steps total={2} current={1} labels={['Your details', 'Confirm']} />
      )}
      <SignupForm
        next={next}
        banner={
          forOrg ? <Notice tone="info">Does your organisation already use Dream Lab? Ask its admin to invite you instead.</Notice> : undefined
        }
      />
    </AuthShell>
  );
}
