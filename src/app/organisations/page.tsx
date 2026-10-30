import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LaptopOutline, PhoneOutline, TabletOutline } from '@/components/landing/devices';
import { Reveal } from '@/components/landing/motion';
import { SectionTitle } from '@/components/landing/sections';
import { PublicFooter, PublicHeader } from '@/components/site/public-header';
import { ButtonLink } from '@/components/ui/primitives';
import { siteDomain } from '@/lib/tenant';

export const metadata: Metadata = {
  title: 'For organisations',
  description: 'Run cohorts, train your team, publish courses or sponsor learners on The African Dream Lab.',
};

type Kind = {
  id: string;
  kind: string;
  tag: string;
  title: string;
  subtitle: string;
  facts: [string, string][];
  status: string;
  cta: string;
  device: ReactNode;
};

const KINDS: Kind[] = [
  {
    id: 'schools',
    kind: 'institution',
    tag: 'Schools & academies',
    title: 'Run your cohorts',
    subtitle: 'your-name.{domain}',
    facts: [
      ['Admissions', 'Ten stages, read by people'],
      ['Teaching', 'Cohorts, live classes, residency'],
      ['People', 'Instructors, mentors and admins'],
      ['Go-live', 'After a short review'],
    ],
    status: 'You can set up and invite co-admins while we review your school.',
    cta: 'Bring your school',
    device: <TabletOutline />,
  },
  {
    id: 'companies',
    kind: 'enterprise',
    tag: 'Companies & teams',
    title: 'Grow your people',
    subtitle: 'Ready the moment you create it',
    facts: [
      ['Invite', 'By email or phone'],
      ['Organise', 'Departments and groups'],
      ['Assign', 'Courses with due dates'],
      ['Courses', 'Private and shared'],
    ],
    status: 'Follow progress for every person and group you assign learning to.',
    cta: 'Set up your team',
    device: <LaptopOutline />,
  },
  {
    id: 'partners',
    kind: 'partner',
    tag: 'Content partners',
    title: 'Publish courses',
    subtitle: 'For learners, schools and teams',
    facts: [
      ['Build', 'Lessons, quizzes and projects'],
      ['Reach', 'Across the whole platform'],
      ['Insight', 'How your courses are going'],
      ['Go-live', 'After a short review'],
    ],
    status: 'A short review first, so learners can trust what they see.',
    cta: 'Become a partner',
    device: <PhoneOutline />,
  },
  {
    id: 'sponsors',
    kind: 'sponsor',
    tag: 'Sponsors & funders',
    title: 'Fund learners',
    subtitle: 'And follow their progress',
    facts: [
      ['Fund', 'Learners, seats, scholarships'],
      ['Follow', 'The people you support'],
      ['See', 'The work they produce'],
      ['Go-live', 'After a short review'],
    ],
    status: 'Sponsors start with a short review before they go live.',
    cta: 'Become a sponsor',
    device: <TabletOutline />,
  },
];

/** How many learners an organisation's space grows to, as the case study's spacing scale. */
const SCALE: [string, number][] = [
  ['5', 8],
  ['20', 16],
  ['50', 24],
  ['100', 32],
  ['250', 40],
  ['500', 64],
  ['1k', 80],
  ['2.5k', 96],
  ['5k', 120],
];

/** A filled tab label sitting on a rule. */
function TabRule({ label }: { label: string }) {
  return (
    <div className="flex items-end">
      <span className="rounded-t-[10px] bg-primary px-4 py-1.5 font-display text-[13px] font-semibold text-white">{label}</span>
      <span className="h-[2px] flex-1 bg-line-heavy" />
    </div>
  );
}

/** For organisations: the four ways an organisation joins, in the case study's grid-page layout. */
export default function OrganisationsPage() {
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main className="overflow-x-clip">
        <section className="px-4 pb-10 pt-12 sm:px-8 sm:pt-16">
          <SectionTitle
            eyebrow="For organisations"
            title="Bring your organisation."
            text="Schools, companies, content partners and sponsors all run on the same platform, each in their own space. Setting one up takes a few minutes from your account."
          />
          <Reveal className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {KINDS.map((k) => (
              <a
                key={k.id}
                data-stagger
                href={`#${k.id}`}
                className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-[14px] font-semibold text-link ring-1 ring-line hover:ring-primary"
              >
                {k.tag}
              </a>
            ))}
          </Reveal>
        </section>

        <div className="mx-auto max-w-5xl space-y-16 px-4 pb-16 sm:px-8">
          {KINDS.map((k, i) => {
            const deviceFirst = i % 2 === 0;
            return (
              <section key={k.id} id={k.id} className="scroll-mt-8 space-y-10" aria-labelledby={`${k.id}-title`}>
                <TabRule label={k.tag} />
                <div className="grid items-center gap-10 md:grid-cols-2">
                  <Reveal className={deviceFirst ? '' : 'md:order-2'}>{k.device}</Reveal>
                  <Reveal className="space-y-5 text-center md:text-left" delay={120}>
                    <div>
                      <h2 id={`${k.id}-title`} className="text-[30px] font-bold leading-tight text-ink">
                        {k.title}
                      </h2>
                      <p className="text-[14.5px] text-faint">{k.subtitle.replace('{domain}', siteDomain())}</p>
                    </div>
                    <dl className="mx-auto max-w-sm space-y-2.5 md:mx-0">
                      {k.facts.map(([key, value]) => (
                        <div key={key} data-stagger className="flex flex-wrap justify-center gap-x-2 text-[15.5px] md:justify-start">
                          <dt className="text-ink">{key}</dt>
                          <dd className="text-link">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mx-auto max-w-sm text-[13.5px] leading-relaxed text-muted md:mx-0">{k.status}</p>
                    <ButtonLink href={`/orgs/start?kind=${k.kind}`} className="mx-auto sm:w-auto sm:px-7 md:mx-0">
                      {k.cta}
                    </ButtonLink>
                  </Reveal>
                </div>
              </section>
            );
          })}

          <section className="space-y-10" aria-labelledby="scale-title">
            <TabRule label="Grows with you" />
            <div className="space-y-2 text-center md:text-left">
              <h2 id="scale-title" className="text-[30px] font-bold leading-tight text-ink">
                From five learners to five thousand
              </h2>
              <p className="text-[14.5px] text-faint">The same space, the same tools, whatever your size.</p>
            </div>
            <Reveal className="flex items-end justify-between gap-1.5 overflow-x-auto pb-1 sm:gap-3">
              {SCALE.map(([label, size]) => (
                <div key={label} data-stagger className="flex shrink-0 flex-col items-center gap-2">
                  <span
                    className="block rounded-[4px] bg-primary"
                    style={{
                      width: `clamp(8px, ${size / 12}vw, ${size}px)`,
                      height: `clamp(8px, ${size / 12}vw, ${size}px)`,
                    }}
                  />
                  <span className="font-mono text-[11px] text-link">{label}</span>
                </div>
              ))}
            </Reveal>
          </section>
        </div>

        <section className="bg-forest px-4 py-16 text-center text-white sm:px-8">
          <Reveal className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-[30px] font-extrabold leading-tight text-white">Start with your own account.</h2>
            <p className="text-[15px] leading-relaxed text-white/75">
              Organisations are created from a personal account, so you can use it to learn too. It takes two minutes.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/orgs/start" className="sm:w-auto sm:px-7">
                Set up an organisation
              </ButtonLink>
              <ButtonLink href="/signup" variant="secondary" className="sm:w-auto sm:px-7">
                Create my account
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
