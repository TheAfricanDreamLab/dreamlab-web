import type { Metadata } from 'next';
import { CenteredCard } from '@/components/auth/shells';
import { ButtonLink, cx, TextLink } from '@/components/ui/primitives';
import { getClaims } from '@/lib/session';

export const metadata: Metadata = { title: 'Set up an organisation' };

/*
 * The one way in to setting up an organisation. Learners never see a "create organisation"
 * button elsewhere: they come here on purpose (from the public site's "For organisations" page),
 * read what it means, and confirm.
 */

const KINDS = [
  { key: 'enterprise', words: 'company or team', title: 'A company or team', text: 'Train your people and see their progress. Live straight away.', review: false },
  { key: 'institution', words: 'school or academy', title: 'A school or academy', text: 'Run cohorts, admissions and credit hours under your own name.', review: true },
  { key: 'partner', words: 'content partner organisation', title: 'A content partner', text: 'Publish courses for learners on the platform.', review: true },
  { key: 'sponsor', words: 'sponsor or funder', title: 'A sponsor or funder', text: 'Fund scholarships and follow the learners you support.', review: true },
] as const;

export default async function OrgStartPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { kind } = await searchParams;
  const preset = KINDS.find((k) => k.key === kind);
  const here = `/orgs/start${preset ? `?kind=${preset.key}` : ''}`;
  const what = preset?.words ?? 'organisation';

  if (!(await getClaims())) {
    const next = encodeURIComponent(here);
    return (
      <CenteredCard
        width="wide"
        eyebrow="For organisations"
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

  // Signed in: a deliberate confirmation, never a silent jump into the wizard.
  return (
    <CenteredCard
      width="wide"
      back={{ href: '/app', label: 'my space' }}
      eyebrow="For organisations"
      eyebrowTone="gold"
      title="Set up an organisation?"
      intro="An organisation is a shared space for a company, school, content partner or sponsor: its own people, courses and settings, at its own web address."
    >
      <ul className="space-y-2 rounded-[var(--radius-field)] bg-card px-4 py-3.5 text-[13.5px] leading-relaxed text-body ring-1 ring-line">
        <li>
          <span className="font-semibold text-ink">You become its admin</span>, and you’re responsible for it: who joins, what they can do, and how they sign in.
        </li>
        <li>
          <span className="font-semibold text-ink">Schools, content partners and sponsors</span> are checked by our team before learners can join, usually within two working days.
          Companies and teams go live straight away.
        </li>
        <li>Your own learning stays yours. You can switch between your personal space and the organisation any time.</li>
      </ul>

      <form action="/orgs/new" method="get" className="space-y-4">
        <input type="hidden" name="from" value="start" />
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-semibold text-ink">What kind of organisation?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {KINDS.map((k) => (
              <label
                key={k.key}
                className={cx('flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-field)] bg-card px-3 py-2.5 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary')}
              >
                <input type="radio" name="kind" value={k.key} defaultChecked={preset?.key === k.key} className="mt-1 accent-[var(--color-primary)]" />
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">{k.title}</span>
                  <span className="block text-[12px] text-muted">{k.text}</span>
                  {k.review && <span className="block font-mono text-[9.5px] uppercase tracking-[0.1em] text-gold-ink">Needs approval</span>}
                </span>
              </label>
            ))}
          </div>
          <p className="text-[12px] text-muted">Not sure yet? Leave it and choose on the next step.</p>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="submit" className="h-12 rounded-[var(--radius-field)] bg-primary px-5 text-[15px] font-semibold text-white hover:bg-primary-hover">
            Yes, set up an organisation
          </button>
          <ButtonLink href="/app" variant="secondary">
            No, take me back
          </ButtonLink>
        </div>
      </form>
    </CenteredCard>
  );
}
