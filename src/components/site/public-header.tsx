import Link from 'next/link';
import { Dropdown, MenuIcon } from '@/components/ui/dropdown';
import { Brand, ButtonLink } from '@/components/ui/primitives';
import { getClaims } from '@/lib/session';

/** Header for public pages (catalogue, course and programme pages): works signed in and signed out. */
export async function PublicHeader({ next }: { next?: string }) {
  const signedIn = Boolean(await getClaims());
  const login = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  const signup = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';
  return (
    <header className="relative border-b border-line bg-page/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Brand href={signedIn ? '/app' : '/'} />
        <SiteNav
          links={[
            { href: '/courses', label: 'Courses' },
            { href: '/programs/the-african-dream-lab', label: 'The programme' },
            { href: '/organisations', label: 'For organisations' },
            ...(signedIn ? [{ href: '/app/learning', label: 'My learning' }] : [{ href: login, label: 'Sign in' }]),
          ]}
          cta={signedIn ? { href: '/app', label: 'My space' } : { href: signup, label: 'Get started' }}
          signOut={signedIn}
        />
      </div>
    </header>
  );
}

type SiteLink = { href: string; label: string };

/**
 * The public navigation: inline links from 1024px up, a menu button below (the brand, four links and
 * the button don't fit side by side on phones and small tablets).
 */
export function SiteNav({ links, cta, signOut = false }: { links: SiteLink[]; cta: SiteLink; /** Signed in: offer sign-out too. */ signOut?: boolean }) {
  return (
    <>
      <nav className="hidden items-center gap-1 text-[14px] font-semibold lg:flex lg:gap-3" aria-label="Site">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center px-2 text-body hover:text-ink">
            {l.label}
          </Link>
        ))}
        <ButtonLink href={cta.href} className="ml-1 h-11 px-4 text-[14px]">
          {cta.label}
        </ButtonLink>
        {signOut && (
          <form action="/auth/logout" method="post">
            <button type="submit" className="inline-flex min-h-11 items-center px-2 text-body hover:text-ink">
              Sign out
            </button>
          </form>
        )}
      </nav>
      <Dropdown
        className="lg:hidden"
        summaryLabel="Menu"
        summaryClassName="grid h-11 w-11 place-items-center rounded-full bg-card text-ink ring-1 ring-line-strong"
        summary={<MenuIcon />}
        panelClassName="absolute inset-x-3 top-full z-40 mt-1 rounded-[var(--radius-card)] bg-card p-2 shadow-[var(--shadow-panel)] ring-1 ring-line"
      >
        <nav aria-label="Site" className="grid gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-12 items-center rounded-lg px-3 text-[15px] font-semibold text-ink hover:bg-surface">
              {l.label}
            </Link>
          ))}
          <ButtonLink href={cta.href} className="mt-1 w-full">
            {cta.label}
          </ButtonLink>
          {signOut && (
            <form action="/auth/logout" method="post">
              <button type="submit" className="flex min-h-12 w-full items-center rounded-lg px-3 text-left text-[15px] font-semibold text-danger-ink hover:bg-danger-tint">
                Sign out
              </button>
            </form>
          )}
        </nav>
      </Dropdown>
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center text-[13.5px] text-muted sm:flex-row sm:justify-between sm:px-6 sm:py-10 sm:text-left">
      <span>© {new Date().getFullYear()} The African Dream Network</span>
      <nav className="-mx-2 flex flex-wrap justify-center gap-x-1 sm:gap-x-3" aria-label="Footer">
        <Link href="/courses" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
          Courses
        </Link>
        <Link href="/organisations" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
          For organisations
        </Link>
        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
          Terms
        </Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
          Privacy
        </Link>
      </nav>
    </footer>
  );
}
