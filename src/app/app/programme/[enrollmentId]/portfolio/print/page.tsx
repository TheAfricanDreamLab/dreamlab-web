import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PortfolioView } from '@/components/outcomes/portfolio-view';
import { PrintButton } from '@/components/outcomes/print-button';
import { Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import type { Portfolio } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Dream Portfolio (print)', robots: { index: false } };

type Props = { params: Promise<{ enrollmentId: string }> };

/** Print CSS: A4 with margins, black on white, no app chrome (the shell leaves this path bare). */
const PRINT_CSS = `
@page { size: A4; margin: 18mm 16mm; }
@media print {
  html, body { background: #fff !important; }
  .dl-print, .dl-print * { color: #111 !important; }
  .dl-print a { text-decoration: none; }
}
`;

/** The Dream Portfolio laid out for paper: print it, or save it as a PDF from the print dialog. */
export default async function PortfolioPrintPage({ params }: Props) {
  const { enrollmentId } = await params;
  if (!isUuid(enrollmentId)) notFound();
  const res = await api<Portfolio>('GET', `/v1/learning/programs/enrollments/${enrollmentId}/portfolio`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;

  return (
    <main className="mx-auto max-w-[210mm] bg-white px-6 py-8 print:max-w-none print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/programme/${enrollmentId}/portfolio`} className="min-h-11 content-center text-[14px] font-semibold text-link hover:underline">
          Back to the portfolio
        </Link>
        <PrintButton />
      </div>
      <PortfolioView portfolio={res.data} print />
    </main>
  );
}
