'use server';

import { type CircleProgress, type LearningGoal, SaveLearningGoalSchema } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import type { Outcome } from './community';

/*
 * Staying on track (LRN-9), the learner's side: their goal and study plan, and whether they share
 * their week's progress with their Dream Circle.
 */

const BAD_LINK: FormState = { error: 'This page’s link isn’t right. Open it again from the menu.' };

export type GoalFormState = FormState & { saved?: LearningGoal };

/** Set or change my goal and study plan for a programme or a course. */
export async function saveLearningGoal(_: GoalFormState, fd: FormData): Promise<GoalFormState> {
  const scope = str(fd, 'scope');
  const enrollmentId = str(fd, 'enrollmentId');
  if ((scope !== 'program' && scope !== 'course') || !isUuid(enrollmentId)) return BAD_LINK;

  const studyDays = fd.getAll('studyDays').map(String);
  const weekly = str(fd, 'minutesPerWeek');
  const otherHours = str(fd, 'otherHours').replace(',', '.');
  const minutesPerWeek = weekly === 'other' ? Math.round(Number(otherHours) * 60) : Number(weekly);
  const values = {
    why: String(fd.get('why') ?? ''),
    success: String(fd.get('success') ?? ''),
    studyTime: str(fd, 'studyTime'),
    minutesPerWeek: weekly,
    otherHours,
    studyDays: studyDays.join(','),
  };

  const parsed = SaveLearningGoalSchema.safeParse({
    why: values.why,
    success: values.success.trim() || undefined,
    studyDays,
    studyTime: values.studyTime || undefined,
    minutesPerWeek: Number.isFinite(minutesPerWeek) ? minutesPerWeek : 0,
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (fields[key]) continue;
      fields[key] =
        key === 'why'
          ? issue.code === 'too_big'
            ? 'Keep it under 600 characters'
            : 'A sentence or two, in your own words (at least 20 characters)'
          : key === 'minutesPerWeek'
            ? 'Choose between half an hour and 20 hours a week'
            : key === 'studyTime'
              ? 'A time like 20:00, or leave it blank'
              : key === 'success'
                ? 'Keep it under 300 characters'
                : issue.message;
    }
    return { error: 'A few things need another look.', fields, values };
  }

  const res = await api<LearningGoal>('PUT', `/v1/learning/me/goals/${scope}/${enrollmentId}`, parsed.data);
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  refresh();
  return { saved: res.data, notice: 'Saved. We’ll show you this when you need a reminder of why you started.' };
}

/** Share (or stop sharing) my week's progress with my circle. */
export async function setCircleSharing(circleId: string, share: boolean): Promise<Outcome<CircleProgress>> {
  if (!isUuid(circleId) || typeof share !== 'boolean') return { ok: false, error: 'That link is not valid.' };
  const res = await api<CircleProgress>('PUT', `/v1/learning/circles/${circleId}/progress/sharing`, { share });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}
