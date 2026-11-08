import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CohortTabs } from '@/components/cohorts/cohort-tabs';
import { FunnelView } from '@/components/cohorts/funnel';
import { BackLink } from '@/components/ui/nav';
import { Eyebrow, Notice } from '@/components/ui/primitives';
import type { CompletionFunnel } from '@/lib/engagement-staff';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Completion funnel' };

type Props = { params: Promise<{ cohortId: string }> };

/** A cohort's completion funnel (LRN-9), for cohort managers: where people stop, and what brings them back. */
export default async function CohortFunnelPage({ params }: Props) {
  const { cohortId } = await params;
  if (!isUuid(cohortId)) notFound();
  const me = await getMe();
  if (!me.platformAdmin && !(activeMembership(me) && can(me, 'cohort.manage'))) redirect('/app');

  const res = await api<CompletionFunnel>('GET', `/v1/learning/cohorts/${cohortId}/funnel`);
  if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 405)) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const f = res.data;

  return (
    <div className="space-y-6">
      <BackLink href={`/app/cohorts/${cohortId}`} label={f.scope.title} />
      <header className="space-y-1">
        <Eyebrow tone="gold">{f.scope.title}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Completion funnel</h1>
        <p className="max-w-3xl text-[14px] text-muted">Everyone who joined this cohort, and how far they have got. Shares are of everyone enrolled.</p>
      </header>
      <CohortTabs cohortId={cohortId} current="funnel" canManage />
      <FunnelView funnel={f} />
    </div>
  );
}
