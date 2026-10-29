'use client';

import dynamic from 'next/dynamic';

/** The room runs in the browser only (WebRTC and media devices), so it is never rendered on the server. */
export const LiveRoomLoader = dynamic(() => import('./live-room').then((m) => m.LiveRoom), {
  ssr: false,
  loading: () => <div className="grid h-[calc(100dvh-12rem)] min-h-[420px] place-items-center rounded-[28px] bg-forest text-[14px] text-white/80">Connecting to the room…</div>,
});
