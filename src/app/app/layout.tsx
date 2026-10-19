import type { ReactNode } from 'react';
import { logout } from '@/app/actions/auth';
import { NavLink } from '@/components/app/nav-link';
import { OrgSwitcher } from '@/components/app/org-switcher';
import { Brand } from '@/components/ui/primitives';
import { initials } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  const active = activeMembership(me);
  const nav = [
    { href: '/app', label: 'Home', show: true },
    { href: '/app/members', label: 'People', show: Boolean(active) && can(me, 'org.members.read') },
    { href: '/app/admin/organisations', label: 'Organisations', show: me.platformAdmin },
    { href: '/app/account', label: 'Account', show: true },
  ].filter((n) => n.show);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-page/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Brand />
          <div className="ml-auto flex items-center gap-2">
            <OrgSwitcher
              current={active ? { id: active.org.id, name: active.org.name, status: active.org.status } : null}
              options={me.memberships
                .filter((m) => m.status === 'active' && m.org.status !== 'suspended')
                .map((m) => ({ id: m.org.id, name: m.org.name, status: m.org.status, kind: m.org.kinds[0] ?? '' }))}
            />
            <details className="relative">
              <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full bg-success-tint font-display text-sm font-bold text-link ring-1 ring-success-line">
                {initials(me.user.fullName)}
              </summary>
              <div className="absolute right-0 mt-2 w-64 space-y-1 rounded-[var(--radius-card)] bg-card p-2 shadow-[var(--shadow-card)] ring-1 ring-line">
                <div className="px-3 py-2">
                  <p className="text-[14px] font-semibold text-ink">{me.user.fullName}</p>
                  <p className="truncate text-[12.5px] text-muted">{me.user.email ?? me.user.phone}</p>
                </div>
                <a href="/app/account" className="block rounded-lg px-3 py-2 text-[14px] text-body hover:bg-surface">
                  Account and security
                </a>
                <form action={logout}>
                  <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-[14px] text-danger-ink hover:bg-danger-tint">
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Main">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
