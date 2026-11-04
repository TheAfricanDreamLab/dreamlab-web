import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LiveRoomLoader } from '@/components/live/live-room-loader';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { JoinTicket } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'Circle call' };

type Props = { params: Promise<{ circleId: string }> };

/**
 * A Dream Circle's call (COMM-2): anyone in the circle starts or joins it, with camera and microphone.
 * Each visit asks for a fresh, short-lived join token; calls are never recorded.
 */
export default async function CircleCallPage({ params }: Props) {
  const { circleId } = await params;
  if (!isUuid(circleId)) notFound();
  const res = await api<JoinTicket>('POST', `/v1/learning/circles/${circleId}/call`, {});
  if (!res.ok && res.status === 404) notFound();
  const back = { href: `/app/circles/${circleId}`, label: 'the circle' };

  if (!res.ok) {
    return (
      <div className="space-y-6">
        <BackLink href={back.href} label={back.label} />
        <Card className="space-y-3 p-6 sm:p-8">
          <h1 className="text-[24px] font-extrabold">Circle call</h1>
          <Notice tone="error">{friendlyError(res.error)}</Notice>
        </Card>
      </div>
    );
  }

  const t = res.data;
  return (
    <div className="space-y-4">
      <BackLink href={back.href} label={back.label} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Eyebrow tone="gold">Dream Circle call</Eyebrow>
          <h1 className="text-[26px] font-extrabold">{t.title.replace(/ · Dream Circle call$/, '')}</h1>
        </div>
        <Badge tone="neutral">Not recorded</Badge>
      </header>
      <LiveRoomLoader key={t.token} url={t.url} token={t.token} role={t.role} participantVideo leaveHref={back.href} leaveLabel="Back to the circle" />
    </div>
  );
}
