import type { ProgramSummary } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CreateCohortForm } from '@/components/cohorts/cohort-forms';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate, COHORT_STATUS_LABELS, COHORT_STATUS_TONES, type Cohort } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Cohorts' };

/** The Monday after today, as the default first day of a new cohort. */
function nextMonday(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + (((8 - d.getUTCDay()) % 7) || 7));
  return d.toISOString().slice(0, 10);
}

export default async function CohortsPage() {
  const me = await getMe();
  const active = activeMembership(me);
  if (!me.platformAdmin && !(active && can(me, 'cohort.manage'))) redirect('/app');

  const [cohorts, programs] = await Promise.all([
    api<{ items: Cohort[] }>('GET', '/v1/learning/cohorts'),
    api<{ items: ProgramSummary[] }>('GET', '/v1/catalog/programs'),
  ]);
  const schedulable = programs.ok ? programs.data.items.map((p) => ({ slug: p.slug, title: p.title, weeks: p.weeks })) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active ? active.org.name : 'Platform'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Cohorts</h1>
        <p className="text-[14.5px] text-muted">Schedule intakes of a programme, open them for joining, run the weekly classes and take attendance.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-3" aria-labelledby="cohort-list">
          <h2 id="cohort-list" className="text-[19px] font-bold">
            {me.platformAdmin && !active ? 'Every cohort' : 'Your cohorts'}
          </h2>
          {!cohorts.ok ? (
            <Notice tone="error">{friendlyError(cohorts.error)}</Notice>
          ) : cohorts.data.items.length === 0 ? (
            <Card className="p-6 text-[14.5px] text-muted">No cohorts yet. Schedule the first one here.</Card>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {cohorts.data.items.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/cohorts/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{c.name}</span>
                        <span className="block text-[13px] text-muted">
                          {c.programTitle} · {calendarDate(c.startsOn)} – {calendarDate(c.endsOn)}
                          {me.platformAdmin && ` · ${c.hostOrgName}`}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-[13px] text-muted">
                          {c.learnerCount}
                          {c.capacity !== null && ` / ${c.capacity}`} {c.learnerCount === 1 && c.capacity === null ? 'learner' : 'learners'}
                        </span>
                        <Badge tone={COHORT_STATUS_TONES[c.status]}>{COHORT_STATUS_LABELS[c.status]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="new-cohort">
          <h2 id="new-cohort" className="text-[19px] font-bold">
            Schedule a cohort
          </h2>
          <Card className="p-5">
            {!active ? (
              <Notice tone="neutral">Switch to the organisation that will host the cohort to schedule one.</Notice>
            ) : schedulable.length === 0 ? (
              <Notice tone="neutral">There are no programmes to schedule yet.</Notice>
            ) : (
              <CreateCohortForm programs={schedulable} defaultStart={nextMonday()} />
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
