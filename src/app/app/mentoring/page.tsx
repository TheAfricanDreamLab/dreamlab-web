import type { Metadata } from 'next';
import Link from 'next/link';
import { LocalTime, MeetingEditor, ScheduleMeetingForm } from '@/components/community/community-forms';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { MEETING_STATUS_LABELS, MEETING_STATUS_TONES, type Mentoring, meetingRoomHref } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';

export const metadata: Metadata = { title: 'Mentoring' };

/**
 * Mentoring (COMM-1): the learners assigned to me as their mentor, across cohorts, and our meetings.
 * Mentors schedule meetings, join online ones here, and log them as held with notes.
 */
export default async function MentoringPage() {
  const res = await api<Mentoring>('GET', '/v1/learning/mentoring');
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const { learners, meetings } = res.data;
  const upcoming = meetings.filter((m) => m.status === 'scheduled');
  const past = meetings.filter((m) => m.status !== 'scheduled');

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">Your mentees</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Mentoring</h1>
        <p className="text-[14.5px] text-muted">The learners you mentor, your meetings with them, and what you agreed.</p>
      </header>

      {learners.length === 0 ? (
        <Card className="space-y-2 p-10 text-center">
          <p className="font-display text-[20px] font-bold text-ink">Nobody is assigned to you yet.</p>
          <p className="text-[14.5px] text-muted">A cohort’s team assigns mentors to its learners. You’ll be told when they do.</p>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="space-y-3" aria-labelledby="mentees">
              <h2 id="mentees" className="text-[19px] font-bold">
                Mentees
              </h2>
              <Card>
                <ul className="divide-y divide-line">
                  {learners.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{l.learner.name}</span>
                        <span className="block text-[13px] text-muted">{l.cohortName}</span>
                      </span>
                      <span className="text-right text-[12.5px] text-muted">
                        <span className="block">Last met {l.lastMeetingAt ? <LocalTime iso={l.lastMeetingAt} /> : '—'}</span>
                        <span className="block">Next {l.nextMeetingAt ? <LocalTime iso={l.nextMeetingAt} /> : 'not scheduled'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>

            <section className="space-y-3" aria-labelledby="upcoming">
              <h2 id="upcoming" className="text-[19px] font-bold">
                Upcoming meetings
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-[14px] text-muted">No meetings scheduled.</p>
              ) : (
                <Card>
                  <ul className="divide-y divide-line">
                    {upcoming.map((m) => (
                      <li key={m.id} className="space-y-2 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink">{m.learner.name}</span>
                            <span className="block text-[13px] text-muted">
                              <LocalTime iso={m.scheduledAt} /> · {m.durationMin} min · {m.mode === 'virtual' ? 'Online' : (m.location ?? 'In person')}
                            </span>
                          </span>
                          {m.joinable ? (
                            <Link href={meetingRoomHref(m.id)} prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
                              Join meeting
                              <span className="sr-only"> with {m.learner.name}</span>
                            </Link>
                          ) : (
                            m.mode === 'virtual' && <span className="text-[12.5px] text-faint">Room opens 15 min before</span>
                          )}
                        </div>
                        <MeetingEditor meeting={m} />
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>

            {past.length > 0 && (
              <section className="space-y-3" aria-labelledby="past">
                <h2 id="past" className="text-[19px] font-bold">
                  Past meetings
                </h2>
                <Card>
                  <ul className="divide-y divide-line">
                    {past.map((m) => (
                      <li key={m.id} className="space-y-2 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink">{m.learner.name}</span>
                            <span className="block text-[13px] text-muted">
                              <LocalTime iso={m.scheduledAt} /> · {m.durationMin} min
                            </span>
                          </span>
                          <Badge tone={MEETING_STATUS_TONES[m.status]}>{MEETING_STATUS_LABELS[m.status]}</Badge>
                        </div>
                        {m.notes && <p className="whitespace-pre-line text-[13.5px] text-body">{m.notes}</p>}
                        <MeetingEditor meeting={m} />
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            )}
          </div>

          <section className="space-y-3" aria-labelledby="schedule">
            <h2 id="schedule" className="text-[19px] font-bold">
              Schedule a meeting
            </h2>
            <Card className="p-5">
              <ScheduleMeetingForm mentees={learners.map((l) => ({ assignmentId: l.id, name: l.learner.name, cohortName: l.cohortName }))} />
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
