import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShareForm } from '@/components/outcomes/outcome-forms';
import { OutcomeBack } from '@/components/outcomes/outcome-nav';
import { PortfolioView } from '@/components/outcomes/portfolio-view';
import { Card, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api, incomingRequest } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import type { Portfolio, Residency } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Dream Portfolio' };

type Props = { params: Promise<{ enrollmentId: string }>; searchParams: Promise<{ cohort?: string }> };

/** The Dream Portfolio (PORT-1): eight sections from approved work, shared at a link or printed. */
export default async function PortfolioPage({ params, searchParams }: Props) {
  const [{ enrollmentId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(enrollmentId)) notFound();
  const [res, residency, request] = await Promise.all([
    api<Portfolio>('GET', `/v1/learning/programs/enrollments/${enrollmentId}/portfolio`),
    // Only the learner may publish their portfolio; the residency's can.edit says whether that is the caller.
    api<Residency>('GET', `/v1/learning/programs/enrollments/${enrollmentId}/residency`),
    incomingRequest(),
  ]);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const p = res.data;
  const cohortId = sp.cohort && isUuid(sp.cohort) ? sp.cohort : null;
  const owner = residency.ok && residency.data.can.edit;
  const shareUrl = p.shareToken && request.host ? `${request.proto}://${request.host}/portfolios/${p.shareToken}` : null;
  const complete = p.sections.filter((s) => s.complete).length;

  return (
    <div className="space-y-8">
      <OutcomeBack enrollmentId={enrollmentId} cohortId={cohortId} board="graduation" current="portfolio" />
      <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-[14px] text-ink">
            <span className="font-semibold">
              {complete} of {p.sections.length} sections complete.
            </span>{' '}
            Sections fill in as faculty approve the work behind them.
          </p>
          <Link href={`/app/programme/${enrollmentId}/portfolio/print`} prefetch={false} className="inline-flex min-h-10 items-center text-[14px] font-semibold text-link hover:underline">
            Print or save as PDF
          </Link>
        </div>
        {owner && (
          <div className="w-full sm:w-80">
            <ShareForm enrollmentId={enrollmentId} shareUrl={shareUrl} />
          </div>
        )}
      </Card>
      <PortfolioView portfolio={p} />
    </div>
  );
}
