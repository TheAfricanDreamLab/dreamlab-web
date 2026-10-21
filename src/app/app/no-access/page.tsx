import type { Metadata } from 'next';
import { CenteredCard } from '@/components/auth/shells';
import { ButtonLink } from '@/components/ui/primitives';
import { getMe } from '@/lib/me';
import { currentTenant, siteDomain } from '@/lib/tenant';

export const metadata: Metadata = { title: 'Not a member here' };

/** Signed in on an organisation's site the person doesn't belong to: say so, and offer the ways on. */
export default async function NoAccessPage() {
  const [me, tenant] = await Promise.all([getMe(), currentTenant()]);
  const orgName = tenant?.name ?? 'this organisation';
  const proto = siteDomain().startsWith('localhost') ? 'http' : 'https';
  return (
    <CenteredCard eyebrow="Not a member" eyebrowTone="gold" title={`You’re not in ${orgName}`} back={{ href: `${proto}://${siteDomain()}/app`, label: 'your space' }}>
      <p className="text-[14.5px] text-body">
        You’re signed in as <b className="text-ink">{me.user.email ?? me.user.phone}</b>, which isn’t a member of {orgName}. To join, ask one of its admins for an
        invitation, then open the link they send.
      </p>
      <div className="grid gap-3">
        <ButtonLink href={`${proto}://${siteDomain()}/app`}>Go to my space</ButtonLink>
        <form action="/auth/logout" method="post">
          <input type="hidden" name="next" value="/login" />
          <button type="submit" className="h-12 w-full rounded-[var(--radius-field)] bg-card text-[14.5px] font-semibold text-ink ring-1 ring-line-strong hover:ring-line-heavy">
            Sign in with a different account
          </button>
        </form>
      </div>
    </CenteredCard>
  );
}
