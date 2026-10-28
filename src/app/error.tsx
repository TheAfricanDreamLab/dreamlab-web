'use client';

import Link from 'next/link';
import { Brand } from '@/components/ui/primitives';

/**
 * A page could not load (the API was briefly unreachable or busy). Offer a retry rather than a
 * redirect: sending people to sign in while their session is still valid bounced them straight
 * back here, over and over.
 */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Brand />
      <h1 className="text-[26px] font-extrabold">We couldn’t load this page</h1>
      <p className="text-[15px] text-muted">Dream Lab didn’t answer in time. Your work is safe. Try again in a moment.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="inline-flex min-h-11 items-center rounded-full bg-forest px-6 text-[15px] font-semibold text-white hover:bg-forest-soft">
          Try again
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold text-link ring-1 ring-line hover:bg-surface">
          Home
        </Link>
      </div>
    </main>
  );
}
