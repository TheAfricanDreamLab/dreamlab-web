import { switchOrg } from '@/app/actions/auth';
import { Dropdown } from '@/components/ui/dropdown';
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
    // Sits at the top of the sidebar: the list opens below it, as wide as the sidebar (wider when
    // the sidebar is collapsed to icons).
    <Dropdown
      className="relative"
      summaryLabel={`You’re in ${current ? current.name : 'your personal space'}. Switch space`}
      summaryClassName="dl-side-item flex min-h-12 w-full min-w-0 items-center gap-2.5 rounded-[18px] bg-surface py-1.5 pl-1.5 pr-3 text-ink ring-1 ring-line hover:ring-line-heavy"
      summary={
        <>
          <OrgMark size={34} name={current?.name ?? ''} personal={!current} />
          <span className="dl-side-text min-w-0 flex-1 leading-tight">
            <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">You’re in</span>
            <span className="block truncate text-[14px] font-semibold">{current ? current.name : 'Just me'}</span>
          </span>
          <span aria-hidden className="dl-side-hide text-muted">
            ▾
          </span>
        </>
      }
      panelClassName="absolute left-0 top-full z-50 mt-2 max-h-[min(70dvh,28rem)] w-full min-w-[min(17rem,calc(100vw-3rem))] overflow-y-auto rounded-[var(--radius-card)] bg-card p-2 shadow-[var(--shadow-panel)] ring-1 ring-line"
    >
        <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Your spaces</p>
        <form action={switchOrg}>
          <button type="submit" name="orgId" value="" className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
            <span>
              <span className="block text-[14px] font-semibold text-ink">Just me</span>
              <span className="block text-[12px] text-muted">Your own learning, outside any organisation</span>
            </span>
            {!current && <Badge tone="green">You’re here</Badge>}
          </button>
          {options.map((o) => (
            <button key={o.id} type="submit" name="orgId" value={o.id} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-ink">{o.name}</span>
                <span className="block text-[12px] text-muted">{KIND_LABELS[o.kind] ?? 'Organisation'}</span>
              </span>
              {current?.id === o.id ? <Badge tone="green">You’re here</Badge> : o.status === 'pending' ? <Badge tone="gold">In review</Badge> : null}
            </button>
          ))}
        </form>
    </Dropdown>
  );
}
