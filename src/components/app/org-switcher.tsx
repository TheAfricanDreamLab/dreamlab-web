import Link from 'next/link';
import { switchOrg } from '@/app/actions/auth';
import { Badge, LogoMark } from '@/components/ui/primitives';
import { KIND_LABELS } from '@/lib/labels';

interface Option {
  id: string;
  name: string;
  status: string;
  kind: string;
}

/** Personal space plus every organisation the user belongs to. Switching re-issues the session. */
export function OrgSwitcher({ current, options }: { current: { id: string; name: string; status: string } | null; options: Option[] }) {
  return (
    <details className="relative">
      <summary className="flex h-10 max-w-[220px] cursor-pointer list-none items-center gap-2 rounded-full bg-card pl-1.5 pr-3 text-[13.5px] font-semibold text-ink ring-1 ring-line hover:ring-line-heavy">
        <LogoMark size={28} className={current ? '' : 'bg-success-tint text-link'} />
        <span className="truncate">{current ? current.name : 'Personal'}</span>
        <span aria-hidden className="text-muted">▾</span>
      </summary>
      <div className="absolute right-0 mt-2 w-72 rounded-[var(--radius-card)] bg-card p-2 shadow-[var(--shadow-card)] ring-1 ring-line">
        <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Switch to</p>
        <form action={switchOrg}>
          <button type="submit" name="orgId" value="" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-surface">
            <span>
              <span className="block text-[14px] font-semibold text-ink">Personal</span>
              <span className="block text-[12px] text-muted">Learning on your own</span>
            </span>
            {!current && <Badge tone="green">Here</Badge>}
          </button>
          {options.map((o) => (
            <button key={o.id} type="submit" name="orgId" value={o.id} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-ink">{o.name}</span>
                <span className="block text-[12px] text-muted">{KIND_LABELS[o.kind] ?? 'Organisation'}</span>
              </span>
              {current?.id === o.id ? <Badge tone="green">Here</Badge> : o.status === 'pending' ? <Badge tone="gold">In review</Badge> : null}
            </button>
          ))}
        </form>
        <div className="mt-1 border-t border-line pt-1">
          <Link href="/orgs/new" className="block rounded-lg px-3 py-2 text-[14px] font-semibold text-link hover:bg-success-tint">
            + Create an organisation
          </Link>
        </div>
      </div>
    </details>
  );
}
