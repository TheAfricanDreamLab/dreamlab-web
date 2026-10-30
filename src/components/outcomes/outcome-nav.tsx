import Link from 'next/link';
import { BackLink } from '@/components/ui/nav';
import { cx } from '@/components/ui/primitives';
import { outcomeHref } from '@/lib/outcomes';

const PAGES = [
  { page: 'residency', label: 'Residency' },
  { page: 'action-plan', label: 'Action plan' },
  { page: 'dream-score', label: 'Dream Score' },
  { page: 'portfolio', label: 'Portfolio' },
  { page: 'graduation', label: 'Graduation' },
] as const;
type Page = (typeof PAGES)[number]['page'];

/**
 * The way back (My programme for the learner; the cohort's board for faculty, who arrive with
 * ?cohort=) and the five outcome pages of one programme enrolment.
 */
export function OutcomeBack({ enrollmentId, cohortId, board, current }: { enrollmentId: string; cohortId: string | null; board: 'residency' | 'graduation'; current?: Page }) {
  const query = cohortId ? `?cohort=${cohortId}` : '';
  const here: Page = current ?? board;
  return (
    <div className="space-y-3">
      {cohortId ? (
        <BackLink href={`/app/cohorts/${cohortId}/${board}`} label={board === 'residency' ? 'Residency board' : 'Graduation board'} />
      ) : (
        <BackLink href="/app/programme" label="My programme" />
      )}
      <nav aria-label="Programme outcomes" className="flex flex-wrap gap-1">
        {PAGES.map((p) => (
          <Link
            key={p.page}
            href={`${outcomeHref(enrollmentId, p.page)}${query}`}
            aria-current={p.page === here ? 'page' : undefined}
            className={cx(
              'min-h-10 content-center rounded-full px-3.5 text-[13.5px] font-semibold ring-1',
              p.page === here ? 'bg-forest text-white ring-forest' : 'text-body ring-line hover:bg-surface',
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
