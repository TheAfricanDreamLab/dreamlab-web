'use client';

import '@livekit/components-styles';
import { ConnectionStateToast, ControlBar, GridLayout, LiveKitRoom, ParticipantTile, RoomAudioRenderer, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, Card, Notice } from '@/components/ui/primitives';

type Ended = { kind: 'left' } | { kind: 'error'; message: string };

/**
 * A live class or mentor meeting room (LIVE-1). The page fetched a short-lived join token for this
 * person; the token decides what they may publish (hosts everything, learners in a class their
 * microphone, mentees in a one-to-one meeting their camera and screen too), and the controls follow it. Leaving, a dropped connection or an expired token end on a Rejoin, which
 * reloads the page for a fresh token.
 */
export function LiveRoom({
  url,
  token,
  role,
  leaveHref,
  leaveLabel,
  participantVideo = false,
}: {
  url: string;
  token: string;
  role: 'host' | 'participant';
  leaveHref: string;
  leaveLabel: string;
  /** Participants may use camera and screen too (one-to-one meetings). */
  participantVideo?: boolean;
}) {
  const router = useRouter();
  const [ended, setEnded] = useState<Ended | null>(null);
  const [rejoining, startRejoin] = useTransition();
  const host = role === 'host';
  const video = host || participantVideo;

  if (ended) {
    return (
      <Card className="space-y-4 p-6 text-center sm:p-10">
        <p className="font-display text-[20px] font-bold text-ink">{ended.kind === 'left' ? 'You’ve left the room.' : 'The connection dropped.'}</p>
        {ended.kind === 'error' && <Notice tone="error">{ended.message}</Notice>}
        <div className="mx-auto flex max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
          {/* The page fetches a new join token; the new token remounts the room. */}
          <Button onClick={() => startRejoin(() => router.refresh())} disabled={rejoining}>
            {rejoining ? 'Rejoining…' : 'Rejoin'}
          </Button>
          <Link href={leaveHref} className="min-h-11 content-center px-4 text-[14px] font-semibold text-link hover:underline">
            {leaveLabel}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div data-lk-theme="default" className="h-[calc(100dvh-12rem)] min-h-[420px] overflow-hidden rounded-[28px] bg-forest ring-1 ring-line">
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect
        // Everyone arrives muted with the camera off and turns them on from the controls.
        audio={false}
        video={false}
        onDisconnected={() => setEnded({ kind: 'left' })}
        onError={(e) => setEnded({ kind: 'error', message: friendlyRoomError(e) })}
        onMediaDeviceFailure={() => undefined}
        className="flex h-full flex-col"
      >
        <Stage />
        <RoomAudioRenderer />
        <ConnectionStateToast />
        <ControlBar variation="minimal" controls={{ microphone: true, camera: video, screenShare: video, chat: false, settings: false, leave: true }} />
      </LiveKitRoom>
    </div>
  );
}

/** Everyone's camera tile (or their name when it's off), with any shared screen. */
function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} className="min-h-0 flex-1">
      <ParticipantTile />
    </GridLayout>
  );
}

function friendlyRoomError(e: Error): string {
  if (/token|unauthori[sz]ed|401/i.test(e.message)) return 'Your access to the room expired. Rejoin to get a new one.';
  if (/permission|NotAllowed/i.test(e.message)) return 'Your browser blocked the microphone or camera. Allow them for this site and rejoin.';
  return 'We couldn’t connect to the room. Check your connection and rejoin.';
}
