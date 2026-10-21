'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { acceptInvitation, declineInvitation } from '@/app/actions/org';
import { SubmitButton } from '@/components/auth/forms';
import { ButtonLink, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

const BACK_HERE = encodeURIComponent('/invitations/accept');

/**
 * The one right next step for an invitation:
 *  - signed in as someone else: sign out and continue as the invited person (the invitation is kept);
 *  - signed in as the invited person: accept;
 *  - signed out, and the invited address already has an account: sign in;
 *  - signed out, new address: create the account.
 */
export function InvitationActions({
  signedIn,
  channel,
  destination,
  accountExists,
  forSomeoneElse,
  signedInAs,
}: {
  signedIn: boolean;
  channel: 'email' | 'sms';
  destination: string;
  accountExists: boolean;
  forSomeoneElse: boolean;
  signedInAs: string | null;
}) {
  const [state, accept] = useActionState(async () => acceptInvitation(), {} as FormState);
  const what = channel === 'email' ? 'email address' : 'phone number';

  if (forSomeoneElse) {
    return (
      <div className="space-y-3">
        <Notice tone="info">
          This invitation is for <b>{destination}</b>, but you’re signed in as <b>{signedInAs ?? 'another account'}</b>.
        </Notice>
        <form action="/auth/logout" method="post">
          <input type="hidden" name="next" value={`/login?next=${BACK_HERE}`} />
          <button type="submit" className="h-12 w-full rounded-[var(--radius-field)] bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover">
            Sign out and continue as {destination}
          </button>
        </form>
        <form action={declineInvitation} className="text-center">
          <button type="submit" className="min-h-10 text-[13px] font-medium text-muted hover:text-ink">
            This invitation isn’t for me
          </button>
        </form>
      </div>
    );
  }

  if (!signedIn) {
    return accountExists ? (
      <div className="space-y-3">
        <ButtonLink href={`/login?next=${BACK_HERE}`} className="w-full">
          Sign in to accept
        </ButtonLink>
        <p className="text-center text-[12.5px] text-muted">
          You already have an account with {destination}. Sign in with it; your own learning stays yours.{' '}
          <Link href="/forgot-password" className="font-semibold text-link">
            Forgot your password?
          </Link>
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        <ButtonLink href={`/signup?next=${BACK_HERE}`} className="w-full">
          Create my account to accept
        </ButtonLink>
        <ButtonLink href={`/login?next=${BACK_HERE}`} variant="secondary" className="w-full">
          I already have an account
        </ButtonLink>
        <p className="text-center text-[12.5px] text-muted">Use the {what} this invitation was sent to.</p>
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
        <button type="submit" className="min-h-10 text-[13px] font-medium text-muted hover:text-ink">
          Not for me
        </button>
      </form>
    </div>
  );
}
