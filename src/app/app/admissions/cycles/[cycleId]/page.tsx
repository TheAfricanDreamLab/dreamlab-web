import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { StatusBadge } from '@/components/admissions/application-views';
import { CycleSettingsForm, CycleStatusActions } from '@/components/admissions/staff-forms';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { admissionsTime, type ApplicationStatus, CYCLE_STATUS_LABELS, CYCLE_STATUS_TONES, formatIndex, type Pipeline, STAGE_LABELS, STAGES, STATUS_LABELS } from '@/lib/admissions';
import type { Cohort } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Admission cycle' };

type Props = { params: Promise<{ cycleId: string }>; searchParams: Promise<{ status?: string; created?: string }> };

const FILTERS = Object.keys(STATUS_LABELS) as ApplicationStatus[];

export default async function CyclePage({ params, searchParams }: Props) {
  const [{ cycleId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(cycleId)) notFound();
  const me = await getMe();
  if (!me.platformAdmin && !(activeMembership(me) && can(me, 'admissions.review'))) redirect('/app');
  const manage = can(me, 'admissions.manage');
  const status = FILTERS.find((f) => f === sp.status);

  const [res, cohorts] = await Promise.all([
    api<Pipeline>('GET', `/v1/admissions/admin/cycles/${cycleId}/pipeline${status ? `?status=${status}` : ''}`),
    manage && can(me, 'cohort.manage') ? api<{ items: Cohort[] }>('GET', '/v1/learning/cohorts') : null,
  ]);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const { cycle, counts, statusCounts, items } = res.data;
  const cohortOptions = cohorts?.ok
    ? cohorts.data.items.filter((c) => c.status !== 'closed' && c.programSlug === cycle.programSlug).map((c) => ({ value: c.id, label: c.name }))
    : [];
  const cohortName = cohorts?.ok ? cohorts.data.items.find((c) => c.id === cycle.cohortId)?.name : undefined;
  const total = Object.values(statusCounts).reduce((n, c) => n + (c ?? 0), 0);

  return (
    <div className="space-y-8">
      <BackLink href="/app/admissions" label="All cycles" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">{cycle.programTitle}</Eyebrow>
          <h1 className="text-[30px] font-extrabold">{cycle.name}</h1>
          <p className="text-[14px] text-muted">
            {admissionsTime(cycle.opensAt)} – {admissionsTime(cycle.closesAt)} · {cycle.cohortId ? `Admitted applicants join ${cohortName ?? 'the chosen cohort'}` : 'No cohort chosen yet'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={CYCLE_STATUS_TONES[cycle.status]}>{CYCLE_STATUS_LABELS[cycle.status]}</Badge>
          <p className="text-[13px] text-muted">{total === 1 ? '1 application' : `${total} applications`}</p>
        </div>
      </header>

      {sp.created && <Notice tone="success">Cycle created as a draft. Open it when you’re ready for applications.</Notice>}
      {manage && <CycleStatusActions cycle={cycle} />}

      <section className="space-y-3" aria-labelledby="pipeline">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="pipeline" className="text-[19px] font-bold">
            Pipeline
          </h2>
          <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
            {[undefined, ...FILTERS].map((f) => (
              <Link
                key={f ?? 'all'}
                href={`/app/admissions/cycles/${cycle.id}${f ? `?status=${f}` : ''}`}
                aria-current={f === status ? 'page' : undefined}
                className={cx('min-h-9 content-center rounded-full px-3 text-[12.5px] font-semibold ring-1', f === status ? 'bg-forest text-white ring-forest' : 'text-body ring-line hover:bg-surface')}
              >
                {f ? STATUS_LABELS[f] : 'All'} ({f ? (statusCounts[f] ?? 0) : total})
              </Link>
            ))}
          </nav>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {STAGES.map((stage) => {
            const here = items.filter((i) => i.stage === stage);
            return (
              <Card key={stage} className="flex flex-col p-3">
                <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
                  <h3 className="text-[14px] font-bold">{STAGE_LABELS[stage]}</h3>
                  <span className="font-mono text-[12px] text-muted" aria-label={`${counts[stage]} in this stage`}>
                    {counts[stage]}
                  </span>
                </div>
                {here.length === 0 ? (
                  <p className="px-1 text-[12.5px] text-faint">Nobody here{status ? ' with this status' : ''}.</p>
                ) : (
                  <ul className="space-y-2">
                    {here.map((a) => (
                      <li key={a.id}>
                        <Link href={`/app/admissions/applications/${a.id}`} className="block space-y-1 rounded-[var(--radius-field)] px-3 py-2 ring-1 ring-line hover:bg-surface">
                          <span className="block text-[14px] font-semibold text-ink">{a.applicant.name}</span>
                          <span className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={a.status} />
                            <span className="font-mono text-[11px] text-muted">
                              DBPI {formatIndex(a.dbpi)} · DSI {formatIndex(a.dsi)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
        <p className="text-[12.5px] text-muted">DBPI (Dream Builder Potential Index) and DSI (Dream Seriousness Index) are from the latest human review, 0–100.</p>
      </section>

      {manage && (
        <section className="space-y-3 xl:max-w-2xl" aria-labelledby="settings">
          <h2 id="settings" className="text-[19px] font-bold">
            Settings
          </h2>
          <Card className="p-5">
            <CycleSettingsForm cycle={cycle} cohorts={cohortOptions} />
          </Card>
        </section>
      )}
    </div>
  );
}
