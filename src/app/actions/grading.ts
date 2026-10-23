'use server';

import type { SubmissionForGrading } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { RUBRIC_MAX_LEVEL } from '@/lib/grading';
import { isUuid } from '@/lib/learning';

/** Score every rubric criterion (rubric:<id> = 0–4), add feedback, and save a draft or release it. */
export async function gradeSubmission(_: FormState, fd: FormData): Promise<FormState> {
  const submissionId = str(fd, 'submissionId');
  if (!isUuid(submissionId)) return { error: 'This page’s link isn’t right. Open the submission again from the grading queue.' };
  const criteria = fd.getAll('criterion').map(String);
  const rubricScores: Record<string, number> = {};
  for (const id of criteria) {
    const raw = str(fd, `rubric:${id}`);
    const level = Number(raw);
    if (raw === '' || !Number.isInteger(level) || level < 0 || level > RUBRIC_MAX_LEVEL) return { error: 'Choose a level for every criterion.', values: { feedback: str(fd, 'feedback') } };
    rubricScores[id] = level;
  }
  const release = fd.get('intent') === 'release';
  const feedback = str(fd, 'feedback');
  const res = await api<SubmissionForGrading>('PUT', `/v1/learning/grading/submissions/${submissionId}/grade`, { rubricScores, feedback: feedback || null, release });
  if (!res.ok) return { error: friendlyError(res.error), values: { feedback } };
  refresh();
  return { notice: release ? `Released: ${res.data.grade?.scorePct ?? 0}%. The learner can see it now.` : 'Draft saved. Only graders can see it.' };
}
