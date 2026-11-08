'use server';

import { refresh } from 'next/cache';
import { CHECK_IN_MAX, CHECK_IN_MAX_PEOPLE, CHECK_IN_MIN, featureMissing } from '@/lib/engagement-staff';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export type CheckInResult = { ok: true; sent: number } | { ok: false; error: string };

/** Send a personal check-in to learners in a cohort, by email and in the app (LRN-9). */
export async function sendCheckIn(cohortId: string, userIds: string[], message: string): Promise<CheckInResult> {
  if (!isUuid(cohortId)) return { ok: false, error: 'This page’s link isn’t right. Open it again from the cohort.' };
  const ids = [...new Set(userIds)].filter(isUuid);
  if (ids.length === 0) return { ok: false, error: 'Choose at least one person.' };
  if (ids.length > CHECK_IN_MAX_PEOPLE) return { ok: false, error: `Choose ${CHECK_IN_MAX_PEOPLE} people or fewer at a time.` };
  const text = message.trim();
  if (text.length < CHECK_IN_MIN) return { ok: false, error: `Write a little more: at least ${CHECK_IN_MIN} characters.` };
  if (text.length > CHECK_IN_MAX) return { ok: false, error: `Keep it to ${CHECK_IN_MAX} characters or fewer.` };

  const res = await api<{ sent: number }>('POST', `/v1/learning/cohorts/${cohortId}/check-ins`, { userIds: ids, message: text });
  if (!res.ok) {
    if (featureMissing(res)) return { ok: false, error: 'Check-ins aren’t available yet. Please try again later.' };
    return { ok: false, error: friendlyError(res.error) };
  }
  refresh();
  return { ok: true, sent: res.data.sent };
}
