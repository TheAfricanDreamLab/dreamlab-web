import type { PlatformUser } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { shortDate } from '@/lib/learning';

export const metadata: Metadata = { title: 'People' };

export default async function PlatformUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 120);
  const status = sp.status === 'active' || sp.status === 'suspended' ? sp.status : undefined;
  const cursor = sp.cursor && sp.cursor.length < 500 ? sp.cursor : undefined;
  const query = new URLSearchParams({ limit: '50' });
  if (q) query.set('q', q);
  if (status) query.set('status', status);
  if (cursor) query.set('cursor', cursor);
  const res = await api<{ items: PlatformUser[]; nextCursor: string | null }>('GET', `/v1/platform/users?${query}`);

  const nextHref = (c: string) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (status) p.set('status', status);
    p.set('cursor', c);
    return `/app/admin/users?${p}`;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Eyebrow tone="gold">Platform admin</Eyebrow>
        <h1 className="text-[30px] font-extrabold">People</h1>
        <p className="text-[14.5px] text-muted">Everyone with a Dream Lab account, newest first.</p>
      </header>

      <form action="/app/admin/users" method="get" role="search" className="flex flex-wrap gap-2">
        <label htmlFor="user-search" className="sr-only">
          Search by name, email or phone
        </label>
        <input
          id="user-search"
          type="search"
          name="q"
          defaultValue={q}
          maxLength={120}
          placeholder="Name, email or phone"
          className="h-11 min-w-0 flex-1 rounded-[var(--radius-field)] bg-card px-4 text-[14.5px] text-ink ring-1 ring-line-strong placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <label htmlFor="user-status" className="sr-only">
          Status
        </label>
        <select id="user-status" name="status" defaultValue={status ?? ''} className="h-11 rounded-[var(--radius-field)] bg-card px-3 text-[14px] text-ink ring-1 ring-line-strong">
          <option value="">Everyone</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="h-11 rounded-[var(--radius-field)] bg-primary px-5 text-[14.5px] font-semibold text-white hover:bg-primary-hover">
          Search
        </button>
      </form>

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : res.data.items.length === 0 ? (
        <Card className="p-10 text-center text-[14.5px] text-muted">{q ? `Nobody matches “${q}”.` : 'Nobody here.'}</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Person
                </th>
                <th scope="col" className="px-5 py-3">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Spaces
                </th>
                <th scope="col" className="px-5 py-3">
                  Joined
                </th>
                <th scope="col" className="px-5 py-3">
                  Last sign-in
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {res.data.items.map((u) => (
                <tr key={u.id} className="hover:bg-surface">
                  <td className="px-5 py-3">
                    <Link href={`/app/admin/users/${u.id}`} className="font-semibold text-ink hover:underline">
                      {u.fullName}
                    </Link>
                    <span className="block text-[12.5px] text-muted">{u.email ?? u.phone}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex flex-wrap gap-1">
                      {u.status === 'suspended' ? <Badge tone="danger">Suspended</Badge> : <Badge tone="green">Active</Badge>}
                      {!u.verified && <Badge tone="gold">Unverified</Badge>}
                      {u.mfaEnabled && <Badge>2-step</Badge>}
                      {u.platformAdmin && <Badge tone="gold">Admin</Badge>}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{u.membershipCount}</td>
                  <td className="px-5 py-3 text-muted">{shortDate(u.createdAt)}</td>
                  <td className="px-5 py-3 text-muted">{u.lastSignInAt ? shortDate(u.lastSignInAt) : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {res.ok && (cursor || res.data.nextCursor) && (
        <nav className="flex justify-between text-[14px] font-semibold" aria-label="Pages">
          {cursor ? (
            <Link href={`/app/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) })}`} className="text-link hover:underline">
              ← First page
            </Link>
          ) : (
            <span />
          )}
          {res.data.nextCursor && (
            <Link href={nextHref(res.data.nextCursor)} className="text-link hover:underline">
              Next page →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
