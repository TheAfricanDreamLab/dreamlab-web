import Link from 'next/link';
import { Fragment } from 'react';
import { cx } from './primitives';

/*
 * Ways out of a page. Every page shows one of these at the top: a back link to its parent, or a
 * breadcrumb trail where there is a hierarchy.
 */

export type Crumb = { label: string; href?: string };

/** "← Back to People". `label` is the parent's name. */
export function BackLink({ href, label, tone = 'default', className }: { href: string; label: string; tone?: 'default' | 'light'; className?: string }) {
  return (
    <Link
      href={href}
      data-nav="back"
      className={cx(
        'inline-flex min-h-9 items-center gap-1.5 rounded-lg py-1 pr-2 text-[13.5px] font-semibold hover:underline',
        tone === 'light' ? 'text-white/85 hover:text-white' : 'text-link',
        className,
      )}
    >
      <span aria-hidden>←</span> Back to {label}
    </Link>
  );
}

/** Courses / Problem Solving / Module 2. The last crumb is the current page. */
export function Breadcrumbs({ items, tone = 'default', className }: { items: Crumb[]; tone?: 'default' | 'light'; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cx('min-w-0', className)}>
      <ol className={cx('flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]', tone === 'light' ? 'text-white/75' : 'text-muted')}>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li className={cx('min-w-0', last && 'truncate')}>
                {c.href && !last ? (
                  <Link href={c.href} className={cx('font-semibold hover:underline', tone === 'light' ? 'text-white/90 hover:text-white' : 'text-link')}>
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={cx(last && (tone === 'light' ? 'text-white' : 'text-ink'))}>
                    {c.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden className="opacity-60">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
