import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CenteredCard } from '@/components/auth/shells';
import { ButtonLink, TextLink } from '@/components/ui/primitives';
import { getClaims } from '@/lib/session';

export const metadata: Metadata = { title: 'Bring your organisation' };

const KIND_WORDS: Record<string, string> = {
  enterprise: 'company or team',
  institution: 'school or academy',
  partner: 'content partner organisation',
  sponsor: 'sponsor or funder',
};

/** Signed-out visitors who want to set up an organisation: what happens, in order. */
export default async function OrgStartPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { kind } = await searchParams;
  const target = `/orgs/new${kind && KIND_WORDS[kind] ? `?kind=${kind}` : ''}`;
  if (await getClaims()) redirect(target);
  const next = encodeURIComponent(target);
  const what = (kind && KIND_WORDS[kind]) || 'organisation';

  return (
    <CenteredCard
      width="wide"
      eyebrow="Bring your organisation"
      eyebrowTone="gold"
      title={`Set up your ${what}`}
      intro="It takes about three minutes. An organisation is run by people with their own accounts, so you start with yours."
    >
      <ol className="space-y-3">
        {[
          { n: '1', title: 'Your own account', text: 'Your name, an email or phone, and a password. Already have one? Sign in.' },
          { n: '2', title: 'Confirm it’s you', text: 'Type the 6-digit code we send.' },
          { n: '3', title: 'Name your organisation', text: 'Choose the type and the name. You become its admin and can invite people straight away.' },
        ].map((s) => (
          <li key={s.n} className="flex gap-4 rounded-[var(--radius-field)] bg-card px-4 py-3.5 ring-1 ring-line">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary font-display text-[13px] font-bold text-white">{s.n}</span>
            <span>
              <span className="block text-[14.5px] font-semibold text-ink">{s.title}</span>
              <span className="block text-[13px] text-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink href={`/signup?next=${next}`}>Create my account</ButtonLink>
        <ButtonLink href={`/login?next=${next}`} variant="secondary">
          I already have an account
        </ButtonLink>
      </div>
      <p className="text-center text-[13px] text-muted">
        Joining an organisation that’s already here? Ask its admin for an invitation, or <TextLink href="/login/sso">sign in with your organisation</TextLink>.
      </p>
    </CenteredCard>
  );
}
