import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LiveRoomLoader } from '@/components/live/live-room-loader';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { JoinTicket } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Mentor meeting' };

type Props = { params: Promise<{ meetingId: string }> };

/**
 * Join a virtual mentor meeting (COMM-1): the mentor hosts, their mentee takes part. Each visit asks
 * the API for a fresh, short-lived join token. Links here never prefetch.
 */
export default async function MentorMeetingRoomPage({ params }: Props) {
  const { meetingId } = await params;
  if (!isUuid(meetingId)) notFound();
  const res = await api<JoinTicket>('POST', `/v1/learning/mentoring/meetings/${meetingId}/join`, {});
  if (!res.ok && res.status === 404) notFound();

  if (!res.ok) {
    return (
      <div className="space-y-6">
        <BackLink href="/app/programme" label="My programme" />
        <Card className="space-y-3 p-6 sm:p-8">
          <h1 className="text-[24px] font-extrabold">Mentor meeting</h1>
          <Notice tone={res.status === 403 ? 'neutral' : 'error'}>{friendlyError(res.error)}</Notice>
        </Card>
      </div>
    );
  }

  const t = res.data;
  const back = t.role === 'host' ? { href: '/app/mentoring', label: 'Mentoring' } : { href: '/app/programme', label: 'My programme' };
  return (
    <div className="space-y-4">
      <BackLink href={back.href} label={back.label} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Eyebrow tone="gold">Mentor meeting</Eyebrow>
          <h1 className="text-[26px] font-extrabold">{t.title}</h1>
        </div>
        {t.role === 'host' && <Badge tone="gold">You’re hosting</Badge>}
      </header>
      <LiveRoomLoader key={t.token} url={t.url} token={t.token} role={t.role} participantVideo leaveHref={back.href} leaveLabel={`Back to ${back.label}`} />
    </div>
  );
}
