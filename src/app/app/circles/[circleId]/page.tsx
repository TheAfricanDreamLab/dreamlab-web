import type { CirclePostPage, CircleSpace } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CircleBoard } from '@/components/circles/circle-board';
import { Icon } from '@/components/ui/icons';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { initials } from '@/lib/labels';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Dream Circle' };

type Props = { params: Promise<{ circleId: string }> };

/**
 * A Dream Circle's space (COMM-2): its members, a call any of them can start, and its board. The space
 * and the first page of posts load together; everything after that loads in the page.
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
      <header className="space-y-3">
        <Eyebrow tone="gold">Dream Circle · {s.cohortName}</Eyebrow>
        <h1 className="text-[30px] font-extrabold leading-tight">{s.name}</h1>
        <ul className="flex flex-wrap gap-2" aria-label="People in this circle">
          {s.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-[13px] text-ink ring-1 ring-line">
              <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-success-tint text-[10.5px] font-bold text-link">
                {initials(m.name)}
              </span>
              {m.name}
              {m.role === 'mentor' && <span className="text-gold-ink">· mentor</span>}
            </li>
          ))}
        </ul>
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

      {posts.ok ? <CircleBoard circleId={s.id} initial={posts.data} /> : <Notice tone="error">{friendlyError(posts.error)}</Notice>}
    </div>
  );
}
