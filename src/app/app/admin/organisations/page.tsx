import type { Organization } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setOrganisationStatus } from '@/app/actions/org';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { api } from '@/lib/gateway';
import { KIND_LABELS } from '@/lib/labels';
import { getMe } from '@/lib/me';
import { siteDomain } from '@/lib/tenant';

export const metadata: Metadata = { title: 'Organisations' };

const TABS = [
  { key: 'pending', label: 'Waiting for review' },
  { key: 'active', label: 'Live' },
  { key: 'suspended', label: 'Suspended' },
] as const;

export default async function OrganisationsAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await getMe();
  if (!me.platformAdmin) redirect('/app');
  const requested = (await searchParams).status;
  const status = TABS.find((t) => t.key === requested)?.key ?? 'pending';
  const res = await api<{ items: Organization[] }>('GET', `/v1/orgs?status=${status}&limit=100`);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Eyebrow tone="gold">Platform admin</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Organisations</h1>
        <p className="text-[14.5px] text-muted">Schools, partners and sponsors wait here until someone checks they’re real. Companies go live on their own.</p>
      </header>

      <nav className="flex gap-2" aria-label="Status">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/app/admin/organisations?status=${t.key}`}
            aria-current={status === t.key ? 'page' : undefined}
            className={cx('rounded-full px-4 py-2 text-[13.5px] font-semibold ring-1', status === t.key ? 'bg-forest text-white ring-forest' : 'bg-card text-body ring-line hover:ring-line-heavy')}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!res.ok ? (
        <Notice tone="error">{res.error.message}</Notice>
      ) : res.data.items.length === 0 ? (
        <Card className="p-10 text-center text-[14.5px] text-muted">{status === 'pending' ? 'Nothing waiting. All caught up.' : 'No organisations here.'}</Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {res.data.items
              .filter((o) => !o.kinds.includes('platform'))
              .map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{o.name}</p>
                    <p className="font-mono text-[12px] text-muted">
                      {o.slug}.{siteDomain()} · created {new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {o.kinds.map((k) => (
                      <Badge key={k} tone={k === 'enterprise' ? 'neutral' : 'gold'}>
                        {KIND_LABELS[k] ?? k}
                      </Badge>
                    ))}
                  </div>
                  <form action={setOrganisationStatus} className="flex gap-2">
                    <input type="hidden" name="orgId" value={o.id} />
                    {o.status !== 'active' && (
                      <button type="submit" name="status" value="active" className="rounded-[10px] bg-primary px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover">
                        {o.status === 'pending' ? 'Approve' : 'Reactivate'}
                      </button>
                    )}
                    {o.status !== 'suspended' && (
                      <button type="submit" name="status" value="suspended" className="rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-danger-ink ring-1 ring-danger-line hover:bg-danger-tint">
                        {o.status === 'pending' ? 'Decline' : 'Suspend'}
                      </button>
                    )}
                  </form>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
