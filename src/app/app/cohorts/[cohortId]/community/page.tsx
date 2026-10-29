import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AssignMentorForm, CircleForm, DeleteCircleButton, EndAssignmentButton } from '@/components/community/community-forms';
import { BackLink } from '@/components/ui/nav';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate, type CohortDetail, type RosterEntry } from '@/lib/cohorts';
import type { DreamCircle, MentorAssignment, Person } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Cohort community' };

type Props = { params: Promise<{ cohortId: string }> };

/**
 * A cohort's community (COMM-1): cohort managers assign mentors (members with the Mentor role) to
 * learners, and form Dream Circles, small peer groups of the cohort's learners.
 */
export default async function CohortCommunityPage({ params }: Props) {
  const { cohortId } = await params;
  if (!isUuid(cohortId)) notFound();
  const me = await getMe();
  if (!me.platformAdmin && !(activeMembership(me) && can(me, 'cohort.manage'))) redirect('/app');

  const [cohort, mentors, circles, roster] = await Promise.all([
    api<CohortDetail>('GET', `/v1/learning/cohorts/${cohortId}`),
    api<{ items: MentorAssignment[]; candidates: Person[] }>('GET', `/v1/learning/cohorts/${cohortId}/mentors`),
    api<{ items: DreamCircle[] }>('GET', `/v1/learning/cohorts/${cohortId}/circles`),
    api<{ items: RosterEntry[] }>('GET', `/v1/learning/cohorts/${cohortId}/roster`),
  ]);
  if (!cohort.ok && cohort.status === 404) notFound();
  if (!cohort.ok) return <Notice tone="error">{friendlyError(cohort.error)}</Notice>;
  const learners: Person[] = roster.ok ? roster.data.items.map((l) => ({ userId: l.userId, name: l.name })) : [];
  const inCircle = new Set(circles.ok ? circles.data.items.flatMap((c) => c.members.map((m) => m.userId)) : []);
  // Group assignments by mentor, for a readable list.
  const byMentor = new Map<string, { name: string; items: MentorAssignment[] }>();
  if (mentors.ok) {
    for (const a of mentors.data.items) {
      const entry = byMentor.get(a.mentor.userId) ?? { name: a.mentor.name, items: [] };
      entry.items.push(a);
      byMentor.set(a.mentor.userId, entry);
    }
  }

  return (
    <div className="space-y-8">
      <BackLink href={`/app/cohorts/${cohortId}`} label={cohort.data.name} />
      <header className="space-y-1">
        <Eyebrow tone="gold">{cohort.data.programTitle}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Mentors and Dream Circles</h1>
        <p className="text-[14px] text-muted">
          {cohort.data.name} · {learners.length} {learners.length === 1 ? 'learner' : 'learners'}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3" aria-labelledby="mentors">
          <h2 id="mentors" className="text-[19px] font-bold">
            Mentors
          </h2>
          {!mentors.ok ? (
            <Notice tone="error">{friendlyError(mentors.error)}</Notice>
          ) : (
            <>
              <Card>
                {byMentor.size === 0 ? (
                  <p className="p-5 text-[14px] text-muted">No mentors assigned yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {[...byMentor.entries()].map(([mentorId, m]) => (
                      <li key={mentorId} className="space-y-2 px-4 py-3">
                        <p className="font-semibold text-ink">{m.name}</p>
                        <ul className="space-y-1">
                          {m.items.map((a) => (
                            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                              <span className="text-body">
                                {a.learner.name} <span className="text-[12.5px] text-muted">· since {calendarDate(a.since.slice(0, 10))}</span>
                              </span>
                              <EndAssignmentButton assignmentId={a.id} who={`${m.name} mentoring ${a.learner.name}`} />
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="mb-3 text-[16px] font-bold">Assign a mentor</h3>
                <AssignMentorForm cohortId={cohortId} candidates={mentors.data.candidates} learners={learners} />
              </Card>
            </>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="circles">
          <h2 id="circles" className="text-[19px] font-bold">
            Dream Circles
          </h2>
          {!circles.ok ? (
            <Notice tone="error">{friendlyError(circles.error)}</Notice>
          ) : (
            <>
              {circles.data.items.map((c) => (
                <Card key={c.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[16px] font-bold">{c.name}</h3>
                    <DeleteCircleButton circleId={c.id} name={c.name} />
                  </div>
                  <details>
                    <summary className="min-h-10 cursor-pointer content-center text-[13.5px] font-semibold text-link">
                      {c.members.map((m) => m.name).join(', ')}
                    </summary>
                    <div className="pt-3">
                      <CircleForm cohortId={cohortId} learners={learners} circle={c} taken={inCircle} />
                    </div>
                  </details>
                </Card>
              ))}
              <Card className="p-5">
                <h3 className="mb-3 text-[16px] font-bold">Form a circle</h3>
                {learners.length < 2 ? (
                  <p className="text-[14px] text-muted">A circle needs at least two learners in the cohort.</p>
                ) : (
                  <CircleForm cohortId={cohortId} learners={learners} taken={inCircle} />
                )}
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
