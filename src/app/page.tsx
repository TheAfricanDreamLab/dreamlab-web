import { HeroScene } from '@/components/landing/hero-scene';
import { Reveal } from '@/components/landing/motion';
import { FactPill, Journey, SectionTitle, Showcase, Steps, WaysIn } from '@/components/landing/sections';
import { type Milestone, Timeline } from '@/components/landing/timeline';
import { PublicFooter, SiteNav } from '@/components/site/public-header';
import { Brand, ButtonLink } from '@/components/ui/primitives';
import { getClaims } from '@/lib/session';

const AUDIENCES = [
  {
    tag: 'Learners',
    title: 'Learn on your own',
    text: 'Create a free account with your email or phone and start. No school or employer needed.',
    cta: { label: 'Start learning', href: '/signup' },
    tone: 'green' as const,
  },
  {
    tag: 'Schools & academies',
    title: 'Run your cohorts',
    text: 'Admissions, lessons, credit hours and residencies in one place, under your own name and address.',
    cta: { label: 'Bring your school', href: '/orgs/start?kind=institution' },
    tone: 'gold' as const,
  },
  {
    tag: 'Companies & teams',
    title: 'Grow your people',
    text: 'Invite your team, assign learning, and see progress. Your space is ready the moment you sign up.',
    cta: { label: 'Set up your team', href: '/orgs/start?kind=enterprise' },
    tone: 'ink' as const,
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Create your account',
    text: 'Your name, an email or phone, and a password. Two minutes.',
  },
  {
    n: '2',
    title: 'Confirm it’s you',
    text: 'Type the 6-digit code we send. That’s the whole check.',
  },
  {
    n: '3',
    title: 'Begin',
    text: 'Start a course, or accept an invitation from your school or team.',
  },
];

/** The programme's fifteen weeks, on the timeline. */
const MILESTONES: Milestone[] = [
  {
    when: 'Weeks 1–4',
    title: 'Life Architecture',
    credits: '25 credits',
    text: 'Problem solving, critical thinking, emotional intelligence, character and systems thinking.',
  },
  {
    when: 'Weeks 5–8',
    title: 'Builder’s Architecture',
    credits: '20 credits',
    text: 'Communication, negotiation, financial intelligence, personal branding and collaboration.',
  },
  {
    when: 'Weeks 9–10',
    title: 'Your elective',
    credits: '10 credits',
    text: 'Content creation, artificial intelligence or digital marketing: your choice.',
  },
  {
    when: 'Weeks 11–14',
    title: 'Dream Residency',
    credits: '45 credits',
    text: 'Seven stages from Dream Definition to a working prototype, with mentors and faculty.',
  },
  {
    when: 'Week 15',
    title: 'Demo and graduation',
    credits: 'Credential',
    text: 'Present at the Final Demonstration and graduate with a credential anyone can check.',
  },
];

export default async function LandingPage() {
  const signedIn = Boolean(await getClaims());
  return (
    <div className="min-h-dvh">
      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
        <Brand href={signedIn ? '/app' : '/'} />
        <SiteNav
          links={[
            { href: '/courses', label: 'Courses' },
            { href: '/programs/the-african-dream-lab', label: 'The programme' },
            { href: '/organisations', label: 'For organisations' },
            ...(signedIn ? [] : [{ href: '/login', label: 'Sign in' }]),
          ]}
          cta={signedIn ? { href: '/app', label: 'Open my space' } : { href: '/signup', label: 'Get started' }}
          signOut={signedIn}
        />
      </header>

      <main>
        {/* Without JavaScript nothing animates: show every section at once. */}
        <noscript>
          <style>{'.dl-reveal{visibility:visible!important}'}</style>
        </noscript>

        <section className="relative mx-auto grid max-w-6xl items-center gap-10 overflow-x-clip px-4 pb-16 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[1fr_1.05fr] lg:pb-24 lg:pt-14">
          <div className="animate-rise space-y-6 text-center lg:text-left">
            <span className="inline-flex rounded-full px-4 py-1.5 font-display text-[14px] font-semibold text-link ring-2 ring-primary/60">
              Born from TADIS · Learn · Build · Lead
            </span>
            <h1 className="text-[40px] font-extrabold leading-[1.04] min-[375px]:text-[46px] sm:text-[64px]">
              Learn to build
              <br />
              <span className="text-link">the Africa you want.</span>
            </h1>
            <p className="mx-auto max-w-xl text-[17px] leading-relaxed text-body lg:mx-0">
              The African Dream Lab is a learning management platform that grew out of TADIS, the African Dream Network International Summit. Take courses on
              your own, run cohorts for your school or academy, or train your team, and earn credentials for what you finish.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <ButtonLink href="/signup" className="sm:w-auto sm:px-7">
                Start learning, it’s free
              </ButtonLink>
              <ButtonLink href="/courses" variant="secondary" className="sm:w-auto sm:px-7">
                Explore courses
              </ButtonLink>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Sign up with email, phone or Google</p>
          </div>
          <HeroScene />
        </section>

        <FactPill />
        <Journey />
        <WaysIn audiences={AUDIENCES} />
        <Showcase />

        <section id="weeks" className="scroll-mt-8 px-4 py-20 sm:px-8">
          <SectionTitle
            n="04"
            eyebrow="The programme"
            title="Fifteen weeks that change the plan into a business."
            text="The African Dream Lab runs in cohorts: a class that starts together, meets every week and graduates together."
          />
          <Reveal className="mx-auto mt-14 max-w-5xl">
            <Timeline milestones={MILESTONES} />
          </Reveal>
          <div className="mt-10 text-center">
            <ButtonLink href="/programs/the-african-dream-lab" variant="secondary" className="mx-auto sm:w-auto sm:px-7">
              See the programme and its cohorts
            </ButtonLink>
          </div>
        </section>

        <Steps steps={STEPS} />

        <section className="bg-forest text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal className="space-y-3 text-center lg:text-left">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold">Born from TADIS</p>
              <h2 className="text-[30px] font-extrabold leading-tight text-white">Dream. Lead. Transform.</h2>
              <p className="text-[15px] leading-relaxed text-white/75">
                TADIS, the African Dream Network International Summit, brings emerging African leaders together to dream, lead and transform. The African Dream
                Lab is where that learning carries on after the summit: courses and cohorts, mentors who guide the work, and alumni who come back to teach the
                next group.
              </p>
              <div className="flex justify-center pt-3 lg:justify-start">
                <ButtonLink href="/signup" className="sm:w-auto sm:px-7">
                  Start learning, it’s free
                </ButtonLink>
              </div>
            </Reveal>
            <Reveal as="div" className="grid gap-3 self-end">
              {[
                ['Learn', 'Courses and programmes you can take at your own pace or with a cohort.'],
                ['Build', 'Projects, a residency and feedback from people who have done the work.'],
                ['Lead', 'Credentials for what you finish, and a network that stays with you.'],
              ].map(([t, d]) => (
                <div
                  key={t}
                  data-stagger
                  className="flex flex-col items-center gap-1 border-t border-white/15 pt-4 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left"
                >
                  <span className="shrink-0 font-display text-[20px] font-bold text-gold sm:w-16">{t}</span>
                  <span className="text-[14px] leading-relaxed text-white/75">{d}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
