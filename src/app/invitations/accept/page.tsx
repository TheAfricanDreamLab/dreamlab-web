import type { Metadata } from 'next';
import { InvitationActions } from '@/components/directory/invitation-actions';
import { CenteredCard } from '@/components/auth/shells';
import { Badge, ButtonLink, LogoMark, Notice } from '@/components/ui/primitives';
import { callGateway, incomingRequest } from '@/lib/gateway';
import { KIND_LABELS, PERMISSION_LABELS } from '@/lib/labels';
import { getClaims, getInvite } from '@/lib/session';

export const metadata: Metadata = { title: 'Your invitation' };

interface Preview {
  organization: { name: string; slug: string; kinds: string[]; status: string };
  roles: { key: string; name: string; permissions: string[] }[];
  invitedBy: string | null;
  channel: 'email' | 'sms';
  destination: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
}

export default async function InvitationPage() {
  const token = await getInvite();
  if (!token) {
    return (
      <CenteredCard eyebrow="Invitation" title="Open your invitation link" intro="Use the link in the email or text message you were sent. It opens this page with your invitation.">
        <ButtonLink href="/" variant="secondary" className="w-full">
          Go to the home page
        </ButtonLink>
      </CenteredCard>
    );
  }

  const res = await callGateway<Preview>('POST', '/v1/invitations/preview', { body: { token }, request: await incomingRequest() });
  if (!res.ok || res.data.status !== 'pending') {
    const status = res.ok ? res.data.status : 'invalid';
    return (
      <CenteredCard eyebrow="Invitation" eyebrowTone="danger" title={status === 'accepted' ? 'Already accepted' : 'This invitation can’t be used'}>
        <Notice tone={status === 'accepted' ? 'success' : 'error'}>
          {status === 'expired'
            ? 'It has expired. Ask the person who invited you to send a new one.'
            : status === 'accepted'
              ? 'You’ve already joined. Sign in to continue.'
              : 'The link isn’t valid any more. Ask for a new invitation.'}
        </Notice>
        <ButtonLink href="/login" className="w-full">
          Go to sign in
        </ButtonLink>
      </CenteredCard>
    );
  }

  const invite = res.data;
  const signedIn = Boolean(await getClaims());
  const permissions = [...new Set(invite.roles.flatMap((r) => r.permissions))].filter((p) => PERMISSION_LABELS[p]);
  const expires = new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  return (
    <CenteredCard
      width="wide"
      eyebrow={`${KIND_LABELS[invite.organization.kinds[0] ?? ''] ?? 'Organisation'} · Invitation`}
      eyebrowTone="gold"
      title={invite.invitedBy ? `${invite.invitedBy.split(' ')[0]} invited you to join.` : 'You’re invited to join.'}
      intro={
        <>
          {invite.invitedBy ?? 'Someone'} has added you to <b className="text-ink">{invite.organization.name}</b>. Accept below, and that’s the whole setup.
        </>
      }
    >
      <dl className="space-y-2">
        <div className="flex items-center gap-4 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
          <dt className="w-20 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Where</dt>
          <dd className="flex flex-1 items-center gap-2 text-[14px] font-medium text-ink">
            <LogoMark size={22} /> {invite.organization.name}
          </dd>
        </div>
        <div className="flex items-center gap-4 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
          <dt className="w-20 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Role</dt>
          <dd className="flex flex-1 items-center justify-between gap-2 text-[14px] font-medium text-ink">
            {invite.roles.map((r) => r.name).join(', ')}
            <Badge tone="green">{invite.roles[0]?.key === 'org_admin' ? 'Admin' : 'Member'}</Badge>
          </dd>
        </div>
        <div className="flex items-center gap-4 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
          <dt className="w-20 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Sent to</dt>
          <dd className="text-[14px] font-medium text-ink">{invite.destination}</dd>
        </div>
      </dl>

      {permissions.length > 0 && (
        <div className="space-y-2 rounded-[var(--radius-field)] bg-success-tint px-4 py-3 ring-1 ring-success-line">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-link">What you’ll be able to do</p>
          <ul className="space-y-1.5">
            {permissions.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-ink">
                <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-primary text-[10px] text-white">✓</span>
                {PERMISSION_LABELS[p]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <InvitationActions signedIn={signedIn} channel={invite.channel} />

      <Notice tone="info">
        This invitation expires on {expires}. After that, {invite.invitedBy?.split(' ')[0] ?? 'they'} will need to send a new one.
      </Notice>
    </CenteredCard>
  );
}
