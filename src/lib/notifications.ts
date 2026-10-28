import 'server-only';
import { NOTIFICATION_CATEGORY_LABELS, type Notification, type NotificationCategory, type NotificationPreferences } from '@dreamlab/contracts';
import { callGateway, incomingRequest } from './gateway';
import { getAccessToken } from './session';

export type { Notification, NotificationCategory, NotificationPreferences };

export const CATEGORY_LABELS = Object.entries(NOTIFICATION_CATEGORY_LABELS) as [NotificationCategory, string][];

/** For the bell on every app page: gives up after 1.5 s (showing no count) rather than hold the page. */
export async function unreadCount(): Promise<number> {
  const call = callGateway<{ unread: number }>('GET', '/v1/notifications/unread-count', { token: await getAccessToken(), request: await incomingRequest() }).catch(() => null);
  const res = await Promise.race([call, new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_500))]);
  return res?.ok ? res.data.unread : 0;
}

/** "Just now", "5 min ago", "3 h ago", then the date. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
