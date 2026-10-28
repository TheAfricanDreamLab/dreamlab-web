import type { Metadata } from 'next';
import Link from 'next/link';
import { markAllNotificationsRead, openNotification } from '@/app/actions/notifications';
import { Icon, type IconName } from '@/components/ui/icons';
import { Button, Card, Eyebrow, Notice, cx } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { ago, type Notification, type NotificationCategory } from '@/lib/notifications';

export const metadata: Metadata = { title: 'Notifications' };

const ICONS: Record<NotificationCategory, IconName> = {
  grades: 'check',
  submissions: 'journal',
  sessions: 'calendar',
  cohorts: 'spark',
  authoring: 'grid',
  admissions: 'user',
  community: 'users',
  account: 'shield',
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ unread?: string; before?: string }> }) {
  const { unread, before } = await searchParams;
  const onlyUnread = unread === 'true';
  const q = new URLSearchParams({ limit: '30', ...(onlyUnread && { unread: 'true' }), ...(before && !Number.isNaN(Date.parse(before)) && { before }) });
  const res = await api<{ items: Notification[]; unread: number; hasMore: boolean }>('GET', `/v1/notifications?${q}`);
  const items = res.ok ? res.data.items : [];
  const tab = (active: boolean) =>
    cx('inline-flex min-h-10 items-center rounded-full px-4 text-[14px] font-semibold', active ? 'bg-forest text-white' : 'bg-card text-body ring-1 ring-line hover:bg-surface');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">Updates for you</Eyebrow>
          <h1 className="text-[30px] font-extrabold">Notifications</h1>
          <p className="text-[14.5px] text-muted">
            Grades, work to grade, classes and reviews. Choose what also comes by email in{' '}
            <Link href="/app/account#notifications" className="font-semibold text-link hover:underline">
              your account
            </Link>
            .
          </p>
        </div>
        {res.ok && res.data.unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="secondary" size="md">
              Mark all as read
            </Button>
          </form>
        )}
      </header>

      <nav aria-label="Filter notifications" className="flex gap-2">
        <Link href="/app/notifications" aria-current={!onlyUnread ? 'page' : undefined} className={tab(!onlyUnread)}>
          All
        </Link>
        <Link href="/app/notifications?unread=true" aria-current={onlyUnread ? 'page' : undefined} className={tab(onlyUnread)}>
          Unread{res.ok && res.data.unread > 0 ? ` (${res.data.unread})` : ''}
        </Link>
      </nav>

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : items.length === 0 ? (
        <Card className="space-y-2 p-10 text-center">
          <Icon name="bell" className="mx-auto h-8 w-8 text-faint" />
          <p className="font-display text-[20px] font-bold text-ink">{onlyUnread ? 'You’re all caught up.' : 'Nothing yet.'}</p>
          <p className="text-[14.5px] text-muted">When something needs your attention, it appears here.</p>
        </Card>
      ) : (
        <ol className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <form action={openNotification}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="link" value={n.link ?? ''} />
                <button
                  type="submit"
                  className={cx(
                    'flex w-full items-start gap-3 rounded-[var(--radius-card)] p-4 text-left ring-1 transition-colors sm:p-5',
                    n.readAt ? 'bg-card ring-line hover:bg-surface' : 'bg-success-tint/60 ring-success-line hover:bg-success-tint',
                  )}
                >
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-link ring-1 ring-line">
                    <Icon name={ICONS[n.category] ?? 'bell'} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-[15px] font-semibold leading-snug text-ink">
                        {!n.readAt && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </span>
                      <time dateTime={n.createdAt} className="shrink-0 text-[12.5px] text-muted">
                        {ago(n.createdAt)}
                      </time>
                    </span>
                    <span className="block text-[14px] leading-relaxed text-body">{n.body}</span>
                  </span>
                  {!n.readAt && <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />}
                </button>
              </form>
            </li>
          ))}
        </ol>
      )}

      {res.ok && res.data.hasMore && items.length > 0 && (
        <div className="text-center">
          <Link
            href={`/app/notifications?${new URLSearchParams({ ...(onlyUnread && { unread: 'true' }), before: items.at(-1)!.createdAt })}`}
            className="inline-flex min-h-11 items-center rounded-full bg-card px-5 text-[14px] font-semibold text-link ring-1 ring-line hover:bg-surface"
          >
            Older notifications
          </Link>
        </div>
      )}
    </div>
  );
}
