import Link from 'next/link';
import { LogoMark } from '@/components/ui/primitives';
import { Reveal, Tilt } from './motion';

/* Sections of the landing page below the hero (server-rendered; motion comes from the wrappers). */

/** A heading with a large faded number behind it, as in the case study's section titles. */
export function SectionTitle({ n, eyebrow, title, text, light = false }: { n?: string; eyebrow: string; title: string; text?: string; light?: boolean }) {
  return (
    <div className="relative mx-auto max-w-3xl text-center">
      {n && (
        <span
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-[-0.32em] -translate-x-1/2 font-display text-[110px] font-extrabold leading-none sm:text-[150px] ${light ? 'text-white/[0.07]' : 'text-ink/[0.06]'}`}
        >
          {n}
        </span>
      )}
      <p className={`relative font-display text-[13px] font-bold uppercase tracking-[0.16em] ${light ? 'text-gold' : 'text-link'}`}>{eyebrow}</p>
      <h2 className={`relative mt-3 text-[30px] font-extrabold leading-tight sm:text-[40px] ${light ? 'text-white' : ''}`}>{title}</h2>
      {text && <p className={`relative mx-auto mt-3 max-w-2xl text-[16px] leading-relaxed ${light ? 'text-white/75' : 'text-body'}`}>{text}</p>}
    </div>
  );
}

// ---------- the pill of facts ----------

export function FactPill() {
  const facts: [string, string][] = [
    ['Credits', '100 across four phases'],
    ['Length', '15 weeks, in cohorts'],
    ['Residency', '7 stages, with mentors'],
    ['Certificates', 'Anyone can verify them'],
  ];
  return (
    <Reveal className="mx-auto max-w-6xl px-4 sm:px-8">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[40px] bg-surface px-6 py-8 shadow-[var(--shadow-soft)] ring-1 ring-line sm:px-10 lg:grid-cols-4 lg:rounded-full">
        {facts.map(([k, v]) => (
          <div key={k} data-stagger className="text-center">
            <dt className="inline-block border-b-2 border-primary pb-0.5 font-display text-[19px] font-bold text-ink">{k}</dt>
            <dd className="mt-1.5 text-[14.5px] text-body">{v}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

// ---------- the journey: tilted numbered cards ----------

/** Two looks only, alternating: forest with gold labels, and white with green ones. */
const DARK = {
  bg: 'bg-forest',
  num: 'text-white',
  tone: 'text-gold',
  sub: 'text-white/75',
};
const LIGHT = {
  bg: 'bg-card ring-1 ring-line',
  num: 'text-forest',
  tone: 'text-link',
  sub: 'text-body',
};
const JOURNEY = [
  {
    n: '01',
    label: 'Apply',
    text: 'Six short stages, read by people, never by a robot alone.',
  },
  {
    n: '02',
    label: 'Learn',
    text: 'Courses with checks, projects and feedback.',
  },
  {
    n: '03',
    label: 'Live classes',
    text: 'Join your cohort online, twice a week.',
  },
  {
    n: '04',
    label: 'Residency',
    text: 'Build your dream in seven graded stages.',
  },
  {
    n: '05',
    label: 'Portfolio',
    text: 'Your best work, ready to share or print.',
  },
  {
    n: '06',
    label: 'Dream Score™',
    text: 'See your strengths grow, week by week.',
  },
  {
    n: '07',
    label: 'Graduate',
    text: 'A credential anyone can check, for life.',
  },
].map((s, i) => ({ ...s, ...(i % 2 === 0 ? DARK : LIGHT) }));
const ROTATE = ['-rotate-2', 'rotate-3', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-1', '-rotate-3'];

function JourneyCard({ step, rotate }: { step: (typeof JOURNEY)[number]; rotate: string }) {
  return (
    <div data-stagger className={rotate}>
      <Tilt max={14} className={`group rounded-[28px] ${step.bg} px-5 pb-5 pt-4 shadow-[0_18px_40px_rgba(10,61,41,0.22)]`}>
        <p
          className={`font-display text-[64px] font-extrabold leading-none tracking-tight sm:text-[84px] ${step.num}`}
          style={{ transform: 'translateZ(30px)' }}
        >
          {step.n}
        </p>
        <p
          className={`font-display text-[17px] font-extrabold uppercase tracking-[0.04em] sm:text-[19px] ${step.tone}`}
          style={{ transform: 'translateZ(40px)' }}
        >
          {step.label}
        </p>
        <p className={`mt-1 text-[13px] leading-snug ${step.sub}`}>{step.text}</p>
      </Tilt>
    </div>
  );
}

export function Journey() {
  return (
    <section id="journey" className="relative scroll-mt-8 overflow-x-clip px-4 py-20 sm:px-8">
      <Decor />
      <SectionTitle
        n="01"
        eyebrow="The journey"
        title="From application to graduation."
        text="Seven steps, one place. Every step is a page you can open, not a promise on a brochure."
      />
      <Reveal className="mx-auto mt-14 max-w-6xl">
        <div className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
          {JOURNEY.slice(0, 4).map((s, i) => (
            <JourneyCard key={s.n} step={s} rotate={ROTATE[i]!} />
          ))}
        </div>
        {/* The second row runs back, as in a snake: 07 06 05 on wide screens. */}
        <div className="mt-5 grid grid-cols-2 gap-5 sm:mt-6 sm:gap-6 lg:mx-auto lg:max-w-[75%] lg:grid-cols-3">
          {JOURNEY.slice(4).map((s, i) => (
            <div key={s.n} className={i === 0 ? 'lg:order-3' : i === 2 ? 'lg:order-1' : 'lg:order-2'}>
              <JourneyCard step={s} rotate={ROTATE[4 + i]!} />
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/** Faint rings behind a section, as in the case study. */
function Decor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg className="absolute -left-24 top-10 hidden h-[420px] w-[420px] text-line lg:block" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="198" stroke="currentColor" />
      </svg>
      <svg className="absolute -right-32 bottom-0 hidden h-[360px] w-[360px] text-line lg:block" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="198" stroke="currentColor" strokeDasharray="6 8" />
      </svg>
    </div>
  );
}

// ---------- who it is for: the orbit ----------

type Audience = {
  tag: string;
  title: string;
  text: string;
  cta: { label: string; href: string };
};

function AudienceBlock({ a, align }: { a: Audience; align: 'left' | 'right' | 'center' }) {
  const text = align === 'left' ? 'lg:text-right' : align === 'right' ? 'lg:text-left' : '';
  return (
    <div data-stagger className={`space-y-2 text-center ${text}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-ink">{a.tag}</p>
      <h3 className="text-[24px] font-bold">{a.title}</h3>
      <p className="text-[15px] leading-relaxed text-body">{a.text}</p>
      <Link href={a.cta.href} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-link transition-all hover:gap-2.5">
        {a.cta.label} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function Orbit() {
  return (
    <div aria-hidden className="relative mx-auto h-[260px] w-[260px] sm:h-[300px] sm:w-[300px]">
      <div className="dl-spin-slow absolute inset-0 rounded-full border-[14px] border-forest">
        {/* Dots centred on the ring's band (14px wide): 7px in from each edge, minus half a dot. */}
        {[
          'left-1/2 top-[-21px] -translate-x-1/2',
          'left-1/2 bottom-[-21px] -translate-x-1/2',
          'top-1/2 left-[-21px] -translate-y-1/2',
          'top-1/2 right-[-21px] -translate-y-1/2',
        ].map((pos) => (
          <span key={pos} className={`absolute h-7 w-7 rounded-full bg-primary ring-4 ring-white ${pos}`} />
        ))}
      </div>
      <div className="dl-spin-rev absolute inset-[22%] rounded-full border-[18px] border-success-line" />
      <div className="absolute inset-[36%] grid place-items-center rounded-full bg-white shadow-[var(--shadow-card)]">
        <LogoMark size={52} />
      </div>
      {/* Arrows out to the four sides. */}
      <svg
        className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)]"
        viewBox="0 0 100 100"
        fill="none"
        stroke="#159b62"
        strokeOpacity="0.5"
        strokeWidth="0.5"
      >
        <path d="M50 0v14M50 86v14M0 50h14M86 50h14" />
        <path d="M48 3l2-3 2 3M48 97l2 3 2-3M3 48L0 50l3 2M97 48l3 2-3 2" />
      </svg>
    </div>
  );
}

export function WaysIn({ audiences }: { audiences: Audience[] }) {
  const [learners, schools, teams] = audiences as [Audience, Audience, Audience];
  return (
    <section id="ways-in" className="scroll-mt-8 bg-surface/70 px-4 py-20 sm:px-8">
      <SectionTitle
        n="02"
        eyebrow="Who it’s for"
        title="One platform, every kind of learner."
        text="Learners on their own, schools running cohorts, and companies growing their people: all on the same platform, each in their own space."
      />
      <Reveal className="mx-auto mt-14 grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_auto_1fr]">
        <AudienceBlock a={learners} align="left" />
        <div data-stagger>
          <Orbit />
        </div>
        <AudienceBlock a={schools} align="right" />
        <div className="lg:col-span-3 lg:mx-auto lg:max-w-md">
          <AudienceBlock a={teams} align="center" />
        </div>
      </Reveal>
      <p className="mx-auto mt-10 max-w-2xl text-center text-[14px] text-muted">
        Content partners and sponsors can join too. They start with a short review so learners can trust what they see.
      </p>
    </section>
  );
}

// ---------- the product showcase ----------

export function Showcase() {
  const stages = ['Dream Definition', 'Research', 'Solution Design', 'Build', 'Testing', 'Impact', 'Demo'];
  const learners: [string, number[]][] = [
    ['Ada Obi', [4, 4, 3, 1, 0, 0, 0]],
    ['Tunde Bakare', [4, 4, 4, 3, 1, 0, 0]],
    ['Bola Ade', [4, 3, 2, 0, 0, 0, 0]],
    ['Chidi Eze', [4, 4, 4, 4, 3, 1, 0]],
  ];
  // Three statuses' worth of colour only: green approved, gold with faculty, grey otherwise.
  const chip = [
    'bg-line text-muted',
    'bg-surface text-body ring-1 ring-line',
    'bg-surface text-body ring-1 ring-line',
    'bg-gold-tint text-gold-ink',
    'bg-success-tint text-link',
  ];
  const chipLabel = ['—', 'Draft', 'Changes', 'With faculty', 'Approved'];
  return (
    <section id="how" className="scroll-mt-8 overflow-x-clip px-4 py-20 sm:px-8">
      <SectionTitle
        n="03"
        eyebrow="For faculty"
        title="Run the whole cohort from one board."
        text="Classes, attendance, grading, the residency and graduation: faculty see every learner at a glance and act in a click."
      />
      <Reveal className="relative mx-auto mt-14 max-w-5xl">
        {/* The diagonal slab behind the screen. */}
        <div
          aria-hidden
          className="absolute -right-4 -top-10 bottom-10 left-[30%] rounded-[36px] bg-[linear-gradient(135deg,#0a3d29,#159b62)] [clip-path:polygon(0_22%,100%_0,100%_100%,8%_100%)] sm:-right-10"
        />
        <Tilt max={4} className="relative rounded-[22px] bg-white p-3 shadow-[0_40px_90px_rgba(10,61,41,0.25)] ring-1 ring-line sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-line-heavy" />
            <span className="h-3 w-3 rounded-full bg-line-heavy" />
            <span className="h-3 w-3 rounded-full bg-line-heavy" />
            <span className="ml-3 truncate rounded-full bg-surface px-3 py-1 font-mono text-[11px] text-muted">
              learn.theafricandreamlab.com/app/cohorts/residency
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-2 pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold-ink">Cohort 01 · week 12</p>
              <p className="font-display text-[20px] font-bold text-ink">Residency board</p>
            </div>
            <div className="flex gap-2">
              {[
                ['Attendance', '92%'],
                ['Graded', '41'],
                ['On track', '18/20'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface px-3 py-1.5 text-right ring-1 ring-line">
                  <p className="text-[10px] text-muted">{k}</p>
                  <p className="font-display text-[15px] font-bold text-ink">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-1.5 text-left">
              <thead>
                <tr>
                  <th className="px-2 text-[11px] font-semibold text-muted">Learner</th>
                  {stages.map((s) => (
                    <th key={s} className="px-1 text-[11px] font-semibold text-muted">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {learners.map(([name, st]) => (
                  <tr key={name} className="bg-surface">
                    <td className="rounded-l-lg px-2 py-2 text-[13px] font-semibold text-ink">{name}</td>
                    {st.map((v, i) => (
                      <td key={i} className={`px-1 py-2 ${i === st.length - 1 ? 'rounded-r-lg' : ''}`}>
                        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${chip[v]}`}>{chipLabel[v]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tilt>
      </Reveal>
    </section>
  );
}

// ---------- how it works: outlined numbered cards ----------

export function Steps({ steps }: { steps: { n: string; title: string; text: string }[] }) {
  return (
    <section id="start" className="scroll-mt-8 px-4 py-20 sm:px-8">
      <SectionTitle
        n="05"
        eyebrow="Getting started"
        title="Three small steps. No paperwork."
        text="We keep sign-up short so the first thing you do here is learn, not fill in forms."
      />
      <Reveal className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} data-stagger>
            <Tilt max={8} className="h-full rounded-[22px] border-2 border-primary bg-card p-6">
              <div className="flex flex-col-reverse items-center gap-1 text-center md:flex-row md:items-start md:justify-between md:gap-4 md:text-left">
                <h3 className="text-[20px] font-bold text-link md:pt-2">{s.title}</h3>
                <span className="font-display text-[46px] font-extrabold leading-none text-gold">{s.n}</span>
              </div>
              <p className="mt-3 text-center text-[14.5px] leading-relaxed text-body md:text-left">{s.text}</p>
            </Tilt>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
