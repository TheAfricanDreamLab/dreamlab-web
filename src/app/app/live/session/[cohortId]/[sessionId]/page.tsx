import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LiveRoomLoader } from '@/components/live/live-room-loader';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { JoinTicket } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Live class' };

type Props = { params: Promise<{ cohortId: string; sessionId: string }> };

/** Why a class can't be joined right now, in the learner's terms. */
const NOT_JOINABLE: Record<string, string> = {
  not_open_yet: 'The room opens 15 minutes before the class starts. Come back then.',
  session_over: 'This class has ended. Its recording appears on My programme once faculty upload it.',
  not_virtual: 'This class meets in person, so there is no online room.',
  session_cancelled: 'This class was cancelled.',
};

/**
 * Join a cohort's live class (LIVE-1). Each visit asks the API for a fresh, short-lived join token:
 * faculty join as hosts, the cohort's learners take part. Links here never prefetch.
 */
export default async function LiveClassPage({ params }: Props) {
  const { cohortId, sessionId } = await params;
  if (!isUuid(cohortId) || !isUuid(sessionId)) notFound();
  const res = await api<JoinTicket>('POST', `/v1/learning/cohorts/${cohortId}/sessions/${sessionId}/join`, {});
  if (!res.ok && res.status === 404) notFound();

  if (!res.ok) {
    return (
      <div className="space-y-6">
        <BackLink href="/app/programme" label="My programme" />
        <Card className="space-y-3 p-6 sm:p-8">
          <h1 className="text-[24px] font-extrabold">Live class</h1>
          <Notice tone={res.status === 403 ? 'neutral' : 'error'}>{(res.error.code && NOT_JOINABLE[res.error.code]) || friendlyError(res.error)}</Notice>
        </Card>
      </div>
    );
  }

  const t = res.data;
  const back = t.role === 'host' ? { href: `/app/cohorts/${cohortId}/sessions/${sessionId}`, label: 'Class register' } : { href: '/app/programme', label: 'My programme' };
  return (
    <div className="space-y-4">
      <BackLink href={back.href} label={back.label} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Eyebrow tone="gold">Live class</Eyebrow>
          <h1 className="text-[26px] font-extrabold">{t.title}</h1>
        </div>
        <Badge tone={t.role === 'host' ? 'gold' : 'green'}>{t.role === 'host' ? 'You’re hosting' : 'Microphone only'}</Badge>
      </header>
      <LiveRoomLoader key={t.token} url={t.url} token={t.token} role={t.role} leaveHref={back.href} leaveLabel={`Back to ${back.label}`} />
    </div>
  );
}
