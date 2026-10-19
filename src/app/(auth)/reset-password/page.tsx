import type { Metadata } from 'next';
import { ResetForm } from '@/components/auth/forms';
import { CenteredCard } from '@/components/auth/shells';
import { ButtonLink, Notice } from '@/components/ui/primitives';
import { getPending } from '@/lib/session';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage() {
  const pending = await getPending();
  if (!pending || pending.purpose !== 'reset') {
    return (
      <CenteredCard eyebrow="Code expired" eyebrowTone="danger" title="This reset has expired" intro="Reset codes last 10 minutes and work once.">
        <Notice tone="error">Your password has not changed. Nothing on your account was touched.</Notice>
        <ButtonLink href="/forgot-password" className="w-full">
          Send me a new code
        </ButtonLink>
      </CenteredCard>
    );
  }
  return (
    <CenteredCard
      eyebrow="Reset password"
      title="Choose a new password"
      intro={
        <>
          If <b className="text-ink">{pending.identifier}</b> has an account, we’ve sent it a code.
        </>
      }
    >
      <ResetForm />
    </CenteredCard>
  );
}
