import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AttendanceForm } from '@/components/cohorts/cohort-forms';
import { RecordingList, RecordingUploadForm } from '@/components/community/recordings';
import { BackLink } from '@/components/ui/nav';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { AttendanceSheet, CohortDetail } from '@/lib/cohorts';
import { classTime } from '@/lib/cohorts';
import { inJoinWindow, sessionRoomHref, type SessionLive } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Attendance' };

type Props = { params: Promise<{ cohortId: string; sessionId: string }> };

/**
 * Cohort managers and the cohort's teachers take attendance, host the live class and upload its
 * recording; the API decides who may. Attendance for online classes fills in from the live room.
 */
export default async function AttendancePage({ params }: Props) {
  const { cohortId, sessionId } = await params;
  if (!isUuid(cohortId) || !isUuid(sessionId)) notFound();
  const [sheet, cohort, live] = await Promise.all([
    api<AttendanceSheet>('GET', `/v1/learning/cohorts/${cohortId}/sessions/${sessionId}/attendance`),
    api<CohortDetail>('GET', `/v1/learning/cohorts/${cohortId}`),
    api<SessionLive>('GET', `/v1/learning/cohorts/${cohortId}/sessions/${sessionId}/live`),
  ]);
  if (!sheet.ok && sheet.status === 404) notFound();
  if (!sheet.ok) return <Notice tone="error">{friendlyError(sheet.error)}</Notice>;
  const { session, items } = sheet.data;
  const tz = cohort.ok ? cohort.data.timeZone : 'Africa/Lagos';
  const marked = items.filter((i) => i.status).length;
  const roomOpen = live.ok ? live.data.joinable : inJoinWindow(session);

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
      {session.mode === 'virtual' && !session.cancelled && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-[14px] text-body">
            {roomOpen
              ? 'The class room is open. Learners join with their microphone; you can share your camera and screen.'
              : 'The class room opens 15 minutes before the class starts and closes an hour after it ends.'}
          </p>
          {roomOpen ? (
            <Link href={sessionRoomHref(cohortId, sessionId)} prefetch={false} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white hover:bg-primary-hover">
              Start class
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-[14px] font-semibold text-muted ring-1 ring-line">Room closed</span>
          )}
        </Card>
      )}
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
      <Card className="space-y-3 p-5">
        <h2 className="text-[19px] font-bold">Recordings</h2>
        {!live.ok ? (
          <Notice tone="error">{friendlyError(live.error)}</Notice>
        ) : live.data.recordings.length === 0 ? (
          <p className="text-[14px] text-muted">No recording yet. Upload one after the class; the cohort’s learners find it on My programme.</p>
        ) : (
          <RecordingList recordings={live.data.recordings} />
        )}
        <RecordingUploadForm cohortId={cohortId} sessionId={sessionId} defaultTitle={`${session.title}, week ${session.weekNo}`} />
      </Card>
    </div>
  );
}
