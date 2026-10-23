import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ActiveOrgProvider } from '@/components/app/org-binding';
import { OrgSwitcher } from '@/components/app/org-switcher';
import { AppShell, QuickAction, SIDEBAR_COOKIE, SideLink, SidebarControls } from '@/components/app/shell';
import { Dropdown } from '@/components/ui/dropdown';
import { Icon, type IconName } from '@/components/ui/icons';
import { ButtonLink, LogoMark } from '@/components/ui/primitives';
import { initials } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

type Item = { href: string; label: string; icon: IconName; show: boolean; exact?: boolean };

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  const active = activeMembership(me);
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'collapsed';
  const contact = me.user.email ?? me.user.phone;

  const learning: Item[] = [
    { href: '/app', label: 'Home', icon: 'home', show: true, exact: true },
    { href: '/app/learning', label: 'My learning', icon: 'book', show: true },
    { href: '/app/programme', label: 'My programme', icon: 'calendar', show: true },
    { href: '/app/journal', label: 'Journal', icon: 'journal', show: true },
    { href: '/courses', label: 'Courses', icon: 'compass', show: true },
    { href: '/app/account', label: 'Account', icon: 'user', show: true },
  ];
  const organisation: Item[] = [
    { href: '/app/members', label: 'People', icon: 'users', show: Boolean(active) && can(me, 'org.members.read') },
    { href: '/app/cohorts', label: 'Cohorts', icon: 'spark', show: Boolean(active) && !me.platformAdmin && can(me, 'cohort.manage') },
    { href: '/app/grading', label: 'Grading', icon: 'check', show: Boolean(active) && !me.platformAdmin && can(me, 'submission.grade') },
    { href: '/app/authoring', label: 'Authoring', icon: 'grid', show: Boolean(active) && !me.platformAdmin && (can(me, 'course.content.edit') || can(me, 'course.publish')) },
    { href: '/app/roles', label: 'Roles', icon: 'shield', show: Boolean(active) && can(me, 'org.roles.manage') },
    { href: '/app/settings', label: 'Sign-in & security', icon: 'lock', show: Boolean(active) && can(me, 'org.security.manage') },
  ].filter((i) => i.show) as Item[];
  const platform: Item[] = me.platformAdmin
    ? [
        { href: '/app/admin', label: 'Overview', icon: 'chart', show: true, exact: true },
        { href: '/app/admin/users', label: 'People', icon: 'users', show: true },
        { href: '/app/admin/organisations', label: 'Organisations', icon: 'building', show: true },
        { href: '/app/admin/catalog', label: 'Catalog', icon: 'grid', show: true },
        { href: '/app/cohorts', label: 'Cohorts', icon: 'spark', show: true },
        { href: '/app/grading', label: 'Grading', icon: 'check', show: true },
        { href: '/app/authoring', label: 'Authoring', icon: 'journal', show: true },
      ]
    : [];

  const group = (title: string, items: Item[]) => (
    <div className="space-y-1">
      <p className="dl-side-text px-3 pb-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{title}</p>
      {items.map((i) => (
        <SideLink key={i.href} href={i.href} label={i.label} icon={i.icon} exact={i.exact} />
      ))}
    </div>
  );

  const sidebar = (
    <>
      {/* The banner: who you are working as. */}
      <header className="space-y-3 p-3 pb-2">
        <div className="flex items-center gap-2">
          <Link href="/app" aria-label="The African Dream Lab: home" className="dl-side-item flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full">
            <LogoMark size={40} />
            <span className="dl-side-text min-w-0 truncate font-display text-[15px] font-bold leading-tight text-ink">The African Dream Lab</span>
          </Link>
          <SidebarControls />
        </div>
        <OrgSwitcher
          current={active ? { id: active.org.id, name: active.org.name, status: active.org.status } : null}
          options={me.memberships
            .filter((m) => m.status === 'active' && m.org.status !== 'suspended')
            .map((m) => ({ id: m.org.id, name: m.org.name, status: m.org.status, kind: m.org.kinds[0] ?? '' }))}
        />
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-3">
        <nav aria-label="Main" className="space-y-5">
          {group('Learning', learning)}
          {organisation.length > 0 && group('Organisation', organisation)}
        </nav>
        {platform.length > 0 && <nav aria-label="Platform admin">{group('Platform admin', platform)}</nav>}
      </div>

      <div className="space-y-3 border-t border-line p-3">
        <div className="dl-side-stack flex items-center justify-center gap-2">
          <QuickAction href="/app#recent-activity" label="Notifications: recent activity" icon="bell" />
          <QuickAction href="/app/journal" label="Journal" icon="journal" />
          <QuickAction href="/app/account" label="Settings" icon="gear" />
        </div>
        <div className="dl-side-item flex items-center gap-2.5 rounded-[18px] bg-surface p-1.5 ring-1 ring-line">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest font-display text-[14px] font-bold text-white">
            {initials(me.user.fullName)}
          </span>
          <span className="dl-side-text min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[14px] font-semibold text-ink">{me.user.fullName}</span>
            {contact && <span className="block truncate text-[12.5px] text-muted">{contact}</span>}
          </span>
          <Dropdown
            className="dl-side-hide relative shrink-0"
            summaryLabel="Your account menu"
            summaryClassName="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-card hover:text-ink"
            summary={<Icon name="dots" />}
            panelClassName="absolute bottom-full right-0 z-50 mb-2 w-[min(15rem,calc(100vw-3rem))] space-y-1 rounded-[var(--radius-card)] bg-card p-2 shadow-[var(--shadow-panel)] ring-1 ring-line"
          >
            <a href="/app/account" className="flex min-h-11 items-center rounded-lg px-3 text-[14.5px] text-body hover:bg-surface">
              Account and security
            </a>
            <form action="/auth/logout" method="post">
              <button type="submit" className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[14.5px] text-danger-ink hover:bg-danger-tint">
                Sign out
              </button>
            </form>
          </Dropdown>
        </div>
      </div>
    </>
  );

  const topbar = (
    <>
      <Link href="/app" aria-label="The African Dream Lab: home" className="shrink-0 lg:hidden">
        <LogoMark size={40} />
      </Link>
      <form action="/courses" method="get" role="search" className="relative hidden min-w-0 max-w-md flex-1 sm:block">
        <label htmlFor="shell-search" className="sr-only">
          Search courses
        </label>
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        <input
          id="shell-search"
          type="search"
          name="q"
          maxLength={80}
          placeholder="Search courses"
          className="h-11 w-full rounded-full bg-card/90 pl-11 pr-4 text-[15px] text-ink shadow-[0_4px_16px_rgba(10,61,41,0.06)] ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/courses" aria-label="Search courses" className="grid h-11 w-11 place-items-center rounded-full bg-card text-ink ring-1 ring-line-strong sm:hidden">
          <Icon name="search" />
        </Link>
        {/* A wrapper, so "hidden" doesn't fight the button's own display. */}
        <span className="hidden md:block">
          <ButtonLink href="/courses" variant="secondary" className="h-11 rounded-full px-5 text-[14px]">
            <Icon name="compass" className="h-[18px] w-[18px] text-link" /> Explore courses
          </ButtonLink>
        </span>
        <Dropdown
          className="relative shrink-0"
          summaryClassName="grid h-11 w-11 place-items-center rounded-full bg-success-tint font-display text-sm font-bold text-link ring-1 ring-success-line"
          summary={initials(me.user.fullName)}
          panelClassName="absolute right-0 z-30 mt-2 w-[min(16rem,calc(100vw-1.5rem))] space-y-1 rounded-[var(--radius-card)] bg-card p-2 shadow-[var(--shadow-card)] ring-1 ring-line"
        >
          <div className="px-3 py-2">
            <p className="break-words text-[14px] font-semibold text-ink">{me.user.fullName}</p>
            <p className="truncate text-[13px] text-muted">{contact}</p>
          </div>
          <a href="/app/account" className="flex min-h-11 items-center rounded-lg px-3 text-[14.5px] text-body hover:bg-surface">
            Account and security
          </a>
          <Link href="/app/journal" className="flex min-h-11 items-center rounded-lg px-3 text-[14.5px] text-body hover:bg-surface">
            My journal
          </Link>
          <Link href="/courses" className="flex min-h-11 items-center rounded-lg px-3 text-[14.5px] text-body hover:bg-surface">
            Explore courses
          </Link>
          <form action="/auth/logout" method="post">
            <button type="submit" className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[14.5px] text-danger-ink hover:bg-danger-tint">
              Sign out
            </button>
          </form>
        </Dropdown>
      </div>
    </>
  );

  return (
    <AppShell initialCollapsed={collapsed} sidebar={sidebar} topbar={topbar}>
      <ActiveOrgProvider orgId={active?.org.id ?? null}>{children}</ActiveOrgProvider>
    </AppShell>
  );
}
