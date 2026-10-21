'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from './primitives';

/**
 * A menu that opens from a button: a <details> element, so it works before JavaScript loads, plus
 * the behaviour people expect on a phone: it closes on a tap outside, on Escape, when one of its
 * links is followed, and when the page changes.
 *
 * `panelClassName` positions the panel. Phones: leave the <details> static (`staticBelow`) so the
 * panel can span the nearest positioned ancestor (the sticky header) instead of hanging off the
 * button and running off the screen.
 */
export function Dropdown({
  summary,
  summaryClassName,
  summaryLabel,
  panelClassName,
  className,
  children,
}: {
  summary: ReactNode;
  summaryClassName?: string;
  /** Accessible name for the button, when its visible content is not enough. */
  summaryLabel?: string;
  panelClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();

  // A new page: close.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [path]);

  useEffect(() => {
    const close = (focus: boolean) => {
      const d = ref.current;
      if (!d?.open) return;
      d.open = false;
      if (focus) d.querySelector('summary')?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <details ref={ref} className={cx('group/dropdown', className ?? 'relative')}>
      <summary aria-label={summaryLabel} className={cx('cursor-pointer list-none [&::-webkit-details-marker]:hidden', summaryClassName)}>
        {summary}
      </summary>
      <div
        className={panelClassName}
        onClick={(e) => {
          // Following a link inside closes the menu (same-page links included).
          if ((e.target as HTMLElement).closest('a') && ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}

/** The three-line menu icon, for "Menu" buttons. */
export function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cx('h-5 w-5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" className="group-open/dropdown:hidden" />
      <path d="M6 6l12 12M18 6L6 18" className="hidden group-open/dropdown:block" />
    </svg>
  );
}
