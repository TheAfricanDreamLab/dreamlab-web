import type { Metadata } from 'next';
import type { SsoDiscoverySchema } from '@dreamlab/contracts';
import type { z } from 'zod';
import { LoginForm } from '@/components/auth/forms';
import { AuthShell } from '@/components/auth/shells';
import { TenantSsoButton } from '@/components/auth/sso-forms';
import { Notice } from '@/components/ui/primitives';
import { safeNext } from '@/lib/forms';
import { callGateway, incomingRequest } from '@/lib/gateway';
import { currentTenant } from '@/lib/tenant';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const banner = sp.reset ? (
    <Notice tone="success">Your password is changed. Sign in with the new one.</Notice>
  ) : sp.signedout ? (
    <Notice tone="success">You’ve been signed out on every device.</Notice>
  ) : sp.sso_error ? (
    <Notice tone="error">{sp.sso_error}</Notice>
  ) : sp.next?.startsWith('/orgs/new') ? (
    <Notice tone="info">Sign in first. Your new organisation will belong to this account, and you’ll be its admin.</Notice>
  ) : undefined;

  // On an organisation's own site, its sign-on (if it has one) comes first.
  const tenant = await currentTenant();
  let organisationSso: React.ReactNode;
  if (tenant) {
    const found = await callGateway<z.infer<typeof SsoDiscoverySchema>>('POST', '/v1/auth/sso/discover', { body: { slug: tenant.slug }, request: await incomingRequest() });
    if (found.ok) organisationSso = <TenantSsoButton orgId={found.data.orgId} orgName={found.data.orgName} next={next} />;
  }
  return (
    <AuthShell eyebrow="Welcome back" title="Sign in" intro={tenant ? `Sign in to ${tenant.name}.` : 'Pick up where you left off.'}>
      <LoginForm next={next} banner={banner} organisationSso={organisationSso} />
    </AuthShell>
  );
}
