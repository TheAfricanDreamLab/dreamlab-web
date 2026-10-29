import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DreamScoreWeightsForm } from '@/components/assigned/assigned-forms';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { Weights } from '@/lib/assigned';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Dream Score weights' };

/** How the organisation's Dream Score™ combines its ten dimensions (SCORE-1). The API decides who may. */
export default async function DreamScoreWeightsPage() {
  const me = await getMe();
  const active = activeMembership(me);
  if (!active || !can(me, 'cohort.manage')) redirect('/app');
  const res = await api<{ weights: Weights }>('GET', '/v1/learning/dream-score/weights');

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active.org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Dream Score weights</h1>
        <p className="max-w-3xl text-[14.5px] text-muted">
          A learner’s Dream Score™ is built from ten competency dimensions, each scored from the evidence of their work: course grades, residency stages, mentor meetings and attendance. These weights decide how the
          dimensions combine into the overall score. They change no evidence and no dimension score.
        </p>
      </header>
      <Notice tone="info">The Dream Score informs learners and faculty; it gates nothing. Graduation depends on the Programme Score, credits and the graduation requirements.</Notice>
      <Card className="max-w-3xl p-5">
        {!res.ok ? <Notice tone="error">{friendlyError(res.error)}</Notice> : <DreamScoreWeightsForm weights={res.data.weights} />}
      </Card>
    </div>
  );
}
