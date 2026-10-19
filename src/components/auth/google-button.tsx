'use client';

import Script from 'next/script';
import { useActionState, useEffect, useRef, useState } from 'react';
import { googleSignIn } from '@/app/actions/auth';
import { Button, Notice, TextLink } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

interface GoogleId {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Google Identity Services button. Google returns an ID token, which goes straight to a Server
 * Action; the API verifies it. A first-time Google user is asked for consent before the account exists.
 */
export function GoogleButton({ next, label = 'Continue with Google' }: { next: string; label?: string }) {
  const [state, action, pending] = useActionState(googleSignIn, {} as FormState);
  const [ready, setReady] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const credential = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const google = (window as unknown as { google?: GoogleId }).google;
    if (!ready || !CLIENT_ID || !google || !slot.current) return;
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: ({ credential: token }) => {
        if (credential.current) credential.current.value = token;
        form.current?.requestSubmit();
      },
    });
    google.accounts.id.renderButton(slot.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 400 });
  }, [ready]);

  if (!CLIENT_ID) {
    return (
      <Button type="button" variant="secondary" disabled title="Google sign-in isn’t configured yet">
        {label} <span className="text-faint">(coming soon)</span>
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <form ref={form} action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <input ref={credential} type="hidden" name="credential" defaultValue={state.values?.credential} />
        {state.needsConsent ? (
          <div className="space-y-3 rounded-[var(--radius-field)] bg-card p-4 ring-1 ring-line">
            <p className="text-[13.5px] font-semibold text-ink">One last thing before we create your account</p>
            <label className="flex items-start gap-3 text-[13.5px]">
              <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
              <span>
                I agree to the <TextLink href="/terms">terms</TextLink> and <TextLink href="/privacy">privacy policy</TextLink>.
              </span>
            </label>
            <label className="flex items-start gap-3 text-[13px] text-muted">
              <input type="checkbox" name="aiProcessing" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
              <span>AI may help review my work. A person always decides. (Optional)</span>
            </label>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating your account…' : 'Create my account'}
            </Button>
          </div>
        ) : (
          <div ref={slot} className="flex min-h-[44px] justify-center" aria-label={label} />
        )}
        {state.error && <Notice tone="error">{state.error}</Notice>}
      </form>
    </div>
  );
}
