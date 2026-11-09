'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inJoinWindow, sessionRoomHref } from '@/lib/community';

type RoomSession = { id: string; title: string; startsAt: string; durationMin: number; mode: string; cancelled: boolean };

/**
 * The Dream Lab room's "Join class" link, or when it opens. Checks the join window every 30 seconds, so
 * the link appears (and goes again after class) without a reload. `open` and `serverNow` are the server's
 * answer and clock: the first render matches the HTML, a refreshed answer replaces the local one, and later
 * checks run on server time (the device clock plus the offset seen at render), so a slow or fast device
 * clock never hides an open room or shows a closed one.
 */
export function RoomLink({ cohortId, s, open: initial, serverNow, className }: { cohortId: string; s: RoomSession; open: boolean; serverNow: number; className: string }) {
  const [open, setOpen] = useState(initial);
  // A refreshed server answer (say the class moved) wins over the last local check.
  const [seen, setSeen] = useState(serverNow);
  if (seen !== serverNow) {
    setSeen(serverNow);
    setOpen(initial);
  }
  useEffect(() => {
    // The server's clock, carried forward by the device's: the offset is taken when this answer arrives.
    const offset = serverNow - Date.now();
    const check = () => setOpen(inJoinWindow(s, Date.now() + offset));
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [s, serverNow]);

  return open ? (
    <Link href={sessionRoomHref(cohortId, s.id)} prefetch={false} className={className}>
      Join class
      <span className="sr-only"> {s.title}</span>
    </Link>
  ) : (
    <span className="text-[12.5px] text-faint">Room opens 15 min before</span>
  );
}
