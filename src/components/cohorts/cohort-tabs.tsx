import Link from 'next/link';
import { cx } from '@/components/ui/primitives';

type Tab = 'overview' | 'engagement' | 'funnel';

/**
 * Tabs across a cohort's staff pages. Teachers who don't manage the cohort see engagement only;
 * the classes page and the funnel are for cohort managers.
 */
export function CohortTabs({ cohortId, current, canManage }: { cohortId: string; current: Tab; canManage: boolean }) {
  const tabs: { key: Tab; href: string; label: string }[] = [
    ...(canManage ? [{ key: 'overview' as const, href: `/app/cohorts/${cohortId}`, label: 'Classes and learners' }] : []),
    { key: 'engagement', href: `/app/cohorts/${cohortId}/engagement`, label: 'Engagement' },
    ...(canManage ? [{ key: 'funnel' as const, href: `/app/cohorts/${cohortId}/funnel`, label: 'Completion funnel' }] : []),
  ];
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Cohort pages" className="-mx-1 overflow-x-auto border-b border-line">
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.key === current ? 'page' : undefined}
              className={cx(
                '-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-[14px] font-semibold',
                t.key === current ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
