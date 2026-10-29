import type { Metadata } from 'next';
import { CourseStaffForm, InstructorForm, RemoveInstructorForm } from '@/components/authoring/instructors';
import { BackLink } from '@/components/ui/nav';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { AuthoringOverview } from '@/lib/authoring';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { type InstructorProfile, STAFF_ROLE_LABELS } from '@/lib/instructors';
import { activeMembership, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Instructors' };

/** The organisation's instructor profiles, and who teaches each course (INSTR-1). The API decides who may. */
export default async function InstructorsPage() {
  const [me, res, overview] = await Promise.all([
    getMe(),
    api<{ items: InstructorProfile[] }>('GET', '/v1/catalog/instructors'),
    api<AuthoringOverview>('GET', '/v1/catalog/authoring'),
  ]);
  const active = activeMembership(me);
  const courses = overview.ok ? overview.data.courses.filter((c) => c.canEdit && c.versionNo !== null) : [];

  return (
    <div className="space-y-8">
      <BackLink href="/app/authoring" label="Authoring" />
      <header className="space-y-1">
        <Eyebrow tone="gold">{active ? active.org.name : 'Platform courses'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Instructors</h1>
        <p className="text-[14.5px] text-muted">The people who teach your courses. A course with staff shows them on its page instead of the instructors in its file.</p>
      </header>

      {!res.ok ? (
        <Notice tone="error">{res.status === 403 ? 'Managing instructors needs the course author role for the organisation.' : friendlyError(res.error)}</Notice>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="space-y-3" aria-labelledby="profiles">
              <h2 id="profiles" className="text-[19px] font-bold">
                Profiles
              </h2>
              {res.data.items.length === 0 ? (
                <Card className="p-6 text-[14.5px] text-muted">No instructors yet. Add the first on the right.</Card>
              ) : (
                res.data.items.map((p) => (
                  <Card key={p.id} className="space-y-3 p-5">
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">{p.name}</span>
                          <span className="block text-[13px] text-muted">
                            {p.title || 'No title'}
                            {p.courses.length > 0 && ` · ${p.courses.map((c) => `${c.title} (${STAFF_ROLE_LABELS[c.role]})`).join(', ')}`}
                          </span>
                        </span>
                        <span className="text-[13.5px] font-semibold text-link group-open:hidden">Edit</span>
                      </summary>
                      <div className="mt-4 space-y-4 border-t border-line pt-4">
                        <InstructorForm profile={p} />
                        <RemoveInstructorForm profile={p} />
                      </div>
                    </details>
                  </Card>
                ))
              )}
            </section>

            {!overview.ok && <Notice tone="error">{friendlyError(overview.error)}</Notice>}
            {res.data.items.length > 0 && courses.length > 0 && (
              <section className="space-y-3" aria-labelledby="staff">
                <h2 id="staff" className="text-[19px] font-bold">
                  Who teaches each course
                </h2>
                {courses.map((c) => (
                  <Card key={c.courseId} className="space-y-3 p-5">
                    <h3 className="font-semibold text-ink">{c.title}</h3>
                    <CourseStaffForm course={{ slug: c.slug, title: c.title }} profiles={res.data.items} />
                  </Card>
                ))}
              </section>
            )}
          </div>

          <section className="space-y-3" aria-labelledby="new-instructor">
            <h2 id="new-instructor" className="text-[19px] font-bold">
              Add an instructor
            </h2>
            <Card className="p-5">
              <InstructorForm />
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
