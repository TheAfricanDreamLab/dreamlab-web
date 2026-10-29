import { Badge, Card, cx } from '@/components/ui/primitives';
import { calendarDate } from '@/lib/cohorts';
import { pct, type Portfolio, tenth, verifyHref } from '@/lib/outcomes';
import { DreamScoreBars } from './dream-score-charts';

/**
 * The Dream Portfolio's eight sections, assembled by the API from approved work. Used by the
 * learner's page, the print view and the public link; `print` drops cards and colour for paper.
 */
export function PortfolioView({ portfolio: p, print = false }: { portfolio: Portfolio; print?: boolean }) {
  const Box = print ? PrintBox : Card;
  return (
    <div className={cx('space-y-6', print && 'dl-print space-y-5')}>
      <header className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">Dream Portfolio · {p.programTitle}</p>
        <h1 className="text-[30px] font-extrabold">{p.learner.name}</h1>
        <p className="text-[14px] text-muted">
          {p.cohortName} · {p.hostOrgName} · Programme Score {pct(p.programmeScore)} · {tenth(p.creditsEarned)} credits earned · Dream Score {tenth(p.dreamScore.overall)} / 10
        </p>
        {p.graduatedAt && (
          <p className="text-[14px] text-ink">
            Graduated {calendarDate(p.graduatedAt.slice(0, 10))}
            {p.credentialCode && (
              <>
                {' '}
                · credential <a href={verifyHref(p.credentialCode)} className="font-mono font-semibold text-link hover:underline">{p.credentialCode}</a>
              </>
            )}
          </p>
        )}
      </header>

      {p.sections.map((s) => (
        <Box key={s.key}>
          <section aria-labelledby={`section-${s.key}`} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`section-${s.key}`} className="text-[19px] font-bold">
                {s.label}
              </h2>
              {!print && !s.complete && <Badge tone="neutral">Not complete yet</Badge>}
            </div>
            {s.key === 'dream_score' || s.key === 'competencies' ? (
              <DreamScoreBars dimensions={p.dreamScore.dimensions} />
            ) : s.entries.length === 0 ? (
              <p className="text-[14px] text-muted">Nothing here yet. This section fills in as work is approved.</p>
            ) : (
              <ul className="space-y-4">
                {s.entries.map((e, i) => (
                  <li key={`${e.title}-${i}`} className="space-y-1.5 break-inside-avoid">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[15.5px] font-semibold text-ink">{e.title}</h3>
                      {e.scorePct !== null && <span className="font-mono text-[13px] text-muted">{pct(e.scorePct)}</span>}
                    </div>
                    {e.detail && <p className="text-[13px] text-muted">{e.detail}</p>}
                    {e.text && <p className="whitespace-pre-line text-[14px] leading-relaxed text-body">{e.text}</p>}
                    {e.links.length > 0 && (
                      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
                        {e.links.map((l) => (
                          <li key={l.url}>
                            <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-link hover:underline">
                              {l.label}
                            </a>
                            {print && <span className="text-muted"> ({l.url})</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Box>
      ))}
    </div>
  );
}

function PrintBox({ children }: { children: React.ReactNode }) {
  return <div className="break-inside-avoid-page border-t border-line pt-4">{children}</div>;
}
