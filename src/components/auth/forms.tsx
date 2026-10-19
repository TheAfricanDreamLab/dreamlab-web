'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  login,
  requestLoginCode,
  requestPasswordReset,
  resendCode,
  resetPassword,
  signUp,
  verifyCode,
} from '@/app/actions/auth';
import { NewPasswordInput, OtpInput, PasswordInput, ResendButton, TextInput } from '@/components/ui/fields';
import { Button, cx, Divider, Notice, TextLink } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { GoogleButton } from './google-button';

export function SubmitButton({ children, pending: pendingLabel = 'One moment…', variant = 'primary' }: { children: React.ReactNode; pending?: string; variant?: 'primary' | 'secondary' | 'danger' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

const initial: FormState = {};

export function LoginForm({ next, banner }: { next: string; banner?: React.ReactNode }) {
  const [state, action] = useActionState(login, initial);
  return (
    <div className="space-y-5">
      {banner}
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <TextInput
          label="Email or phone"
          name="identifier"
          autoComplete="username"
          required
          defaultValue={state.values?.identifier}
          placeholder="you@example.com or 0803 000 0000"
        />
        <PasswordInput
          name="password"
          autoComplete="current-password"
          required
          aside={
            <Link href="/forgot-password" className="text-[12.5px] font-semibold text-link">
              Forgot?
            </Link>
          }
        />
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton pending="Signing you in…">Sign in</SubmitButton>
      </form>
      <Divider label="or" />
      <div className="space-y-3">
        <GoogleButton next={next} />
        <Link
          href={`/login/code?next=${encodeURIComponent(next)}`}
          className="flex h-12 items-center justify-center rounded-[var(--radius-field)] bg-card text-[14.5px] font-semibold text-ink ring-1 ring-line-strong hover:ring-line-heavy"
        >
          Email me a sign-in code instead
        </Link>
      </div>
      <p className="text-center text-[13.5px] text-muted">
        New here? <TextLink href={`/signup${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`}>Create your free account</TextLink>
      </p>
    </div>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, initial);
  const [method, setMethod] = useState<'email' | 'phone'>(state.values?.method === 'phone' ? 'phone' : 'email');
  const [name, setName] = useState(state.values?.fullName ?? '');
  const [contact, setContact] = useState(state.values?.[method] ?? '');
  return (
    <div className="space-y-5">
      <GoogleButton next={next} label="Sign up with Google" />
      <Divider label="or with your details" />
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="method" value={method} />
        <TextInput
          label="Your full name"
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={state.fields?.fullName}
        />
        <div className="space-y-2">
          <div className="inline-flex rounded-full bg-card p-1 ring-1 ring-line" role="tablist" aria-label="Sign up with">
            {(['email', 'phone'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={method === m}
                onClick={() => setMethod(m)}
                className={cx('rounded-full px-4 py-1.5 text-[13px] font-semibold', method === m ? 'bg-forest text-white' : 'text-muted hover:text-ink')}
              >
                {m === 'email' ? 'Email' : 'Phone'}
              </button>
            ))}
          </div>
          {method === 'email' ? (
            <TextInput key="email" label="Email" name="email" type="email" autoComplete="email" required value={contact} onChange={(e) => setContact(e.target.value)} error={state.fields?.email} hint="We’ll send a 6-digit code to confirm it’s you." />
          ) : (
            <TextInput key="phone" label="Phone number" name="phone" type="tel" autoComplete="tel" required value={contact} onChange={(e) => setContact(e.target.value)} error={state.fields?.phone} placeholder="0803 000 0000" hint="Nigerian numbers work as you’d type them. We’ll text you a code." />
          )}
        </div>
        <NewPasswordInput avoid={[...name.split(' '), contact.split('@')[0] ?? '']} />
        <fieldset className="space-y-2.5 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
          <label className="flex items-start gap-3 text-[13.5px] text-body">
            <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
            <span>
              I agree to the <TextLink href="/terms">terms</TextLink> and <TextLink href="/privacy">privacy policy</TextLink>.
            </span>
          </label>
          <label className="flex items-start gap-3 text-[13px] text-muted">
            <input type="checkbox" name="aiProcessing" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
            <span>AI may help review my work. A person always makes the final decision. (Optional)</span>
          </label>
        </fieldset>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton pending="Creating your account…">Create my account</SubmitButton>
      </form>
      <p className="text-center text-[13.5px] text-muted">
        Already have an account? <TextLink href={`/login${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</TextLink>
      </p>
    </div>
  );
}

/** Six-digit code entry, shared by sign-up verification and code sign-in. */
export function CodeForm({ next, submitLabel = 'Verify and continue' }: { next: string; submitLabel?: string }) {
  const [state, action] = useActionState(verifyCode, initial);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <OtpInput />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Checking…">{submitLabel}</SubmitButton>
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>
          Didn’t get it? <ResendButton formAction={resendCode} />
        </span>
        <Link href="/login" className="font-medium text-muted hover:text-ink">
          Use another way
        </Link>
      </div>
    </form>
  );
}

export function RequestCodeForm({ purpose, next = '/app' }: { purpose: 'login' | 'reset'; next?: string }) {
  const [state, action] = useActionState(purpose === 'login' ? requestLoginCode : requestPasswordReset, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <TextInput label="Email or phone" name="identifier" autoComplete="username" required defaultValue={state.values?.identifier} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Sending…">{purpose === 'login' ? 'Send me a code' : 'Send reset code'}</SubmitButton>
      <Notice tone="neutral">
        We send the same message whether or not the address has an account, and limit how many codes go out each hour.
      </Notice>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(resetPassword, initial);
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-ink">The 6-digit code we sent</p>
        <OtpInput autoFocus />
      </div>
      <NewPasswordInput label="New password" />
      <PasswordInput name="confirm" label="Type it again" autoComplete="new-password" required />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Saving…">Save new password</SubmitButton>
      <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">This signs you out everywhere else</p>
    </form>
  );
}
