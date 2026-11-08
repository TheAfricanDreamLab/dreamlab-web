import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CohortTabs } from '@/components/cohorts/cohort-tabs';
import { EngagementBoard } from '@/components/cohorts/engagement';
import { BackLink } from '@/components/ui/nav';
import { Eyebrow, Notice } from '@/components/ui/primitives';
import { type CohortEngagement } from '@/lib/engagement-staff';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Engagement' };

type Props = { params: Promise<{ cohortId: string }> };

/**
 * Who is on track and who might need a hand (LRN-9), for cohort managers and the cohort's teachers;
 * the API decides who may. An API without this feature answers 404, and the page doesn't exist.
 */
export default async function EngagementPage({ params }: Props) {
  const { cohortId } = await params;
  if (!isUuid(cohortId)) notFound();
  const [res, me] = await Promise.all([api<CohortEngagement>('GET', `/v1/learning/cohorts/${cohortId}/engagement`), getMe()]);
  if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 405)) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const { cohort, summary } = res.data;
  const canManage = me.platformAdmin || (!!activeMembership(me) && can(me, 'cohort.manage'));
  const needHand = summary.atRisk + summary.inactive;

  return (
    <div className="space-y-6">
      {canManage && <BackLink href={`/app/cohorts/${cohortId}`} label={cohort.name} />}
      <header className="space-y-1">
        <Eyebrow tone="gold">{cohort.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Engagement</h1>
        <p className="max-w-3xl text-[14px] text-muted">
          {summary.learners === 0
            ? 'Nobody has joined yet.'
            : `${summary.learners} ${summary.learners === 1 ? 'learner' : 'learners'} · ${summary.ok} on track${needHand > 0 ? ` · ${needHand} might need a hand` : ''}. A short, personal check-in often helps people come back.`}
        </p>
      </header>
      <CohortTabs cohortId={cohortId} current="engagement" canManage={canManage} />
      <EngagementBoard cohortId={cohortId} data={res.data} />
    </div>
  );
}
