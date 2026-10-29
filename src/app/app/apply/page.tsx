import type { Metadata } from 'next';
import Link from 'next/link';
import { StartApplicationForm } from '@/components/admissions/application-forms';
import { StatusBadge } from '@/components/admissions/application-views';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { type AdmissionCycle, admissionsTime, type ApplicationSummary, STAGE_LABELS } from '@/lib/admissions';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';

export const metadata: Metadata = { title: 'Applications' };

/** My applications, and the admission cycles open now. */
export default async function ApplicationsPage() {
  const [mine, open] = await Promise.all([
    api<{ items: ApplicationSummary[] }>('GET', '/v1/admissions/applications/mine'),
    api<{ items: AdmissionCycle[] }>('GET', '/v1/admissions/cycles'),
  ]);
  const appliedTo = new Set(mine.ok ? mine.data.items.map((a) => a.cycle.id) : []);
  const cycles = open.ok ? open.data.items.filter((c) => !appliedTo.has(c.id)) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">Admissions</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Applications</h1>
        <p className="text-[14.5px] text-muted">Apply to a programme, pick up where you left off and follow your application through review.</p>
      </header>

      <section className="space-y-3" aria-labelledby="mine">
        <h2 id="mine" className="text-[19px] font-bold">
          My applications
        </h2>
        {!mine.ok ? (
          <Notice tone="error">{friendlyError(mine.error)}</Notice>
        ) : mine.data.items.length === 0 ? (
          <Card className="p-5 text-[14px] text-muted">You haven’t applied to anything yet.</Card>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {mine.data.items.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/apply/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{a.cycle.programTitle}</span>
                      <span className="block text-[13px] text-muted">
                        {a.cycle.name} · {a.cycle.orgName} · {a.status === 'in_progress' ? `Next: ${STAGE_LABELS[a.stage]}` : `Updated ${admissionsTime(a.updatedAt)}`}
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="open-cycles">
        <h2 id="open-cycles" className="text-[19px] font-bold">
          Open for applications
        </h2>
        {!open.ok ? (
          <Notice tone="error">{friendlyError(open.error)}</Notice>
        ) : cycles.length === 0 ? (
          <Card className="p-5 text-[14px] text-muted">Nothing else is open for applications right now.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cycles.map((c) => (
              <Card key={c.id} className="flex flex-col gap-3 p-5">
                <div className="space-y-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">{c.orgName}</p>
                  <h3 className="text-[18px] font-bold">{c.programTitle}</h3>
                  <p className="text-[13.5px] text-muted">
                    {c.name} · closes {admissionsTime(c.closesAt)}
                  </p>
                </div>
                <div className="mt-auto">
                  <StartApplicationForm cycleId={c.id} back="/app/apply" label={`Apply to ${c.name}`} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
