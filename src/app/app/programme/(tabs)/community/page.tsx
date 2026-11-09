import type { Metadata } from 'next';
import Link from 'next/link';
import { LocalTime } from '@/components/community/community-forms';
import { Notice } from '@/components/ui/primitives';
import { meetingRoomHref, MEETING_STATUS_LABELS, type MyCommunity } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { loadCommunity } from '../../_components/data';
import { sectionHeading } from '../../_components/parts';

export const metadata: Metadata = { title: 'Programme community' };

const primary = 'dl-press inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover';

/** The learner's people across their cohorts: mentors, mentor meetings and Dream Circles (COMM-1). */
export default async function ProgrammeCommunityPage() {
  const res = await loadCommunity();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const c = res.data;

  return (
    <section className="space-y-10" aria-labelledby="my-community">
      <h2 id="my-community" className="text-[19px] font-bold">
        My community
      </h2>
      <div className="dl-stagger space-y-10">
        <Circles c={c} />
        <Mentoring c={c} />
      </div>
    </section>
  );
}

function Circles({ c }: { c: MyCommunity }) {
  return (
    <section className="space-y-3" aria-labelledby="dream-circle">
      <h3 id="dream-circle" className={sectionHeading}>
        Dream Circle
      </h3>
      {c.circles.length === 0 ? (
        <p className="text-[14px] text-muted">You aren’t in a Dream Circle yet. Your cohort’s team forms them.</p>
      ) : (
        <ul className="space-y-6">
          {c.circles.map((circle) => (
            <li key={circle.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0">
                  <span className="block text-[17px] font-semibold text-ink">{circle.name}</span>
                  <span className="block text-[13px] text-muted">{circle.cohortName}</span>
                </p>
                <Link href={`/app/circles/${circle.id}`} className={primary}>
                  Open circle
                </Link>
              </div>
              <ul className="flex flex-wrap gap-1.5" aria-label={`Members of ${circle.name}`}>
                {circle.members.map((m) => (
                  <li key={m.userId} className="rounded-full bg-surface px-3 py-1 text-[13px] text-ink ring-1 ring-line">
                    {m.name}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Mentoring({ c }: { c: MyCommunity }) {
  return (
    <section className="space-y-3" aria-labelledby="mentoring">
      <h3 id="mentoring" className={sectionHeading}>
        Mentoring
      </h3>
      {c.mentors.length === 0 ? (
        <p className="text-[14px] text-muted">You don’t have a mentor yet. Your cohort’s team assigns one.</p>
      ) : (
        <ul className="space-y-1 text-[14.5px]">
          {c.mentors.map((m) => (
            <li key={`${m.userId}-${m.cohortName}`}>
              <span className="font-semibold text-ink">{m.name}</span> <span className="text-muted">· your mentor in {m.cohortName}</span>
            </li>
          ))}
        </ul>
      )}
      {c.meetings.length > 0 && (
        <ul className="divide-y divide-line border-y border-line" aria-label="Mentor meetings">
          {c.meetings.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block font-semibold text-ink">With {m.mentor.name}</span>
                <span className="block text-[13px] text-muted">
                  <LocalTime iso={m.scheduledAt} /> · {m.durationMin} min · {m.mode === 'virtual' ? 'Online' : (m.location ?? 'In person')}
                  {m.status !== 'scheduled' && ` · ${MEETING_STATUS_LABELS[m.status]}`}
                </span>
                {m.status === 'held' && m.notes && <span className="mt-1 block whitespace-pre-line text-[13px] text-body">{m.notes}</span>}
              </span>
              {m.joinable && (
                <Link href={meetingRoomHref(m.id)} prefetch={false} className={primary}>
                  Join meeting
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
