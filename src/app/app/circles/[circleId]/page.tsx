import type { CirclePostPage, CircleSpace } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CircleBoard } from '@/components/circles/circle-board';
import { ContactForm, MemberCards } from '@/components/circles/circle-people';
import { MeetupForm, MeetupList } from '@/components/circles/meetups';
import { Icon } from '@/components/ui/icons';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Dream Circle' };

type Props = { params: Promise<{ circleId: string }> };

/**
 * A Dream Circle's space (COMM-2, COMM-3): a call any of them can start, its meetups, its board, and
 * its people with whatever contact details each chose to share. The space and the first page of posts
 * load together; everything after that loads in the page.
 */
export default async function CirclePage({ params }: Props) {
  const { circleId } = await params;
  if (!isUuid(circleId)) notFound();
  const [space, posts] = await Promise.all([
    api<CircleSpace>('GET', `/v1/learning/circles/${circleId}/space`),
    api<CirclePostPage>('GET', `/v1/learning/circles/${circleId}/posts?limit=20`),
  ]);
  if (!space.ok && space.status === 404) notFound();
  if (!space.ok) return <Notice tone="error">{friendlyError(space.error)}</Notice>;
  const s = space.data;
  const back = s.you.role === 'member' ? { href: '/app/programme', label: 'My programme' } : s.you.role === 'mentor' ? { href: '/app/mentoring', label: 'Mentoring' } : { href: `/app/cohorts/${s.cohortId}/community`, label: 'Mentors and Dream Circles' };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={back.href} label={back.label} />
      <header className="space-y-1">
        <Eyebrow tone="gold">Dream Circle · {s.cohortName}</Eyebrow>
        <h1 className="text-[30px] font-extrabold leading-tight">{s.name}</h1>
        <p className="text-[14px] text-muted">
          {s.members.filter((m) => m.role === 'member').length} members
          {s.you.role !== 'member' && <> · you are here as {s.you.role === 'mentor' ? 'a mentor' : 'cohort team'}</>}
        </p>
      </header>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-3">
          <span aria-hidden className={s.call.active ? 'grid h-10 w-10 place-items-center rounded-full bg-primary text-white' : 'grid h-10 w-10 place-items-center rounded-full bg-surface text-link ring-1 ring-line'}>
            <Icon name="video" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold text-ink">{s.call.active ? 'A call is on' : 'Circle call'}</span>
            <span className="block text-[13px] text-muted">
              {s.call.active ? `${s.call.participants} ${s.call.participants === 1 ? 'person is' : 'people are'} in it now` : 'Anyone in the circle can start one. Calls are never recorded.'}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {s.call.active && <Badge tone="green">Live</Badge>}
          <Link
            href={`/app/circles/${s.id}/call`}
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white hover:bg-primary-hover"
          >
            {s.call.active ? 'Join the call' : 'Start a call'}
          </Link>
        </span>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-[17px] font-bold text-ink">Meetups</h2>
        <MeetupList circleId={s.id} meetups={s.meetups} />
        <MeetupForm circleId={s.id} />
      </Card>

      {posts.ok ? <CircleBoard circleId={s.id} initial={posts.data} /> : <Notice tone="error">{friendlyError(posts.error)}</Notice>}

      <section className="space-y-3" aria-labelledby="circle-people">
        <h2 id="circle-people" className="text-[17px] font-bold text-ink">
          People
        </h2>
        {s.you.role !== 'staff' && <ContactForm circleId={s.id} contact={s.you.contact} />}
        <MemberCards members={s.members} />
      </section>
    </div>
  );
}
