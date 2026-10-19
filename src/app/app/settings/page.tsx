import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AddDomainForm, AdminMfaPolicy, DomainRow, type DomainView, ScimSetup, SsoSetup, type SsoView } from '@/components/settings/settings-forms';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { messageForCode } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { activeMembership, can, getMe } from '@/lib/me';
import { getClaims } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign-in & security' };

interface ScimView {
  baseUrl: string;
  enabled: boolean;
  tokenHint: string | null;
  lastSyncAt: string | null;
}

function Section({ id, step, title, intro, children }: { id: string; step: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <Card className="scroll-mt-24 overflow-hidden" >
      <div id={id} className="space-y-1 border-b border-line px-6 py-5">
        <Eyebrow tone="green">{step}</Eyebrow>
        <h2 className="text-[19px] font-bold">{title}</h2>
        <p className="text-[13.5px] text-muted">{intro}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </Card>
  );
}

/** Org admins: email domains → single sign-on → provisioning → policy, in the order they depend on each other. */
export default async function SecuritySettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const me = await getMe();
  const active = activeMembership(me);
  if (!active || !can(me, 'org.security.manage')) redirect('/app');
  const orgId = active.org.id;
  const claims = await getClaims();

  const [domains, sso, scim, policy, roles] = await Promise.all([
    api<{ items: DomainView[] }>('GET', `/v1/orgs/${orgId}/domains`),
    api<SsoView>('GET', `/v1/orgs/${orgId}/sso`),
    api<ScimView>('GET', `/v1/orgs/${orgId}/scim`),
    api<{ requireAdminMfa: boolean }>('GET', `/v1/orgs/${orgId}/security`),
    api<{ items: { key: string; name: string; scopeTypes: string[]; permissions: string[] }[] }>('GET', `/v1/orgs/${orgId}/roles`),
  ]);
  const mfaBlocked = [domains, sso, scim].find((r) => !r.ok && r.error.code === 'mfa_required');
  const hasVerifiedDomain = domains.ok && domains.data.items.some((d) => d.verified);
  const joinRoles = roles.ok
    ? roles.data.items.filter((r) => r.scopeTypes.includes('org') && !['org_admin', 'platform_admin'].includes(r.key) && !r.permissions.some((p) => p.startsWith('org.roles') || p === 'org.security.manage'))
    : [{ key: 'learner', name: 'Learner' }];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active.org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Sign-in & security</h1>
        <p className="max-w-2xl text-[14.5px] text-muted">
          Connect your organisation’s own sign-in so people use their work accounts. Each step needs the one before it.
        </p>
      </header>

      {mfaBlocked && (
        <Notice tone="info">
          Your organisation requires two-step sign-in for admin settings. Confirm a code in <a className="font-semibold text-link" href="/app/account#two-step">Account → Two-step sign-in</a>, then come back.
        </Notice>
      )}
      {sp.sso_tested && <Notice tone="success">Sign-on works: your identity provider signed you in. You can require it now.</Notice>}
      {sp.sso_error && <Notice tone="error">{messageForCode(sp.sso_error)}</Notice>}

      <Section id="domains" step="Step 1" title="Email domains" intro="Prove your organisation owns its email domain. Sign-on, provisioning and joining by email all depend on it.">
        <div className="space-y-4">
          {domains.ok && domains.data.items.length > 0 && (
            <ul className="-mx-5 divide-y divide-line rounded-[var(--radius-field)] ring-1 ring-line">
              {domains.data.items.map((d) => (
                <DomainRow key={d.id} d={d} />
              ))}
            </ul>
          )}
          <AddDomainForm />
        </div>
      </Section>

      <Section id="sign-on" step="Step 2" title="Single sign-on" intro="People sign in with their work account through your identity provider (OpenID Connect or SAML 2.0).">
        {sso.ok ? <SsoSetup sso={sso.data} orgId={orgId} roles={joinRoles} hasVerifiedDomain={hasVerifiedDomain} /> : <Notice tone="error">{sso.error.message}</Notice>}
      </Section>

      <Section id="provisioning" step="Step 3 · optional" title="Automatic provisioning (SCIM)" intro="Keep your people and groups in step with your directory: joiners added, leavers removed.">
        {scim.ok ? <ScimSetup {...scim.data} hasVerifiedDomain={hasVerifiedDomain} /> : <Notice tone="error">{scim.error.message}</Notice>}
      </Section>

      <Section id="policy" step="Policy" title="Two-step sign-in for admins" intro="Protect the settings that decide who can do what.">
        {policy.ok ? (
          <AdminMfaPolicy required={policy.data.requireAdminMfa} sessionHasMfa={Boolean(claims?.amr?.includes('mfa'))} />
        ) : (
          <Notice tone="error">{policy.error.message}</Notice>
        )}
      </Section>
    </div>
  );
}
