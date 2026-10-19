import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavLink } from '@/components/app/nav-link';
import { getMe } from '@/lib/me';

const SECTIONS = [
  { href: '/app/admin', label: 'Overview', exact: true },
  { href: '/app/admin/users', label: 'People' },
  { href: '/app/admin/organisations', label: 'Organisations' },
  { href: '/app/admin/catalog', label: 'Catalog' },
];

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (!me.platformAdmin) redirect('/app');
  return (
    <div className="space-y-6">
      <nav className="-mt-4 flex gap-1 overflow-x-auto rounded-[var(--radius-field)] bg-card px-2 ring-1 ring-line" aria-label="Platform admin">
        {SECTIONS.map((s) => (
          <NavLink key={s.href} href={s.href} exact={s.exact}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
