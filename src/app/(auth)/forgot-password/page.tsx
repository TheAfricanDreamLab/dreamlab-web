import type { Metadata } from 'next';
import { RequestCodeForm } from '@/components/auth/forms';
import { CenteredCard } from '@/components/auth/shells';
import { TextLink } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <CenteredCard eyebrow="Forgot password" title="We’ll send you a code" intro="Enter the email or phone you sign in with. The code works once and lasts 10 minutes.">
      <RequestCodeForm purpose="reset" />
      <p className="text-center text-[13.5px] text-muted">
        Remembered it? <TextLink href="/login">Back to sign in</TextLink>
      </p>
    </CenteredCard>
  );
}
