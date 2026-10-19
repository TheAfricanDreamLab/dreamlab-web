'use client';

import QRCode from 'qrcode';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { confirmAuthenticator, disableAuthenticator, newRecoveryCodes, setupAuthenticator, stepUp } from '@/app/actions/security';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

interface Status {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  sessionVerified: boolean;
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-2 rounded-[var(--radius-field)] bg-gold-tint p-4 ring-1 ring-gold-line">
      <p className="text-[13.5px] font-semibold text-gold-ink">Save these recovery codes somewhere safe. Each works once if you lose your phone. They won’t be shown again.</p>
      <ul className="grid grid-cols-2 gap-1.5 font-mono text-[14px] text-ink" aria-label="Recovery codes">
        {codes.map((c) => (
          <li key={c} className="rounded bg-card px-2 py-1 ring-1 ring-gold-line">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Account → Two-step sign-in: add an authenticator app, confirm codes, manage recovery codes. */
export function TwoStepCard({ status }: { status: Status }) {
  const [setup, setSetup] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [confirmed, confirmAction] = useActionState(confirmAuthenticator, {} as FormState);
  const [stepped, stepAction] = useActionState(stepUp, {} as FormState);
  const [regen, regenAction] = useActionState(newRecoveryCodes, {} as FormState);
  const [off, offAction] = useActionState(disableAuthenticator, {} as FormState);
  const [qr, setQr] = useState('');
  const secret = setup.values?.secret ?? confirmed.values?.secret;
  const url = setup.values?.otpauthUrl ?? confirmed.values?.otpauthUrl;

  useEffect(() => {
    if (url) void QRCode.toDataURL(url, { margin: 1, width: 192 }).then(setQr);
  }, [url]);

  // The newest set wins: replacing the codes invalidates the ones shown when MFA was turned on.
  const fresh = regen.values?.recoveryCodes?.split(' ') ?? confirmed.values?.recoveryCodes?.split(' ');

  return (
    <Card className="scroll-mt-24 space-y-4 p-6">
      <div id="two-step" className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">Two-step sign-in</h2>
        {status.enabled || confirmed.notice ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}
      </div>

      {!status.enabled && !confirmed.notice && (
        <>
          <p className="text-[13.5px] text-muted">
            After your password, you’ll type a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). Some organisations require it for admins.
          </p>
          {!secret ? (
            <>
              {setup.error && <Notice tone="error">{setup.error}</Notice>}
              <Button type="button" disabled={pending} onClick={() => start(async () => setSetup(await setupAuthenticator()))}>
                {pending ? 'One moment…' : 'Set up an authenticator app'}
              </Button>
            </>
          ) : (
            <form action={confirmAction} className="space-y-4">
              <input type="hidden" name="secret" value={secret} />
              <input type="hidden" name="otpauthUrl" value={url} />
              <div className="flex flex-col items-center gap-3 rounded-[var(--radius-field)] bg-surface p-4 ring-1 ring-line sm:flex-row sm:items-start">
                {/* A data: URL made in the browser; next/image has nothing to optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt="QR code for your authenticator app" width={160} height={160} className="rounded-lg bg-white p-1" /> : <div className="h-40 w-40" />}
                <div className="space-y-2 text-[13px] text-body">
                  <p>1. Scan this with your authenticator app.</p>
                  <p>
                    Can’t scan? Type this key: <span className="block break-all font-mono text-[13.5px] text-ink" data-testid="totp-secret">{secret}</span>
                  </p>
                  <p>2. Type the 6-digit code it shows.</p>
                </div>
              </div>
              <TextInput label="Code from the app" name="code" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" />
              {confirmed.error && <Notice tone="error">{confirmed.error}</Notice>}
              <SubmitButton pending="Checking…">Turn on two-step sign-in</SubmitButton>
            </form>
          )}
        </>
      )}

      {confirmed.notice && <Notice tone="success">{confirmed.notice}</Notice>}
      {fresh && <RecoveryCodes codes={fresh} />}

      {status.enabled && (
        <div className="space-y-5">
          <p className="text-[13.5px] text-muted">
            On since {new Date(status.enabledAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. {status.recoveryCodesRemaining} recovery codes left.
          </p>
          {!status.sessionVerified && !stepped.notice && (
            <form action={stepAction} className="space-y-3 rounded-[var(--radius-field)] bg-surface p-4 ring-1 ring-line">
              <p className="text-[13.5px] font-semibold text-ink">Confirm a code on this device</p>
              <p className="text-[12.5px] text-muted">Needed for admin actions in organisations that require two-step sign-in.</p>
              <TextInput label="Code" name="code" required autoComplete="one-time-code" />
              {stepped.error && <Notice tone="error">{stepped.error}</Notice>}
              <SubmitButton pending="Checking…">Confirm</SubmitButton>
            </form>
          )}
          {stepped.notice && <Notice tone="success">{stepped.notice}</Notice>}
          <details className="rounded-[var(--radius-field)] ring-1 ring-line">
            <summary className="cursor-pointer px-4 py-3 text-[13.5px] font-semibold text-ink">New recovery codes</summary>
            <form action={regenAction} className="space-y-3 px-4 pb-4">
              <TextInput label="Code from your app" name="code" required autoComplete="one-time-code" />
              {regen.error && <Notice tone="error">{regen.error}</Notice>}
              {regen.notice && <Notice tone="success">{regen.notice}</Notice>}
              <SubmitButton pending="Making new codes…" variant="secondary">
                Replace my recovery codes
              </SubmitButton>
            </form>
          </details>
          <details className="rounded-[var(--radius-field)] ring-1 ring-line">
            <summary className="cursor-pointer px-4 py-3 text-[13.5px] font-semibold text-danger-ink">Turn off two-step sign-in</summary>
            <form action={offAction} className="space-y-3 px-4 pb-4">
              <TextInput label="Code from your app (or a recovery code)" name="code" required autoComplete="one-time-code" />
              {off.error && <Notice tone="error">{off.error}</Notice>}
              {off.notice && <Notice tone="success">{off.notice}</Notice>}
              <SubmitButton pending="Turning off…" variant="danger">
                Turn off
              </SubmitButton>
            </form>
          </details>
        </div>
      )}
    </Card>
  );
}
