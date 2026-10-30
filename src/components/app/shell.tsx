'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';

/*
 * The signed-in app shell: a sidebar on laptops and up (collapsible to icons), and the same sidebar
 * as a slide-in drawer from a menu button on tablets and phones. One copy of the navigation in the
 * page, so screen readers and tests meet it once.
 */

export const SIDEBAR_COOKIE = 'dl_sidebar';

type Shell = { collapsed: boolean; toggleCollapsed: () => void; closeDrawer: () => void };
const ShellContext = createContext<Shell>({ collapsed: false, toggleCollapsed: () => undefined, closeDrawer: () => undefined });

export function AppShell({ initialCollapsed, sidebar, topbar, children }: { initialCollapsed: boolean; sidebar: ReactNode; topbar: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // The drawer is open for the page it was opened on; following a link closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const drawer = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setOpenOn(null);
    menuButton.current?.focus();
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      document.cookie = `${SIDEBAR_COOKIE}=${c ? 'open' : 'collapsed'}; path=/; max-age=31536000; samesite=lax`;
      return !c;
    });
  }, []);

  // While the drawer is open: Escape closes it, the page behind doesn't scroll, focus starts inside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLElement>('a[href], button, summary')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, closeDrawer]);

  // A full-page message (signed in on an organisation's site you don't belong to), or a portfolio
  // laid out for paper: no app chrome.
  if (path === '/app/no-access' || path.endsWith('/portfolio/print')) return <>{children}</>;

  return (
    <ShellContext.Provider value={{ collapsed, toggleCollapsed, closeDrawer }}>
      <div className="dl-shell min-h-dvh" data-collapsed={collapsed ? 'true' : 'false'}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-ink">
          Skip to content
        </a>
        <div
          ref={drawer}
          id="app-sidebar"
          // Below 1024px it is a dialog-like drawer: hidden (and unfocusable) until opened.
          aria-label={open ? 'Menu' : undefined}
          role={open ? 'dialog' : undefined}
          aria-modal={open ? true : undefined}
          className={cx(
            'dl-sidebar fixed inset-y-0 left-0 z-40 flex w-[min(20rem,calc(100vw-2.5rem))] flex-col bg-card/95 shadow-[var(--shadow-panel)] ring-1 ring-line backdrop-blur-xl transition-[transform,visibility,width] duration-300',
            'lg:inset-y-3 lg:left-3 lg:visible lg:translate-x-0 lg:rounded-[28px] lg:bg-card/80',
            open ? 'visible translate-x-0' : 'invisible -translate-x-full',
          )}
        >
          {sidebar}
        </div>
        {open && <div aria-hidden className="fixed inset-0 z-30 bg-forest/35 backdrop-blur-[2px] lg:hidden" onClick={closeDrawer} />}

        <div className="dl-shell-main transition-[padding] duration-300">
          <div className="sticky top-0 z-20 border-b border-line/80 bg-page/75 backdrop-blur-xl lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
            <div className="flex w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 lg:px-8 lg:pt-4 2xl:px-12">
              <button
                ref={menuButton}
                type="button"
                onClick={() => setOpenOn(path)}
                aria-controls="app-sidebar"
                aria-expanded={open}
                aria-label="Open the menu"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-ink ring-1 ring-line-strong hover:ring-line-heavy lg:hidden"
              >
                <Icon name="menu" />
              </button>
              {topbar}
            </div>
          </div>
          <main id="main" tabIndex={-1} className="w-full px-4 pb-12 pt-4 focus:outline-none sm:px-6 lg:px-8 lg:pt-6 2xl:px-12">
            {/* Keyed by the path, so each page eases in as you move between them. */}
            <div key={path} className="dl-page">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}

/** Collapse to icons (laptops) or close the drawer (tablets and phones). */
export function SidebarControls() {
  const { collapsed, toggleCollapsed, closeDrawer } = useContext(ShellContext);
  return (
    <>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-pressed={collapsed}
        aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
        title={collapsed ? 'Expand' : 'Collapse'}
        className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-muted ring-1 ring-line hover:bg-surface hover:text-ink lg:grid"
      >
        <Icon name={collapsed ? 'expand' : 'collapse'} className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={closeDrawer}
        aria-label="Close the menu"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink ring-1 ring-line-strong hover:bg-surface lg:hidden"
      >
        <Icon name="close" />
      </button>
    </>
  );
}

function useActive(href: string, exact: boolean) {
  const path = usePathname();
  return exact ? path === href : path === href || path.startsWith(`${href}/`);
}

/** A sidebar item: a round icon chip and a label. The current page is a dark pill. */
export function SideLink({ href, label, icon, exact = false }: { href: string; label: string; icon: IconName; exact?: boolean }) {
  const active = useActive(href, exact);
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'dl-side-item flex min-h-11 items-center gap-3 rounded-full py-1 pl-1 pr-3 text-[14.5px] font-semibold transition-colors',
        active ? 'bg-forest text-white shadow-[0_8px_20px_rgba(10,61,41,0.25)]' : 'text-body hover:bg-surface hover:text-ink',
      )}
    >
      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', active ? 'bg-white/15 text-white' : 'bg-surface text-link ring-1 ring-line')}>
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="dl-side-text min-w-0 truncate">{label}</span>
    </Link>
  );
}

/** A small round quick-action at the foot of the sidebar. */
export function QuickAction({ href, label, icon }: { href: string; label: string; icon: IconName }) {
  return (
    <Link href={href} aria-label={label} title={label} className="grid h-11 w-11 place-items-center rounded-full bg-surface text-link ring-1 ring-line hover:bg-success-tint hover:ring-success-line">
      <Icon name={icon} className="h-[18px] w-[18px]" />
    </Link>
  );
}
