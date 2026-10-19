'use client';

import { useActionState } from 'react';
import { acceptInvitation, declineInvitation } from '@/app/actions/org';
import { SubmitButton } from '@/components/auth/forms';
import { ButtonLink, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

export function InvitationActions({ signedIn, channel }: { signedIn: boolean; channel: 'email' | 'sms' }) {
  const [state, accept] = useActionState(async () => acceptInvitation(), {} as FormState);
  if (!signedIn) {
    return (
      <div className="space-y-3">
        <ButtonLink href="/signup?next=/invitations/accept" className="w-full">
          Create my account to accept
        </ButtonLink>
        <ButtonLink href="/login?next=/invitations/accept" variant="secondary" className="w-full">
          I already have an account
        </ButtonLink>
        <p className="text-center text-[12.5px] text-muted">Use the {channel === 'email' ? 'email address' : 'phone number'} this invitation was sent to.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <form action={accept}>
        <SubmitButton pending="Joining…">Accept and join</SubmitButton>
      </form>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form action={declineInvitation} className="text-center">
        <button type="submit" className="text-[13px] font-medium text-muted hover:text-ink">
          Not for me
        </button>
      </form>
    </div>
  );
}
