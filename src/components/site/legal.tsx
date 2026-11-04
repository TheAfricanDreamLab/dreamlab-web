import type { ReactNode } from 'react';
import { PageChrome } from '@/components/site/page-chrome';
import { Eyebrow } from '@/components/ui/primitives';

export const OPERATOR = 'African Dream Network';
export const PRIVACY_EMAIL = 'privacy@theafricandreamlab.com';
export const LEGAL_UPDATED = '3 November 2026';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** The terms and the privacy policy: a readable column with its sections listed at the top. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <PageChrome>
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-3">
          <Eyebrow tone="gold">Last updated {LEGAL_UPDATED}</Eyebrow>
          <h1 className="text-[32px] font-extrabold leading-tight sm:text-[40px]">{title}</h1>
          <div className="space-y-3 text-[15.5px] leading-relaxed text-body">{intro}</div>
        </header>
        <nav aria-label="On this page" className="rounded-[var(--radius-panel)] bg-surface p-5 ring-1 ring-line">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">On this page</p>
          <ol className="grid gap-1.5 text-[14.5px] sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-link hover:underline">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 space-y-3">
            <h2 className="text-[21px] font-bold text-ink">
              {i + 1}. {s.title}
            </h2>
            <div className="space-y-3 text-[15px] leading-relaxed text-body [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{s.body}</div>
          </section>
        ))}
      </article>
    </PageChrome>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${PRIVACY_EMAIL}`} className="font-semibold text-link hover:underline">
      {PRIVACY_EMAIL}
    </a>
  );
}
