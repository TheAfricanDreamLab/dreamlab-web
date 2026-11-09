'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inJoinWindow, sessionRoomHref } from '@/lib/community';

type RoomSession = { id: string; title: string; startsAt: string; durationMin: number; mode: string; cancelled: boolean };

/**
 * The Dream Lab room's "Join class" link, or when it opens. Checks the join window every 30 seconds, so
 * the link appears (and goes again after class) without a reload. `open` is the server's answer, so the
 * first render matches the HTML.
 */
export function RoomLink({ cohortId, s, open: initial, className }: { cohortId: string; s: RoomSession; open: boolean; className: string }) {
  const [open, setOpen] = useState(initial);
  useEffect(() => {
    const check = () => setOpen(inJoinWindow(s));
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [s]);

  return open ? (
    <Link href={sessionRoomHref(cohortId, s.id)} prefetch={false} className={className}>
      Join class
      <span className="sr-only"> {s.title}</span>
    </Link>
  ) : (
    <span className="text-[12.5px] text-faint">Room opens 15 min before</span>
  );
}
