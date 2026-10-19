import type { Metadata } from 'next';
import { CenteredCard } from '@/components/auth/shells';
import { OrganisationSignInForm } from '@/components/auth/sso-forms';
import { Notice, TextLink } from '@/components/ui/primitives';
import { safeNext } from '@/lib/forms';

export const metadata: Metadata = { title: 'Sign in with your organisation' };

export default async function SsoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <CenteredCard
      eyebrow="Single sign-on"
      eyebrowTone="green"
      title="Sign in with your organisation"
      intro="If your company, school or programme uses its own sign-in (Microsoft, Google Workspace, Okta and others), start here."
    >
      {sp.required && (
        <Notice tone="info">Your organisation signs everyone in with its own sign-on, so passwords and codes don’t work for this address.</Notice>
      )}
      <OrganisationSignInForm next={next} defaultValue={sp.organisation} error={sp.error} />
      <p className="text-center text-[13.5px] text-muted">
        Not with an organisation? <TextLink href={`/login?next=${encodeURIComponent(next)}`}>Sign in with your email or phone</TextLink>
      </p>
    </CenteredCard>
  );
}
