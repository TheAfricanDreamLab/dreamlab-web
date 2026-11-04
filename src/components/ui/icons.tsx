import type { ReactNode } from 'react';
import { cx } from './primitives';

/* Line icons for the app shell and dashboards. Decorative: the text or aria-label next to them names the thing. */

const PATHS: Record<string, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  book: (
    <>
      <path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v12.5H7.5A2.5 2.5 0 0 1 5 17z" />
      <path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H17M19 7v12.5" />
    </>
  ),
  journal: (
    <>
      <path d="M6 3.5h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6z" />
      <path d="M9 3.5v17M12 8h3.5M12 11.5h3.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
    </>
  ),
  shield: <path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  chart: <path d="M4 20h16M7 16.5v-5M11.5 16.5V7M16 16.5v-8" />,
  building: (
    <>
      <path d="M5 20.5V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15.5M15 9.5h3a1 1 0 0 1 1 1v10M3.5 20.5h17" />
      <path d="M8.5 8h3M8.5 11.5h3M8.5 15h3" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6" />
    </>
  ),
  bell: <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5L19 18H5zM10 20.5h4" />,
  // A cog with teeth (settings), not rays: the old drawing read as a sun, a light/dark switch.
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  collapse: <path d="M14.5 6 8.5 12l6 6" />,
  expand: <path d="M9.5 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  file: <path d="M13.5 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5zM13.5 3.5v5h5" />,
  upload: <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-3" />,
  mic: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="m3.5 16 4.5-4.5 4 4 3-3 5.5 5.5" />
      <circle cx="15.5" cy="9.5" r="1.5" />
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="6.5" width="12" height="11" rx="2" />
      <path d="m15.5 10.5 5-3v9l-5-3z" />
    </>
  ),
  clip: <path d="M15.5 7.5 9 14a2 2 0 0 0 2.8 2.8l7-7a4 4 0 0 0-5.6-5.6l-7 7a6 6 0 0 0 8.5 8.5l6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  dots: (
    <>
      <circle cx="12" cy="5.5" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.3" fill="currentColor" />
    </>
  ),
  arrow: <path d="M7 17 17 7M9 7h8v8" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  spark: <path d="M12 3.5 13.8 10l6.2 2-6.2 2L12 20.5 10.2 14 4 12l6.2-2z" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: <path d="M7 3.5h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 5 5.5a2 2 0 0 1 2-2z" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={cx('h-5 w-5 shrink-0', className)}>
      {PATHS[name]}
    </svg>
  );
}
