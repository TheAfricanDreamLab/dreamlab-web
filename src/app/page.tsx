import Link from 'next/link';
import { Brand, ButtonLink, Eyebrow, LogoMark } from '@/components/ui/primitives';
import { getClaims } from '@/lib/session';

const MODULES = ['Know yourself', 'Think clearly', 'Lead people', 'Lead change', 'Build value', 'Show your work'];

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
  { n: '1', title: 'Create your account', text: 'Your name, an email or phone, and a password. Two minutes.' },
  { n: '2', title: 'Confirm it’s you', text: 'Type the 6-digit code we send. That’s the whole check.' },
  { n: '3', title: 'Begin', text: 'Start a course, or accept an invitation from your school or team.' },
];

export default async function LandingPage() {
  const signedIn = Boolean(await getClaims());
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Brand href={signedIn ? '/app' : '/'} />
        <nav className="flex items-center gap-2 text-[14px] font-semibold sm:gap-6">
          <Link href="/courses" className="px-2 text-body hover:text-ink">
            Courses
          </Link>
          <a href="#ways-in" className="hidden text-body hover:text-ink sm:inline">
            Who it’s for
          </a>
          <a href="#how" className="hidden text-body hover:text-ink sm:inline">
            How it works
          </a>
          {signedIn ? (
            <ButtonLink href="/app" className="h-10 px-4 text-[14px]">
              Open my space
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="px-3 text-ink hover:text-link">
                Sign in
              </Link>
              <ButtonLink href="/signup" className="h-10 px-4 text-[14px]">
                Get started
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div className="animate-rise space-y-6">
            <Eyebrow tone="gold">Born from TADIS · The African Dream Network International Summit</Eyebrow>
            <h1 className="text-[44px] font-extrabold leading-[1.02] sm:text-[60px]">
              Learn to build
              <br />
              <span className="text-link">the Africa you want.</span>
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-body">
              The African Dream Lab is a learning management platform that grew out of TADIS. Take courses on your own, run cohorts for your
              school or academy, or train your team, and earn certificates for what you finish.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" className="sm:w-auto sm:px-7">
                Start learning, it’s free
              </ButtonLink>
              <ButtonLink href="/courses" variant="secondary" className="sm:w-auto sm:px-7">
                Explore courses
              </ButtonLink>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Sign up with email, phone or Google
            </p>
          </div>

          <div className="relative animate-rise [animation-delay:120ms]">
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(70%_70%_at_30%_20%,#e6f4ec,transparent_70%)]" />
            <div className="space-y-4 rounded-[var(--radius-panel)] bg-[radial-gradient(120%_90%_at_0%_0%,#0f6a49_0%,#0a3d29_65%)] p-6 text-white shadow-[var(--shadow-panel)] sm:p-7">
              <div className="flex items-center gap-3">
                <LogoMark size={32} />
                <div>
                  <p className="font-display text-[15px] font-bold">Leadership and adaptive capacity</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">Course · module 4 of 6</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">Up next · 12 min</p>
                <p className="mt-1 font-display text-[19px] font-bold leading-snug">Leading through change when the plan stops working.</p>
              </div>
              <ol className="flex items-center gap-1.5" aria-label="Module 4 of 6">
                {MODULES.map((s, i) => (
                  <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className={`h-2 w-full rounded-full ${i < 3 ? 'bg-gold' : i === 3 ? 'bg-primary ring-2 ring-primary/40' : 'bg-white/15'}`} />
                    <span className={`hidden text-center font-mono text-[8.5px] uppercase tracking-[0.06em] sm:block ${i === 3 ? 'text-white' : 'text-white/50'}`}>{s}</span>
                  </li>
                ))}
              </ol>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-4 text-ink">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-link">Your progress</p>
                  <p className="font-mono text-[26px] font-medium">58%</p>
                  <p className="text-[12px] text-muted">3 of 6 modules done</p>
                </div>
                <div className="rounded-2xl bg-gold-tint p-4 text-ink">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold-ink">On completion</p>
                  <p className="font-display text-[18px] font-bold text-gold-ink">Certificate</p>
                  <p className="text-[12px] text-gold-ink">Shareable, with a link anyone can check</p>
                </div>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Example course</p>
            </div>
          </div>
        </section>

        <section id="ways-in" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-20 sm:px-8">
          <div className="mb-8 max-w-2xl space-y-2">
            <Eyebrow>Three ways in</Eyebrow>
            <h2 className="text-[32px] font-extrabold leading-tight">One platform, every kind of learner.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <article key={a.tag} className="flex flex-col justify-between gap-6 rounded-[var(--radius-card)] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-line">
                <div className="space-y-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ${
                      a.tone === 'green' ? 'bg-success-tint text-link ring-success-line' : a.tone === 'gold' ? 'bg-gold-tint text-gold-ink ring-gold-line' : 'bg-surface text-ink ring-line'
                    }`}
                  >
                    {a.tag}
                  </span>
                  <h3 className="text-[21px] font-bold">{a.title}</h3>
                  <p className="text-[14.5px] leading-relaxed text-body">{a.text}</p>
                </div>
                <Link href={a.cta.href} className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-link hover:gap-2.5 transition-all">
                  {a.cta.label} <span aria-hidden>→</span>
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-5 text-[13.5px] text-muted">
            Content partners and sponsors can join too. They start with a short review so learners can trust what they see.
          </p>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-20 sm:px-8">
          <div className="grid gap-10 rounded-[var(--radius-panel)] bg-surface p-7 ring-1 ring-line sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="text-[30px] font-extrabold leading-tight">Three small steps. No paperwork.</h2>
              <p className="text-[14.5px] leading-relaxed text-muted">We keep sign-up short so the first thing you do here is learn, not fill in forms.</p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="space-y-2 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-bold text-white">{s.n}</span>
                  <h3 className="text-[16px] font-bold">{s.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-body">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-forest text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold">Born from TADIS</p>
              <h2 className="text-[30px] font-extrabold leading-tight text-white">Dream. Lead. Transform.</h2>
              <p className="text-[15px] leading-relaxed text-white/75">
                TADIS, the African Dream Network International Summit, brings emerging African leaders together to dream, lead and transform.
                The African Dream Lab is where that learning carries on after the summit: courses and cohorts, mentors who guide the work, and
                alumni who come back to teach the next group.
              </p>
            </div>
            <ul className="grid gap-3 self-end">
              {[
                ['Learn', 'Courses and programmes you can take at your own pace or with a cohort.'],
                ['Build', 'Projects, assignments and feedback from people who have done the work.'],
                ['Lead', 'Certificates for what you finish, and a network that stays with you.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-4 border-t border-white/15 pt-4">
                  <span className="w-16 shrink-0 font-display text-[20px] font-bold text-gold">{t}</span>
                  <span className="text-[14px] leading-relaxed text-white/75">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} The African Dream Network</span>
        <nav className="flex gap-5">
          <Link href="/courses" className="hover:text-ink">
            Courses
          </Link>
          <a href="/organisations" className="hover:text-ink">
            For organisations
          </a>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/login" className="hover:text-ink">
            Sign in
          </Link>
        </nav>
      </footer>
    </div>
  );
}
