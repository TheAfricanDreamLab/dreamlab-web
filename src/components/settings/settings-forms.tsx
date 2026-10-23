'use client';

import { useActionState, useState } from 'react';
import { testSso } from '@/app/actions/auth';
import {
  addDomain,
  createScimToken,
  disableScim,
  removeDomain,
  removeSso,
  saveSso,
  setAdminMfa,
  setJoinPolicy,
  updateSso,
  verifyDomain,
} from '@/app/actions/security';
import { SubmitButton } from '@/components/auth/forms';
import { Field, TextInput } from '@/components/ui/fields';
import { Badge, Button, cx, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { OrgField } from '@/components/app/org-binding';

const initial: FormState = {};

export function Copyable({ label, value, testId }: { label: string; value: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 ring-1 ring-line">
        <code className="min-w-0 flex-1 break-all text-[12.5px] text-ink" data-testid={testId}>
          {value}
        </code>
        <button
          type="button"
          className="shrink-0 text-[12px] font-semibold text-link"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ---------- Domains ----------

export function AddDomainForm() {
  const [state, action] = useActionState(addDomain, initial);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <OrgField />
      <div className="flex-1">
        <TextInput label="Your email domain" name="domain" required placeholder="yourcompany.com" defaultValue={state.values?.domain} error={state.fields?.domain ?? state.error} hint={state.notice} />
      </div>
      <div className="sm:w-40">
        <SubmitButton pending="Adding…" variant="secondary">
          Add domain
        </SubmitButton>
      </div>
    </form>
  );
}

export interface DomainView {
  id: string;
  domain: string;
  verified: boolean;
  joinPolicy: 'none' | 'request' | 'auto';
  verification: { recordName: string; recordValue: string };
}

export function DomainRow({ d }: { d: DomainView }) {
  const [state, action] = useActionState(verifyDomain, initial);
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[14px] font-semibold text-ink">{d.domain}</span>
        {d.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="gold">Waiting for DNS</Badge>}
        <form action={removeDomain} className="ml-auto">
          <OrgField />
          <input type="hidden" name="domainId" value={d.id} />
          <button type="submit" className="rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-muted hover:bg-danger-tint hover:text-danger-ink">
            Remove
          </button>
        </form>
      </div>
      {d.verified ? (
        <form action={setJoinPolicy} className="flex flex-wrap items-center gap-2 text-[13px]">
          <OrgField />
          <input type="hidden" name="domainId" value={d.id} />
          <label htmlFor={`jp-${d.id}`} className="text-muted">
            People with an @{d.domain} address
          </label>
          <select id={`jp-${d.id}`} name="joinPolicy" defaultValue={d.joinPolicy} className="h-8 rounded-lg bg-card px-2 ring-1 ring-line-strong">
            <option value="none">need an invitation</option>
            <option value="request">can ask to join</option>
            <option value="auto">can join straight away</option>
          </select>
          <button type="submit" className="h-8 rounded-lg px-2.5 font-semibold text-link hover:bg-success-tint">
            Save
          </button>
        </form>
      ) : (
        <div className="space-y-3 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line">
          <p className="text-[13px] text-body">Ask whoever runs your DNS to add this TXT record, then check it here.</p>
          <Copyable label="Name" value={d.verification.recordName} />
          <Copyable label="Value" value={d.verification.recordValue} testId={`txt-${d.domain}`} />
          <form action={action}>
            <OrgField />
            <input type="hidden" name="domainId" value={d.id} />
            {state.error && <Notice tone="error" className="mb-3">{state.error}</Notice>}
            <SubmitButton pending="Checking DNS…" variant="secondary">
              Verify {d.domain}
            </SubmitButton>
          </form>
        </div>
      )}
    </li>
  );
}

// ---------- Single sign-on ----------

export interface SsoView {
  connection: null | {
    protocol: 'oidc' | 'saml';
    enabled: boolean;
    enforced: boolean;
    testedAt: string | null;
    defaultRoleKey: string;
    oidc: { issuer: string; clientId: string; hasClientSecret: boolean } | null;
    saml: { idpEntityId: string; idpSsoUrl: string; certificateFingerprint: string; certificateExpiresAt: string | null } | null;
  };
  serviceProvider: { oidcRedirectUri: string; samlAcsUrl: string; samlEntityId: string | null; samlMetadataUrl: string | null };
}

export function SsoSetup({ sso, orgId, roles, hasVerifiedDomain }: { sso: SsoView; orgId: string; roles: { key: string; name: string }[]; hasVerifiedDomain: boolean }) {
  const c = sso.connection;
  const [protocol, setProtocol] = useState<'oidc' | 'saml'>(c?.protocol ?? 'oidc');
  const [saved, saveAction] = useActionState(saveSso, initial);
  const [updated, updateAction] = useActionState(updateSso, initial);
  // "Change identity provider" remembers the save result it was opened at. A newer successful
  // save closes the form again, to show the connection and the next steps; an error keeps it open.
  const [openedAt, setOpenedAt] = useState<FormState | null>(null);
  const editing = !c || (openedAt !== null && (openedAt === saved || !saved.notice));

  if (!hasVerifiedDomain) {
    return <Notice tone="info">Verify at least one email domain above first. Sign-on only accepts people whose address is at your verified domains.</Notice>;
  }

  return (
    <div className="space-y-5">
      {c && !editing && (
        <div className="space-y-4">
          {saved.notice && <Notice tone="success">{saved.notice}</Notice>}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">{c.protocol === 'oidc' ? 'OpenID Connect' : 'SAML 2.0'}</Badge>
            {c.enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}
            {c.enforced && <Badge tone="gold">Required for your domains</Badge>}
            {c.testedAt ? <Badge tone="green">Tested {new Date(c.testedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Badge> : <Badge tone="gold">Not tested yet</Badge>}
            <button type="button" onClick={() => setOpenedAt(saved)} className="ml-auto text-[13px] font-semibold text-link">
              Change identity provider
            </button>
          </div>
          <p className="text-[13px] text-muted">{c.oidc ? `Issuer ${c.oidc.issuer} · client ${c.oidc.clientId}` : `IdP ${c.saml?.idpEntityId} · certificate ${c.saml?.certificateFingerprint.slice(0, 23)}…`}</p>

          <form action={testSso}>
            <OrgField />
            <input type="hidden" name="orgId" value={orgId} />
            <Button type="submit" variant="secondary">
              Test sign-on with my account
            </Button>
          </form>

          <form action={updateAction} className="space-y-3 rounded-[var(--radius-field)] bg-surface p-4 ring-1 ring-line">
            <OrgField />
            <label className="flex items-start gap-3 text-[13.5px] text-body">
              <input type="hidden" name="enabled" value="false" />
              <input type="checkbox" name="enabled" value="true" defaultChecked={c.enabled} className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
              <span>
                <b className="text-ink">Let people sign in with it.</b> They choose “Sign in with your organisation”, or use your organisation’s own address.
              </span>
            </label>
            <label className="flex items-start gap-3 text-[13.5px] text-body">
              <input type="hidden" name="enforced" value="false" />
              <input type="checkbox" name="enforced" value="true" defaultChecked={c.enforced} className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
              <span>
                <b className="text-ink">Require it.</b> People with an address at your verified domains can’t use passwords or codes. Needs a successful test first.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
              <label htmlFor="defaultRoleKey" className="text-body">
                New people join as
              </label>
              <select id="defaultRoleKey" name="defaultRoleKey" defaultValue={c.defaultRoleKey} className="h-9 rounded-lg bg-card px-2 ring-1 ring-line-strong">
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            {updated.error && <Notice tone="error">{updated.error}</Notice>}
            {updated.notice && <Notice tone="success">{updated.notice}</Notice>}
            <SubmitButton pending="Saving…">Save sign-on settings</SubmitButton>
          </form>
          <form action={removeSso}>
            <OrgField />
            <button type="submit" className="text-[13px] font-semibold text-danger-ink">
              Remove single sign-on
            </button>
          </form>
        </div>
      )}

      {editing && (
        <form action={saveAction} className="space-y-4">
          <OrgField />
          <input type="hidden" name="protocol" value={protocol} />
          <div className="inline-flex rounded-full bg-card p-1 ring-1 ring-line" role="tablist" aria-label="Protocol">
            {(['oidc', 'saml'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={protocol === p}
                onClick={() => setProtocol(p)}
                className={cx('rounded-full px-4 py-1.5 text-[13px] font-semibold', protocol === p ? 'bg-forest text-white' : 'text-muted hover:text-ink')}
              >
                {p === 'oidc' ? 'OpenID Connect' : 'SAML 2.0'}
              </button>
            ))}
          </div>
          <div className="space-y-2 rounded-[var(--radius-field)] bg-surface p-4 ring-1 ring-line">
            <p className="text-[13px] font-semibold text-ink">1. Give your identity provider these details</p>
            {protocol === 'oidc' ? (
              <Copyable label="Redirect URI" value={sso.serviceProvider.oidcRedirectUri} />
            ) : (
              <>
                <Copyable label="ACS (reply) URL" value={sso.serviceProvider.samlAcsUrl} />
                {sso.serviceProvider.samlEntityId && <Copyable label="Entity ID (audience)" value={sso.serviceProvider.samlEntityId} />}
                <p className="text-[12px] text-muted">Release the user’s email address (as NameID or an email attribute), and sign the assertion.</p>
              </>
            )}
          </div>
          <p className="text-[13px] font-semibold text-ink">2. Paste what it gives you back</p>
          {protocol === 'oidc' ? (
            <>
              <TextInput label="Issuer URL" name="issuer" required placeholder="https://login.microsoftonline.com/<tenant>/v2.0" defaultValue={saved.values?.issuer ?? c?.oidc?.issuer} error={saved.fields?.issuer} />
              <TextInput label="Client ID" name="clientId" required defaultValue={saved.values?.clientId ?? c?.oidc?.clientId} error={saved.fields?.clientId} />
              <TextInput
                label="Client secret"
                name="clientSecret"
                type="password"
                autoComplete="off"
                required={!c?.oidc?.hasClientSecret}
                hint={c?.oidc?.hasClientSecret ? 'Leave empty to keep the one you saved.' : 'Stored encrypted. We never show it again.'}
                error={saved.fields?.clientSecret}
              />
            </>
          ) : (
            <>
              <TextInput label="Identity provider entity ID (issuer)" name="idpEntityId" required defaultValue={saved.values?.idpEntityId ?? c?.saml?.idpEntityId} error={saved.fields?.idpEntityId} />
              <TextInput label="Sign-on URL" name="idpSsoUrl" required placeholder="https://idp.example.com/sso/saml" defaultValue={saved.values?.idpSsoUrl ?? c?.saml?.idpSsoUrl} error={saved.fields?.idpSsoUrl} />
              <Field label="Signing certificate" htmlFor="certificate" error={saved.fields?.certificate} hint="The X.509 certificate, including the BEGIN and END lines.">
                <textarea
                  id="certificate"
                  name="certificate"
                  required
                  rows={5}
                  defaultValue={saved.values?.certificate}
                  className="w-full rounded-[var(--radius-field)] bg-card px-4 py-3 font-mono text-[12px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="-----BEGIN CERTIFICATE-----"
                />
              </Field>
            </>
          )}
          {saved.error && <Notice tone="error">{saved.error}</Notice>}
          {saved.notice && <Notice tone="success">{saved.notice}</Notice>}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <SubmitButton pending="Checking and saving…">Save identity provider</SubmitButton>
            {c && (
              <Button type="button" variant="secondary" className="px-6" onClick={() => setOpenedAt(null)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

// ---------- SCIM ----------

export function ScimSetup({ enabled, baseUrl, tokenHint, lastSyncAt, hasVerifiedDomain }: { enabled: boolean; baseUrl: string; tokenHint: string | null; lastSyncAt: string | null; hasVerifiedDomain: boolean }) {
  const [state, action] = useActionState(createScimToken, initial);
  if (!hasVerifiedDomain) return <Notice tone="info">Verify an email domain first. Provisioning only creates people at your verified domains.</Notice>;
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-muted">
        Let your identity provider (Microsoft Entra, Okta, Google, JumpCloud…) add, update and remove people and groups automatically.
      </p>
      <Copyable label="SCIM base URL" value={baseUrl} />
      {state.values?.token && (
        <div className="space-y-2">
          <Copyable label="Bearer token (shown once)" value={state.values.token} testId="scim-token" />
          <Notice tone="info">{state.notice}</Notice>
        </div>
      )}
      {enabled && !state.values?.token && (
        <p className="text-[13px] text-body">
          On · token starting <code className="font-mono">{tokenHint}</code>
          {lastSyncAt ? ` · last change ${new Date(lastSyncAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ' · no changes yet'}
        </p>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <form action={action}>
        <OrgField />
        <SubmitButton pending="Making a token…" variant={enabled ? 'secondary' : 'primary'}>
          {enabled ? 'Replace the token' : 'Turn on provisioning'}
        </SubmitButton>
      </form>
      {enabled && (
        <form action={disableScim}>
          <OrgField />
          <button type="submit" className="text-[13px] font-semibold text-danger-ink">
            Turn off provisioning
          </button>
        </form>
      )}
    </div>
  );
}

// ---------- Security policy ----------

export function AdminMfaPolicy({ required, sessionHasMfa }: { required: boolean; sessionHasMfa: boolean }) {
  const [state, action] = useActionState(setAdminMfa, initial);
  return (
    <form action={action} className="space-y-3">
      <OrgField />
      <input type="hidden" name="requireAdminMfa" value={required ? 'false' : 'true'} />
      <p className="text-[13.5px] text-body">
        {required
          ? 'Admins must confirm an authenticator code (or sign in with your organisation’s sign-on) before changing people, roles or settings.'
          : 'Ask admins to use an authenticator app (or your organisation’s sign-on) before changing people, roles or settings.'}
      </p>
      {!required && !sessionHasMfa && <Notice tone="info">Turn on two-step sign-in for your own account first (Account → Two-step sign-in), and confirm a code.</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <SubmitButton pending="Saving…" variant={required ? 'secondary' : 'primary'}>
        {required ? 'Stop requiring it' : 'Require two-step sign-in for admins'}
      </SubmitButton>
    </form>
  );
}
