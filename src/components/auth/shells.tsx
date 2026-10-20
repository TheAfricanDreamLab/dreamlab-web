import type { ReactNode } from 'react';
import { BackLink } from '@/components/ui/nav';
import { Brand, Eyebrow } from '@/components/ui/primitives';
import { currentTenant } from '@/lib/tenant';

const PILLARS = [
  { value: 'Learn', label: 'Courses & programmes' },
  { value: 'Build', label: 'Projects & feedback' },
  { value: 'Lead', label: 'Certificates & network' },
];

type Back = { href: string; label: string };
const HOME: Back = { href: '/', label: 'home' };

/** Split screen from the design: forest panel with the promise on the left, the form on the right. */
export async function AuthShell({
  eyebrow,
  title,
  intro,
  panelTitle = 'Dream. Lead. Transform.',
  panelText = 'The learning platform born from TADIS, the African Dream Network International Summit. Courses, cohorts and mentors, for a self-sustaining continent.',
  back = HOME,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  panelTitle?: string;
  panelText?: string;
  /** The way out, shown above the heading. */
  back?: Back;
  children: ReactNode;
}) {
  const tenant = await currentTenant();
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8 sm:px-8">
      <div className="grid w-full max-w-[1080px] overflow-hidden rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-panel)] ring-1 ring-line lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(120%_80%_at_20%_10%,#0f6a49_0%,#0a3d29_60%,#072b1d_100%)] p-10 text-white lg:flex">
          <div aria-hidden className="absolute -left-16 top-24 h-72 w-72 rounded-full bg-white/[0.04] ring-1 ring-white/10" />
          <div aria-hidden className="absolute bottom-40 right-[-60px] h-48 w-48 rounded-full bg-gold/10" />
          <div className="relative">
            <Brand light subtitle={tenant ? tenant.name : 'Dream Lab OS'} />
          </div>
          <div className="relative space-y-4">
            <h2 className="text-[34px] font-extrabold leading-[1.08] text-white">{panelTitle}</h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/75">{panelText}</p>
            <dl className="grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {PILLARS.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-2xl font-bold text-white">{s.value}</dd>
                  <dd className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:py-16">
          <div className="w-full max-w-[400px] animate-rise space-y-6">
            <div className="lg:hidden">
              <Brand subtitle={tenant ? tenant.name : undefined} />
            </div>
            <BackLink href={back.href} label={back.label} className="-ml-0.5" />
            <header className="space-y-2">
              <Eyebrow>{tenant ? `${eyebrow} · ${tenant.name}` : eyebrow}</Eyebrow>
              <h1 className="text-[30px] font-extrabold leading-tight">{title}</h1>
              {intro && <div className="text-[14.5px] leading-relaxed text-muted">{intro}</div>}
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

/** A single focused card: codes, resets, invitations, results. */
export function CenteredCard({
  eyebrow,
  eyebrowTone = 'muted',
  title,
  intro,
  children,
  width = 'narrow',
  back = HOME,
}: {
  eyebrow?: string;
  eyebrowTone?: 'muted' | 'gold' | 'green' | 'danger';
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  width?: 'narrow' | 'wide';
  /** The way out: home by default, or the previous step. */
  back?: Back;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(80%_60%_at_20%_0%,#e6f4ec_0%,transparent_60%),radial-gradient(60%_50%_at_100%_100%,#e2f1f2_0%,transparent_60%)] px-4 py-10">
      <div className={`w-full ${width === 'wide' ? 'max-w-[520px]' : 'max-w-[440px]'} animate-rise space-y-6 rounded-[var(--radius-panel)] bg-surface p-7 shadow-[var(--shadow-panel)] ring-1 ring-line sm:p-9`}>
        <div className="flex flex-col items-start gap-3">
          <Brand />
          <BackLink href={back.href} label={back.label} className="-ml-0.5" />
        </div>
        <header className="space-y-2">
          {eyebrow && <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>}
          <h1 className="text-[28px] font-extrabold leading-tight">{title}</h1>
          {intro && <div className="text-[14.5px] leading-relaxed text-muted">{intro}</div>}
        </header>
        {children}
      </div>
    </main>
  );
}
