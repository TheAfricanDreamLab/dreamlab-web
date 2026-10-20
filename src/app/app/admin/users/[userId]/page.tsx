import type { PlatformUserDetail } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UserStatusForm } from '@/components/admin/admin-forms';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { initials, ROLE_LABELS } from '@/lib/labels';
import { dateTime, isUuid, shortDate } from '@/lib/learning';
import { getMe } from '@/lib/me';
import { siteDomain } from '@/lib/tenant';

export const metadata: Metadata = { title: 'Person' };

const PROVIDERS: Record<string, string> = { password: 'Password', google: 'Google', oidc: 'Organisation sign-on (OIDC)', saml: 'Organisation sign-on (SAML)', otp: 'One-time codes' };

export default async function PlatformUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  const [res, me] = await Promise.all([api<PlatformUserDetail>('GET', `/v1/platform/users/${userId}`), getMe()]);
  if (!res.ok && res.status === 404) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/app/admin/users" label="People" className="-ml-0.5" />
      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-success-tint font-display text-[18px] font-bold text-link ring-1 ring-success-line">{initials(res.data.fullName)}</span>
            <div className="min-w-0 flex-1 space-y-1">
              <Eyebrow tone="gold">Person</Eyebrow>
              <h1 className="text-[28px] font-extrabold leading-tight">{res.data.fullName}</h1>
              <div className="flex flex-wrap gap-1.5">
                {res.data.status === 'suspended' ? <Badge tone="danger">Suspended</Badge> : <Badge tone="green">Active</Badge>}
                {res.data.verified ? <Badge>Verified</Badge> : <Badge tone="gold">Unverified</Badge>}
                {res.data.mfaEnabled && <Badge>Two-step sign-in</Badge>}
                {res.data.platformAdmin && <Badge tone="gold">Platform admin</Badge>}
              </div>
            </div>
          </header>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <Card className="p-6">
                <h2 className="mb-3 text-[17px] font-bold">Details</h2>
                <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
                  {[
                    ['Email', res.data.email ?? '—'],
                    ['Phone', res.data.phone ?? '—'],
                    ['Joined', shortDate(res.data.createdAt)],
                    ['Last sign-in', res.data.lastSignInAt ? dateTime(res.data.lastSignInAt) : 'Never'],
                    ['Signed in on', `${res.data.activeSessions} ${res.data.activeSessions === 1 ? 'device' : 'devices'} now`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{k}</dt>
                      <dd className="break-all font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

              <Card className="p-6">
                <h2 className="mb-3 text-[17px] font-bold">Ways to sign in</h2>
                {res.data.identities.length === 0 ? (
                  <p className="text-[14px] text-muted">Password only.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {res.data.identities.map((i) => (
                      <li key={`${i.provider}-${i.createdAt}`} className="flex justify-between py-2.5 text-[14px]">
                        <span className="text-ink">{PROVIDERS[i.provider] ?? i.provider}</span>
                        <span className="text-muted">since {shortDate(i.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="mb-3 text-[17px] font-bold">Organisations</h2>
                {res.data.memberships.length === 0 ? (
                  <p className="text-[14px] text-muted">Learning on their own. Not a member of any organisation.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {res.data.memberships.map((m) => (
                      <li key={m.orgId} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-semibold text-ink">{m.orgName}</span>
                          <span className="block font-mono text-[11.5px] text-muted">
                            {m.orgSlug}.{siteDomain()}
                          </span>
                        </span>
                        <span className="flex flex-wrap gap-1">
                          {m.roles.map((r) => (
                            <Badge key={r}>{ROLE_LABELS[r] ?? r}</Badge>
                          ))}
                          {m.status !== 'active' && <Badge tone="gold">{m.status}</Badge>}
                          {m.orgStatus !== 'active' && <Badge tone="danger">Org {m.orgStatus}</Badge>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card className="h-fit space-y-3 p-6">
              <h2 className="text-[17px] font-bold">{res.data.status === 'active' ? 'Suspend this person' : 'Let them back in'}</h2>
              {res.data.id === me.user.id ? (
                <p className="text-[14px] text-muted">You can’t suspend yourself.</p>
              ) : (
                <UserStatusForm userId={res.data.id} status={res.data.status} name={res.data.fullName.split(' ')[0] ?? res.data.fullName} />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
