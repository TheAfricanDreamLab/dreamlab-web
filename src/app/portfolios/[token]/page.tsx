import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PortfolioView } from '@/components/outcomes/portfolio-view';
import { PublicFooter, PublicHeader } from '@/components/site/public-header';
import { Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { type Portfolio, SHARE_TOKEN } from '@/lib/outcomes';

// A shared portfolio is for the people it was sent to, not search engines.
export const metadata: Metadata = { title: 'Dream Portfolio', robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

/** A Dream Portfolio its owner published at a link (PORT-1). No sign-in needed. */
export default async function PublicPortfolioPage({ params }: Props) {
  const { token } = await params;
  if (!SHARE_TOKEN.test(token)) notFound();
  const res = await api<Portfolio>('GET', `/v1/learning/portfolios/${token}`);
  if (!res.ok && res.status === 404) notFound();

  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        {res.ok ? <PortfolioView portfolio={res.data} /> : <Notice tone="error">{friendlyError(res.error)}</Notice>}
      </main>
      <PublicFooter />
    </div>
  );
}
