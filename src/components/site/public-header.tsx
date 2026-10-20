import Link from 'next/link';
import { Brand, ButtonLink } from '@/components/ui/primitives';
import { getClaims } from '@/lib/session';

/** Header for public pages (catalogue, course and programme pages): works signed in and signed out. */
export async function PublicHeader({ next }: { next?: string }) {
  const signedIn = Boolean(await getClaims());
  const login = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  const signup = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';
  return (
    <header className="border-b border-line bg-page/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Brand href={signedIn ? '/app' : '/'} />
        <nav className="flex items-center gap-1 text-[14px] font-semibold sm:gap-4" aria-label="Site">
          <Link href="/courses" className="px-2 text-body hover:text-ink">
            Courses
          </Link>
          {signedIn ? (
            <>
              <Link href="/app/learning" className="hidden px-2 text-body hover:text-ink sm:inline">
                My learning
              </Link>
              <ButtonLink href="/app" className="h-10 px-4 text-[14px]">
                My space
              </ButtonLink>
            </>
          ) : (
            <>
              <Link href={login} className="px-2 text-ink hover:text-link">
                Sign in
              </Link>
              <ButtonLink href={signup} className="h-10 px-4 text-[14px]">
                Get started
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span>© {new Date().getFullYear()} The African Dream Network</span>
      <nav className="flex gap-5" aria-label="Footer">
        <Link href="/courses" className="hover:text-ink">
          Courses
        </Link>
        <a href="/orgs/start" className="hover:text-ink">
          For organisations
        </a>
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
      </nav>
    </footer>
  );
}
