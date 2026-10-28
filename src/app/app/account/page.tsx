import type { Metadata } from 'next';
import { revokeSession, signOutEverywhere } from '@/app/actions/account';
import { ChangePasswordForm } from '@/components/app/change-password-form';
import { TwoStepCard } from '@/components/app/two-step-card';
import { NotificationPreferencesForm } from '@/components/notifications/preferences-form';
import { Badge, Button, Card, Eyebrow } from '@/components/ui/primitives';
import { api } from '@/lib/gateway';
import { getMe } from '@/lib/me';
import { CATEGORY_LABELS, type NotificationPreferences } from '@/lib/notifications';

export const metadata: Metadata = { title: 'Account' };

interface Session {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  userAgent: string | null;
  ip: string | null;
  current: boolean;
}

function device(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function AccountPage() {
  const me = await getMe();
  const [sessions, mfa, prefs] = await Promise.all([
    api<{ items: Session[] }>('GET', '/v1/auth/sessions'),
    api<{ enabled: boolean; enabledAt: string | null; recoveryCodesRemaining: number; sessionVerified: boolean }>('GET', '/v1/auth/mfa'),
    api<NotificationPreferences>('GET', '/v1/notifications/preferences'),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">Account and security</Eyebrow>
        <h1 className="text-[30px] font-extrabold leading-tight sm:text-[34px]">Your account</h1>
      </header>

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-6">
          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="text-[17px] font-bold">Profile</h2>
            <dl className="space-y-3 text-[14px]">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted">Name</dt>
                <dd className="min-w-0 break-words text-right font-medium text-ink">{me.user.fullName}</dd>
              </div>
              {me.user.email && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <dt className="text-muted">Email</dt>
                  <dd className="flex min-w-0 flex-wrap items-center justify-end gap-2 break-all text-right font-medium text-ink">
                    {me.user.email} {me.user.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="gold">Unverified</Badge>}
                  </dd>
                </div>
              )}
              {me.user.phone && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <dt className="text-muted">Phone</dt>
                  <dd className="flex min-w-0 flex-wrap items-center justify-end gap-2 break-all text-right font-medium text-ink">
                    {me.user.phone} {me.user.phoneVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="gold">Unverified</Badge>}
                  </dd>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted">Member since</dt>
                <dd className="font-medium text-ink">{new Date(me.user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</dd>
              </div>
            </dl>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <h2 className="text-[17px] font-bold">Where you’re signed in</h2>
              {sessions.ok && <Badge>{sessions.data.items.length}</Badge>}
            </div>
            <ul className="divide-y divide-line">
              {sessions.ok &&
                sessions.data.items.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink">
                        {device(s.userAgent)} {s.current && <Badge tone="green">This device</Badge>}
                      </p>
                      <p className="text-[13px] text-muted">
                        Last active {when(s.lastUsedAt)}
                        {s.ip ? ` · ${s.ip}` : ''}
                      </p>
                    </div>
                    {!s.current && (
                      <form action={revokeSession}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <button type="submit" className="min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-danger-ink hover:bg-danger-tint">
                          Sign out
                        </button>
                      </form>
                    )}
                  </li>
                ))}
            </ul>
            <form action={signOutEverywhere} className="border-t border-line p-4">
              <Button type="submit" variant="danger" size="md">
                Sign out everywhere
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          {mfa.ok && <TwoStepCard status={mfa.data} />}
          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="text-[17px] font-bold">Change password</h2>
            <p className="text-[14px] text-muted">Changing it signs you out on your other devices.</p>
            <ChangePasswordForm avoid={[...me.user.fullName.split(' '), (me.user.email ?? '').split('@')[0] ?? '']} />
          </Card>
          <Card className="scroll-mt-24 space-y-4 p-5 sm:p-6">
            <h2 id="notifications" className="text-[17px] font-bold">
              Notification emails
            </h2>
            <p className="text-[14px] text-muted">
              {me.user.email && me.user.emailVerified
                ? `Everything appears under Notifications in the app. Choose what also comes to ${me.user.email}.`
                : 'Everything appears under Notifications in the app. Verify an email address to get them by email too.'}
            </p>
            {prefs.ok && <NotificationPreferencesForm categories={CATEGORY_LABELS} email={prefs.data.email} />}
          </Card>
        </div>
      </div>
    </div>
  );
}
