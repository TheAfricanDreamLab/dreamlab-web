'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signInWithOrganisation, signInWithTenantSso, verifyMfa } from '@/app/actions/auth';
import { TextInput } from '@/components/ui/fields';
import { Notice, TextLink } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { SubmitButton } from './forms';

const initial: FormState = {};

/** Work email or organisation address → the organisation's own sign-on. */
export function OrganisationSignInForm({ next, defaultValue, error }: { next: string; defaultValue?: string; error?: string }) {
  const [state, action] = useActionState(signInWithOrganisation, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <TextInput
        label="Work email or organisation address"
        name="organisation"
        required
        autoFocus
        defaultValue={state.values?.organisation ?? defaultValue}
        placeholder="you@company.com or company.theafricandreamlab.com"
        hint="We’ll send you to your organisation’s own sign-in page."
      />
      {(state.error ?? error) && <Notice tone="error">{state.error ?? error}</Notice>}
      <SubmitButton pending="Finding your organisation…">Continue</SubmitButton>
      <p className="text-center text-[12.5px] text-muted">
        By continuing you agree to the <TextLink href="/terms">terms</TextLink> and <TextLink href="/privacy">privacy policy</TextLink>.
      </p>
    </form>
  );
}

/** On an organisation's own site with sign-on switched on: one button. */
export function TenantSsoButton({ orgId, orgName, next }: { orgId: string; orgName: string; next: string }) {
  return (
    <form action={signInWithTenantSso}>
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="next" value={next} />
      <SubmitButton pending="Opening your organisation’s sign-in…">Continue with {orgName} sign-on</SubmitButton>
    </form>
  );
}

/** Second step: the authenticator app's code, or a recovery code. */
export function MfaForm({ next }: { next: string }) {
  const [state, action] = useActionState(verifyMfa, initial);
  const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {recovery ? (
        <TextInput key="recovery" label="Recovery code" name="code" required autoFocus autoComplete="off" placeholder="k3x9q-7mz2p" hint="Each recovery code works once." />
      ) : (
        <TextInput
          key="totp"
          label="6-digit code"
          name="code"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          hint="Open your authenticator app and type the code for The African Dream Lab."
        />
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Checking…">Sign in</SubmitButton>
      <div className="flex items-center justify-between text-[13px] text-muted">
        <button type="button" onClick={() => setRecovery((v) => !v)} className="font-semibold text-link">
          {recovery ? 'Use my authenticator app' : 'Use a recovery code'}
        </button>
        <Link href="/login" className="font-medium text-muted hover:text-ink">
          Start again
        </Link>
      </div>
    </form>
  );
}
