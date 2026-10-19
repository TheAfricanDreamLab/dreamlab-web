'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cx } from '@/components/ui/primitives';

export function NavLink({ href, children, exact = false }: { href: string; children: ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact || href === '/app' ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-semibold transition-colors',
        active ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink',
      )}
    >
      {children}
    </Link>
  );
}
