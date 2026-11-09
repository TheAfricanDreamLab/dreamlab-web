import type { JoinableOrganization } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { switchOrg } from '@/app/actions/auth';
import { joinOrganisation } from '@/app/actions/security';
import { PageTitle, SectionHeading } from '@/components/app/dashboard';
import { Badge, OrgMark } from '@/components/ui/primitives';
import { api } from '@/lib/gateway';
import { KIND_LABELS, ROLE_LABELS } from '@/lib/labels';
import { activeMembership, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Spaces' };

/** Your spaces: switch between them, see requests still waiting, and join organisations that recognise your email. */
export default async function SpacesPage() {
  const me = await getMe();
  if (me.platformAdmin) redirect('/app/admin');
  const active = activeMembership(me);
  const spaces = me.memberships.filter((m) => m.status === 'active' && m.org.status !== 'suspended');
  const waiting = me.memberships.filter((m) => m.status === 'requested');
  const joinable = await api<{ items: JoinableOrganization[] }>('GET', '/v1/me/joinable-orgs');
  const joinables = joinable.ok ? joinable.data.items : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="dl-stagger space-y-12 pb-8">
        <PageTitle title="Spaces" intro="Each space has its own courses and people. Switch any time." />

        <section aria-labelledby="your-spaces" className="space-y-3">
          <SectionHeading id="your-spaces" title="Your spaces" />
          <form action={switchOrg}>
            <ul className="divide-y divide-line">
              <li>
                <SpaceRow name="Just me" detail="Your own learning" here={!active} value="" />
              </li>
              {spaces.map((m) => (
                <li key={m.membershipId}>
                  <SpaceRow
                    name={m.org.name}
                    detail={`${KIND_LABELS[m.org.kinds[0] ?? ''] ?? 'Organisation'} · ${m.roles.map((r) => ROLE_LABELS[r.roleKey] ?? r.roleKey).join(', ') || 'member'}`}
                    here={m.membershipId === active?.membershipId}
                    value={m.org.id}
                    badge={m.org.status === 'pending' ? 'In review' : undefined}
                  />
                </li>
              ))}
            </ul>
          </form>
        </section>

        {waiting.length > 0 && (
          <section aria-labelledby="waiting" className="space-y-3">
            <SectionHeading id="waiting" title="Waiting to join" />
            <ul className="divide-y divide-line">
              {waiting.map((m) => (
                <li key={m.membershipId} className="flex items-center gap-3 py-3">
                  <OrgMark size={32} name={m.org.name} className="opacity-60" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold text-ink">{m.org.name}</span>
                    <span className="block text-[13px] text-muted">Waiting for an admin to let you in</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {joinables.length > 0 && (
          <section aria-labelledby="can-join" className="space-y-3">
            <div className="space-y-1">
              <SectionHeading id="can-join" title="You can join" />
              <p className="text-[14px] text-muted">These organisations recognise your email address.</p>
            </div>
            <ul className="divide-y divide-line">
              {joinables.map((j) => (
                <li key={j.org.id}>
                  <form action={joinOrganisation} className="flex flex-wrap items-center gap-3 py-3">
                    <input type="hidden" name="orgId" value={j.org.id} />
                    <OrgMark size={32} name={j.org.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-ink">{j.org.name}</span>
                      <span className="block break-all text-[13px] text-muted">Everyone at @{j.domain}</span>
                    </span>
                    <button type="submit" className="dl-press h-10 rounded-[var(--radius-field)] bg-primary px-4 text-[14px] font-semibold text-white hover:bg-primary-hover">
                      {j.joinPolicy === 'auto' ? 'Join' : 'Ask to join'}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function SpaceRow({ name, detail, here, value, badge }: { name: string; detail: string; here: boolean; value: string; badge?: string }) {
  return (
    <button
      type="submit"
      name="orgId"
      value={value}
      disabled={here}
      className="dl-press group flex min-h-14 w-full items-center gap-3 py-3 text-left disabled:cursor-default"
    >
      <OrgMark size={32} name={name} personal={!value} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold text-ink">{name}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      {here ? (
        <Badge tone="green">You’re here</Badge>
      ) : (
        <span className="flex shrink-0 items-center gap-2">
          {badge && <Badge tone="gold">{badge}</Badge>}
          <span className="text-[14px] font-semibold text-link group-hover:underline">Switch</span>
        </span>
      )}
    </button>
  );
}
