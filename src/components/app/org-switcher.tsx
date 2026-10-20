import { switchOrg } from '@/app/actions/auth';
import { Badge, OrgMark } from '@/components/ui/primitives';
import { KIND_LABELS } from '@/lib/labels';

interface Option {
  id: string;
  name: string;
  status: string;
  kind: string;
}

/**
 * Which space you're working in: just you, or one of your organisations. Switching re-issues the
 * session for that space, so what you see and can do always matches the label here.
 */
export function OrgSwitcher({ current, options }: { current: { id: string; name: string; status: string } | null; options: Option[] }) {
  return (
    <details className="relative">
      <summary
        className="flex h-11 max-w-[240px] cursor-pointer list-none items-center gap-2 rounded-full bg-card pl-1.5 pr-3 text-ink ring-1 ring-line hover:ring-line-heavy"
        aria-label={`You’re in ${current ? current.name : 'your personal space'}. Switch space`}
      >
        <OrgMark size={30} name={current?.name ?? ''} personal={!current} />
        <span className="min-w-0 leading-tight">
          <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">You’re in</span>
          <span className="block truncate text-[13.5px] font-semibold">{current ? current.name : 'Just me'}</span>
        </span>
        <span aria-hidden className="text-muted">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-80 rounded-[var(--radius-card)] bg-card p-2 shadow-[var(--shadow-card)] ring-1 ring-line">
        <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Your spaces</p>
        <form action={switchOrg}>
          <button type="submit" name="orgId" value="" className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
            <span>
              <span className="block text-[14px] font-semibold text-ink">Just me</span>
              <span className="block text-[12px] text-muted">Your own learning, outside any organisation</span>
            </span>
            {!current && <Badge tone="green">You’re here</Badge>}
          </button>
          {options.map((o) => (
            <button key={o.id} type="submit" name="orgId" value={o.id} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-ink">{o.name}</span>
                <span className="block text-[12px] text-muted">{KIND_LABELS[o.kind] ?? 'Organisation'}</span>
              </span>
              {current?.id === o.id ? <Badge tone="green">You’re here</Badge> : o.status === 'pending' ? <Badge tone="gold">In review</Badge> : null}
            </button>
          ))}
        </form>
      </div>
    </details>
  );
}
