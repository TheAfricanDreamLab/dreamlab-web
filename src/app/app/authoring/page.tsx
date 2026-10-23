import type { Metadata } from 'next';
import Link from 'next/link';
import { editCourse } from '@/app/actions/authoring';
import { NewCourseForm } from '@/components/authoring/new-course-form';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { type AuthoringOverview, DRAFT_STATUS_LABELS, DRAFT_STATUS_TONES, type DraftSummary, VISIBILITY_LABELS } from '@/lib/authoring';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime } from '@/lib/learning';
import { activeMembership, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Authoring' };

type Props = { searchParams: Promise<{ discarded?: string; error?: string }> };

export default async function AuthoringPage({ searchParams }: Props) {
  const [sp, me, res] = await Promise.all([searchParams, getMe(), api<AuthoringOverview>('GET', '/v1/catalog/authoring')]);
  const active = activeMembership(me);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active ? active.org.name : 'Platform courses'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Authoring</h1>
        <p className="text-[14.5px] text-muted">Write courses in drafts, send them for review, and publish them as new versions. Learners already enrolled stay on their version.</p>
      </header>
      {sp.discarded && <Notice tone="neutral">Draft discarded.</Notice>}
      {sp.error && <Notice tone="error">That course’s draft couldn’t be opened. Try again.</Notice>}

      {!res.ok ? (
        <Notice tone="error">{res.status === 403 ? 'You don’t write or review courses in this organisation. Ask an admin for the course author role.' : friendlyError(res.error)}</Notice>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {res.data.toReview.length > 0 && (
              <section className="space-y-3" aria-labelledby="to-review">
                <h2 id="to-review" className="text-[19px] font-bold">
                  Waiting for your review
                </h2>
                <DraftList drafts={res.data.toReview} showOwner />
              </section>
            )}

            <section className="space-y-3" aria-labelledby="courses">
              <h2 id="courses" className="text-[19px] font-bold">
                Courses
              </h2>
              {res.data.courses.length === 0 ? (
                <Card className="p-6 text-[14.5px] text-muted">No published courses yet. Start one on the right.</Card>
              ) : (
                <Card>
                  <ul className="divide-y divide-line">
                    {res.data.courses.map((c) => (
                      <li key={c.courseId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">{c.title}</span>
                          <span className="block text-[13px] text-muted">
                            {VISIBILITY_LABELS[c.visibility] ?? c.visibility} · {c.versionNo ? `version ${c.versionNo}` : 'coming soon'}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {c.openDraft && <Badge tone={DRAFT_STATUS_TONES[c.openDraft.status]}>{DRAFT_STATUS_LABELS[c.openDraft.status]}</Badge>}
                          {res.data.can.author || c.openDraft ? (
                            <form action={editCourse}>
                              <input type="hidden" name="courseSlug" value={c.slug} />
                              {c.openDraft && <input type="hidden" name="draftId" value={c.openDraft.id} />}
                              <button type="submit" className="min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-link hover:bg-success-tint">
                                {c.openDraft ? 'Open draft' : 'Edit'}
                                <span className="sr-only"> {c.title}</span>
                              </button>
                            </form>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>

            {res.data.newDrafts.length > 0 && (
              <section className="space-y-3" aria-labelledby="new-drafts">
                <h2 id="new-drafts" className="text-[19px] font-bold">
                  New courses in progress
                </h2>
                <DraftList drafts={res.data.newDrafts} />
              </section>
            )}
          </div>

          {res.data.can.author && (
            <section className="space-y-3" aria-labelledby="new-course">
              <h2 id="new-course" className="text-[19px] font-bold">
                Start a new course
              </h2>
              <Card className="p-5">
                <NewCourseForm />
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DraftList({ drafts, showOwner = false }: { drafts: DraftSummary[]; showOwner?: boolean }) {
  return (
    <Card>
      <ul className="divide-y divide-line">
        {drafts.map((d) => (
          <li key={d.id}>
            <Link href={`/app/authoring/${d.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{d.title}</span>
                <span className="block text-[13px] text-muted">
                  {showOwner && `${d.ownerName} · `}
                  {VISIBILITY_LABELS[d.visibility] ?? d.visibility} · {d.updatedBy?.name ?? 'Someone'} · {dateTime(d.updatedAt)}
                </span>
              </span>
              <Badge tone={DRAFT_STATUS_TONES[d.status]}>{DRAFT_STATUS_LABELS[d.status]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
