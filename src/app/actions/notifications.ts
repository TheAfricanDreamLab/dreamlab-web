'use server';

import type { NotificationPreferences } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { friendlyError } from '@/lib/errors';
import { type FormState, safeNext, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { CATEGORY_LABELS } from '@/lib/notifications';

/** Open a notification: mark it read, then go where it points (a path in this app only). */
export async function openNotification(fd: FormData): Promise<void> {
  const id = str(fd, 'id');
  if (isUuid(id)) await api('POST', `/v1/notifications/${id}/read`);
  const link = str(fd, 'link');
  if (link) redirect(safeNext(link, '/app/notifications'));
  refresh();
}

export async function markAllNotificationsRead(): Promise<void> {
  await api('POST', '/v1/notifications/read-all');
  refresh();
}

/** One checkbox per category (email:<category>); unticked means no email for it. */
export async function saveNotificationPreferences(_: FormState, fd: FormData): Promise<FormState> {
  const email = Object.fromEntries(CATEGORY_LABELS.map(([c]) => [c, fd.get(`email:${c}`) === 'on'])) as NotificationPreferences['email'];
  const res = await api<NotificationPreferences>('PUT', '/v1/notifications/preferences', { email });
  if (!res.ok) return { error: friendlyError(res.error) };
  return { notice: 'Saved. You still see everything here in the app.' };
}
