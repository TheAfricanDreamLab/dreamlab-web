import type { EnrollmentSummary } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { EnrollmentCard } from '@/components/learning/enrollment-card';
import { ButtonLink, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';

export const metadata: Metadata = { title: 'My learning' };

export default async function MyLearningPage() {
  const res = await api<{ items: EnrollmentSummary[] }>('GET', '/v1/learning/enrollments');
  const items = res.ok ? res.data.items : [];
  const active = items.filter((e) => e.status !== 'completed');
  const done = items.filter((e) => e.status === 'completed');

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">Your courses</Eyebrow>
          <h1 className="text-[30px] font-extrabold">My learning</h1>
          <p className="text-[14.5px] text-muted">Pick up where you left off. Everything you write in reflections is kept in your journal.</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/app/journal" variant="secondary" className="h-10 px-4 text-[14px]">
            My journal
          </ButtonLink>
          <ButtonLink href="/courses" className="h-10 px-4 text-[14px]">
            Explore courses
          </ButtonLink>
        </div>
      </header>

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : items.length === 0 ? (
        <Card className="space-y-4 p-10 text-center">
          <p className="font-display text-[20px] font-bold text-ink">You haven’t started a course yet.</p>
          <p className="text-[14.5px] text-muted">Courses are free to start and take a few minutes a day. Problem Solving is a good first one.</p>
          <ButtonLink href="/courses" className="mx-auto sm:px-8">
            Browse courses
          </ButtonLink>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3" aria-labelledby="in-progress">
              <h2 id="in-progress" className="text-[19px] font-bold">
                In progress
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((e) => (
                  <EnrollmentCard key={e.id} e={e} />
                ))}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section className="space-y-3" aria-labelledby="completed">
              <h2 id="completed" className="text-[19px] font-bold">
                Completed
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {done.map((e) => (
                  <EnrollmentCard key={e.id} e={e} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
