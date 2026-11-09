'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui/primitives';

export const PROGRAMME_TABS = [
  { href: '/app/programme', label: 'Overview' },
  { href: '/app/programme/courses', label: 'Courses' },
  { href: '/app/programme/calendar', label: 'Calendar' },
  { href: '/app/programme/progress', label: 'Progress' },
  { href: '/app/programme/community', label: 'Community' },
] as const;

/** The My programme pages, as tabs. Scrolls sideways on its own on a narrow phone; the page doesn't. */
export function ProgrammeTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Programme pages" className="-mx-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1 px-1">
        {PROGRAMME_TABS.map((t) => {
          const here = path === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={here ? 'page' : undefined}
                className={cx(
                  'dl-press -mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-[14px] font-semibold transition-colors',
                  here ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
