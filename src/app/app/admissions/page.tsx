import type { ProgramSummary } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreateCycleForm } from '@/components/admissions/staff-forms';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { type AdmissionCycle, admissionsTime, ADMISSIONS_TIME_ZONE, CYCLE_STATUS_LABELS, CYCLE_STATUS_TONES } from '@/lib/admissions';
import { type Cohort, localInput } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Admissions' };

const DAY = 86_400_000;

/** A new cycle opens now and closes in 30 days, as datetime-local values. */
function cycleDefaults(now = new Date()) {
  return { opensAt: localInput(now.toISOString(), ADMISSIONS_TIME_ZONE), closesAt: localInput(new Date(now.getTime() + 30 * DAY).toISOString(), ADMISSIONS_TIME_ZONE) };
}

export default async function AdmissionsPage() {
  const me = await getMe();
  const active = activeMembership(me);
  if (!me.platformAdmin && !(active && can(me, 'admissions.review'))) redirect('/app');
  const manage = can(me, 'admissions.manage');

  const [cycles, programs, cohorts] = await Promise.all([
    api<{ items: AdmissionCycle[] }>('GET', '/v1/admissions/admin/cycles'),
    manage ? api<{ items: ProgramSummary[] }>('GET', '/v1/catalog/programs') : null,
    // Only cohort managers can list cohorts; without that the cohort is chosen later.
    manage && can(me, 'cohort.manage') ? api<{ items: Cohort[] }>('GET', '/v1/learning/cohorts') : null,
  ]);
  const programOptions = programs?.ok ? programs.data.items.map((p) => ({ value: p.slug, label: p.title })) : [];
  const cohortOptions = cohorts?.ok ? cohorts.data.items.filter((c) => c.status !== 'closed').map((c) => ({ value: c.id, label: c.name, programSlug: c.programSlug })) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active ? active.org.name : 'Platform'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Admissions</h1>
        <p className="text-[14.5px] text-muted">Run admission cycles: applications move through ten stages, scored by reviewers and decided by people.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-3" aria-labelledby="cycles">
          <h2 id="cycles" className="text-[19px] font-bold">
            Cycles
          </h2>
          {!cycles.ok ? (
            <Notice tone="error">{friendlyError(cycles.error)}</Notice>
          ) : cycles.data.items.length === 0 ? (
            <Card className="p-5 text-[14px] text-muted">No admission cycles yet.{manage ? ' Create one to start taking applications.' : ''}</Card>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {cycles.data.items.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/admissions/cycles/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{c.name}</span>
                        <span className="block text-[13px] text-muted">
                          {c.programTitle} · {admissionsTime(c.opensAt)} – {admissionsTime(c.closesAt)}
                        </span>
                      </span>
                      <Badge tone={CYCLE_STATUS_TONES[c.status]}>{CYCLE_STATUS_LABELS[c.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {manage && (
          <section className="space-y-3" aria-labelledby="new-cycle">
            <h2 id="new-cycle" className="text-[19px] font-bold">
              New cycle
            </h2>
            <Card className="p-5">
              {programOptions.length === 0 ? (
                <p className="text-[14px] text-muted">No programmes are published yet.</p>
              ) : (
                <CreateCycleForm
                  programs={programOptions}
                  cohorts={cohortOptions}
                  defaults={cycleDefaults()}
                />
              )}
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
