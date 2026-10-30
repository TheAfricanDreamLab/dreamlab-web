import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GraduateForm, RequirementForm } from '@/components/outcomes/outcome-forms';
import { OutcomeBack } from '@/components/outcomes/outcome-nav';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime, isUuid } from '@/lib/learning';
import { type Graduation, pct, tenth, verifyHref } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Graduation' };

type Props = { params: Promise<{ enrollmentId: string }>; searchParams: Promise<{ cohort?: string }> };

/**
 * The graduation checklist (GRAD-1): the programme's ten requirements with what the platform can see,
 * each confirmed by faculty. Graduation needs all of them; the Dream Score plays no part.
 */
export default async function GraduationPage({ params, searchParams }: Props) {
  const [{ enrollmentId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(enrollmentId)) notFound();
  const res = await api<Graduation>('GET', `/v1/learning/programs/enrollments/${enrollmentId}/graduation`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const g = res.data;
  const cohortId = sp.cohort && isUuid(sp.cohort) ? sp.cohort : null;
  const confirmed = g.requirements.filter((r) => r.confirmed).length;
  const staff = g.can.confirm || g.can.graduate;

  return (
    <div className="space-y-8">
      <OutcomeBack enrollmentId={enrollmentId} cohortId={cohortId} board="graduation" current="graduation" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">{g.cohortName}</Eyebrow>
          <h1 className="text-[30px] font-extrabold">{staff ? `${g.learner.name}’s graduation` : 'Graduation'}</h1>
          <p className="text-[14px] text-muted">
            {tenth(g.creditsEarned)} of {tenth(g.creditsTotal)} credits · Programme Score {pct(g.programmeScore)}
          </p>
        </div>
        <p className="text-right">
          <span className="font-mono text-[28px] font-bold text-ink">
            {confirmed}/{g.requirements.length}
          </span>
          <span className="block text-[13px] text-muted">confirmed</span>
        </p>
      </header>

      {g.graduatedAt ? (
        <Notice tone="success">
          <span className="block font-semibold">Graduated {calendarDate(g.graduatedAt.slice(0, 10))}.</span>
          {g.credentialCode && (
            <span className="block">
              Credential{' '}
              <Link href={verifyHref(g.credentialCode)} className="font-mono font-semibold underline">
                {g.credentialCode}
              </Link>{' '}
              — anyone can check it at that link.
            </span>
          )}
        </Notice>
      ) : (
        !staff && <Notice tone="info">Faculty confirm each item. You cannot mark these yourself.</Notice>
      )}

      <Card>
        <ul className="divide-y divide-line">
          {g.requirements.map((r) => (
            <li key={r.key} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-start">
              <div className="flex gap-3">
                <span
                  aria-hidden
                  className={cx(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ring-1',
                    r.confirmed ? 'bg-success-tint text-link ring-success-line' : 'bg-surface text-faint ring-line',
                  )}
                >
                  {r.confirmed ? '✓' : ''}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-ink">
                    {r.label}
                    <span className="sr-only">{r.confirmed ? ' (confirmed)' : ' (not confirmed)'}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    {r.evidence}
                    <Badge tone={r.evidenceMet ? 'green' : 'neutral'}>{r.evidenceMet ? 'Evidence met' : 'Not yet'}</Badge>
                  </p>
                  {r.confirmed && (
                    <p className="text-[12.5px] text-muted">
                      Confirmed by {r.confirmed.by}, {dateTime(r.confirmed.at)}
                      {r.confirmed.note ? ` · ${r.confirmed.note}` : ''}
                    </p>
                  )}
                </div>
              </div>
              {g.can.confirm && !g.graduatedAt && <RequirementForm enrollmentId={enrollmentId} requirement={r} />}
            </li>
          ))}
        </ul>
      </Card>

      {g.can.graduate && !g.graduatedAt && (
        <Card className="space-y-3 p-5">
          <h2 className="text-[19px] font-bold">Graduate</h2>
          {g.eligible ? (
            <GraduateForm enrollmentId={enrollmentId} name={g.learner.name} />
          ) : (
            <p className="text-[14px] text-muted">Every requirement must be confirmed first ({g.requirements.length - confirmed} to go).</p>
          )}
        </Card>
      )}
    </div>
  );
}
