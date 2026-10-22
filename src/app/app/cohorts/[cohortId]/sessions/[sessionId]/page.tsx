import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AttendanceForm } from '@/components/cohorts/cohort-forms';
import { BackLink } from '@/components/ui/nav';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { AttendanceSheet, CohortDetail } from '@/lib/cohorts';
import { classTime } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Attendance' };

type Props = { params: Promise<{ cohortId: string; sessionId: string }> };

/** Cohort managers and the cohort's teachers take attendance; the API decides who may. */
export default async function AttendancePage({ params }: Props) {
  const { cohortId, sessionId } = await params;
  if (!isUuid(cohortId) || !isUuid(sessionId)) notFound();
  const [sheet, cohort] = await Promise.all([
    api<AttendanceSheet>('GET', `/v1/learning/cohorts/${cohortId}/sessions/${sessionId}/attendance`),
    api<CohortDetail>('GET', `/v1/learning/cohorts/${cohortId}`),
  ]);
  if (!sheet.ok && sheet.status === 404) notFound();
  if (!sheet.ok) return <Notice tone="error">{friendlyError(sheet.error)}</Notice>;
  const { session, items } = sheet.data;
  const tz = cohort.ok ? cohort.data.timeZone : 'Africa/Lagos';
  const marked = items.filter((i) => i.status).length;

  return (
    <div className="space-y-6">
      {cohort.ok && <BackLink href={`/app/cohorts/${cohortId}?week=${session.weekNo}`} label={cohort.data.name} />}
      <header className="space-y-1">
        <Eyebrow tone="gold">Week {session.weekNo}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">{session.title}</h1>
        <p className="text-[14px] text-muted">
          {classTime(session.startsAt, tz)} · {session.durationMin} min · {session.mode === 'virtual' ? 'Online' : 'In person'}
          {session.location ? ` · ${session.location}` : ''}
        </p>
      </header>
      {session.cancelled && <Notice tone="neutral">This class was cancelled.</Notice>}
      <Card className="space-y-2 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[19px] font-bold">Register</h2>
          <p className="text-[13px] text-muted">
            {marked} of {items.length} marked
          </p>
        </div>
        {items.length === 0 ? (
          <p className="text-[14px] text-muted">Nobody has joined this cohort yet.</p>
        ) : (
          <AttendanceForm cohortId={cohortId} sessionId={sessionId} items={items} />
        )}
      </Card>
    </div>
  );
}
