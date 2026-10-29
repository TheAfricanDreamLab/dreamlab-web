import type { CourseSummary, GroupSchema, Membership } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { AssignCourseForm } from '@/components/assigned/assigned-forms';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { ASSIGNEE_STATUS_LABELS, ASSIGNEE_STATUS_TONES, ASSIGNEE_STATUSES, dueDate, type LearningAssignment } from '@/lib/assigned';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Assigned learning' };

type Group = z.infer<typeof GroupSchema>;
type Props = { searchParams: Promise<{ withdrawn?: string }> };

/** Courses the organisation assigns to its people (ASSIGN-1). The API decides who may. */
export default async function AssignmentsPage({ searchParams }: Props) {
  const [sp, me] = await Promise.all([searchParams, getMe()]);
  const active = activeMembership(me);
  if (!active || !can(me, 'learning.assign')) redirect('/app');
  const orgId = active.org.id;

  const [res, courses, members, groups] = await Promise.all([
    api<{ items: LearningAssignment[] }>('GET', '/v1/learning/org/assignments'),
    api<{ items: CourseSummary[] }>('GET', '/v1/catalog/courses'),
    api<{ items: Membership[] }>('GET', `/v1/orgs/${orgId}/members?status=active&limit=100`),
    api<{ items: Group[] }>('GET', `/v1/orgs/${orgId}/groups`),
  ]);
  const courseOptions = courses.ok ? courses.data.items.map((c) => ({ slug: c.slug, title: c.title })).sort((a, b) => a.title.localeCompare(b.title)) : [];
  const people = members.ok
    ? members.data.items
        .filter((m) => m.status === 'active')
        .map((m) => ({ userId: m.userId, name: m.user.fullName, detail: m.user.email ?? m.user.phone ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const groupOptions = groups.ok ? groups.data.items.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount })) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active.org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Assigned learning</h1>
        <p className="text-[14.5px] text-muted">Assign courses to people and groups, with a due date if you need one, and follow who has started and finished.</p>
      </header>
      {sp.withdrawn && <Notice tone="neutral">Assignment withdrawn. Everyone keeps their enrolment and progress.</Notice>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-3" aria-labelledby="assigned">
          <h2 id="assigned" className="text-[19px] font-bold">
            Assigned courses
          </h2>
          {!res.ok ? (
            <Notice tone="error">{friendlyError(res.error)}</Notice>
          ) : res.data.items.length === 0 ? (
            <Card className="p-6 text-[14.5px] text-muted">Nothing assigned yet. Assign a course on the right.</Card>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {res.data.items.map((a) => (
                  <li key={a.id}>
                    <Link href={`/app/assignments/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{a.course.title}</span>
                        <span className="block text-[13px] text-muted">
                          {a.dueOn ? `Due ${dueDate(a.dueOn)}` : 'No due date'} · assigned by {a.assignedBy}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {ASSIGNEE_STATUSES.filter((s) => (a.counts[s] ?? 0) > 0).map((s) => (
                          <Badge key={s} tone={ASSIGNEE_STATUS_TONES[s]}>
                            {`${a.counts[s]} ${ASSIGNEE_STATUS_LABELS[s].toLowerCase()}`}
                          </Badge>
                        ))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="assign">
          <h2 id="assign" className="text-[19px] font-bold">
            Assign a course
          </h2>
          <Card className="p-5">
            {!courses.ok || !members.ok ? (
              <Notice tone="error">{friendlyError(!courses.ok ? courses.error : !members.ok ? members.error : undefined)}</Notice>
            ) : (
              <AssignCourseForm courses={courseOptions} people={people} groups={groupOptions} />
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
