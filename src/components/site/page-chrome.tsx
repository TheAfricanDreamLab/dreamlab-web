import type { ReactNode } from 'react';
import { SignedInShell } from '@/components/app/signed-in-shell';
import { PublicFooter, PublicHeader } from '@/components/site/public-header';
import { getClaims } from '@/lib/session';

/**
 * The frame around a page anyone can open (the catalogue, a course, a programme): the signed-in
 * layout with its sidebar for someone signed in, the public header and footer for everyone else.
 * Pages pass their content without a <main>: this supplies it.
 */
export async function PageChrome({ next, children }: { /** Where sign-in should return to. */ next?: string; children: ReactNode }) {
  if (await getClaims()) return <SignedInShell>{children}</SignedInShell>;
  return (
    <div className="min-h-dvh">
      <PublicHeader next={next} />
      <main id="main">{children}</main>
      <PublicFooter />
    </div>
  );
}
