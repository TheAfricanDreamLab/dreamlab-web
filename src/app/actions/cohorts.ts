'use server';

import type { CohortDetail, MyProgram } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { fromLocalInput } from '@/lib/cohorts';
import { isUuid, SLUG } from '@/lib/learning';
import { getClaims } from '@/lib/session';

const BAD_LINK = { error: 'This page’s link isn’t right. Open it again from the menu.' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- learners ----------

/** Join a cohort (idempotent), then open My programme. */
export async function joinCohort(_: FormState, fd: FormData): Promise<FormState> {
  const cohortId = str(fd, 'cohortId');
  const programSlug = str(fd, 'programSlug');
  if (!isUuid(cohortId) || !SLUG.test(programSlug)) return BAD_LINK;
  if (!(await getClaims())) redirect(`/signup?next=${encodeURIComponent(`/programs/${programSlug}`)}`);
  const res = await api<MyProgram>('POST', `/v1/learning/cohorts/${cohortId}/join`, {});
  if (!res.ok) return { error: friendlyError(res.error) };
  redirect(`/app/programme?joined=${res.data.enrollment.id}`);
}

export async function chooseElectives(_: FormState, fd: FormData): Promise<FormState> {
  const enrollmentId = str(fd, 'enrollmentId');
  if (!isUuid(enrollmentId)) return BAD_LINK;
  const courseSlugs = fd.getAll('courseSlug').map(String).filter((s) => SLUG.test(s));
  const chooseN = Number(str(fd, 'chooseN'));
  if (courseSlugs.length !== chooseN) return { error: `Choose ${chooseN === 1 ? 'one course' : `${chooseN} courses`}.` };
  const res = await api<MyProgram>('POST', `/v1/learning/me/programs/${enrollmentId}/electives`, { courseSlugs });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Saved. Your elective is in your courses.' };
}

// ---------- staff ----------

export async function createCohort(_: FormState, fd: FormData): Promise<FormState> {
  const values = {
    programSlug: str(fd, 'programSlug'),
    name: str(fd, 'name'),
    startsOn: str(fd, 'startsOn'),
    timeZone: str(fd, 'timeZone') || 'Africa/Lagos',
    capacity: str(fd, 'capacity'),
    enrollmentPolicy: str(fd, 'enrollmentPolicy') || 'invite',
  };
  if (!SLUG.test(values.programSlug)) return { error: 'Choose a programme.', values };
  if (!DATE.test(values.startsOn)) return { error: 'Choose the first day of week 1.', fields: { startsOn: 'Choose a date' }, values };
  const capacity = values.capacity ? Number(values.capacity) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { error: 'Capacity is a whole number of learners, or blank for no limit.', fields: { capacity: 'A whole number' }, values };
  const res = await api<CohortDetail>('POST', '/v1/learning/cohorts', {
    programSlug: values.programSlug,
    name: values.name,
    startsOn: values.startsOn,
    timeZone: values.timeZone,
    capacity,
    enrollmentPolicy: values.enrollmentPolicy,
  });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  redirect(`/app/cohorts/${res.data.id}?created=1`);
}

export async function updateCohort(_: FormState, fd: FormData): Promise<FormState> {
  const cohortId = str(fd, 'cohortId');
  if (!isUuid(cohortId)) return BAD_LINK;
  const body: Record<string, unknown> = {};
  if (fd.has('status')) body.status = str(fd, 'status');
  if (fd.has('enrollmentPolicy')) body.enrollmentPolicy = str(fd, 'enrollmentPolicy');
  if (fd.has('name')) body.name = str(fd, 'name');
  if (fd.has('capacity')) {
    const raw = str(fd, 'capacity');
    const n = raw ? Number(raw) : null;
    if (n !== null && (!Number.isInteger(n) || n < 1)) return { error: 'Capacity is a whole number of learners, or blank for no limit.' };
    body.capacity = n;
  }
  const res = await api<CohortDetail>('PATCH', `/v1/learning/cohorts/${cohortId}`, body);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Saved.' };
}

export async function updateSession(_: FormState, fd: FormData): Promise<FormState> {
  const cohortId = str(fd, 'cohortId');
  const sessionId = str(fd, 'sessionId');
  if (!isUuid(cohortId) || !isUuid(sessionId)) return BAD_LINK;
  const body: Record<string, unknown> = {};
  if (fd.has('location')) body.location = str(fd, 'location') || null;
  if (fd.has('cancelled')) body.cancelled = str(fd, 'cancelled') === 'true';
  if (fd.has('startsAt')) {
    const startsAt = fromLocalInput(str(fd, 'startsAt'), str(fd, 'timeZone') || 'Africa/Lagos');
    if (!startsAt) return { error: 'Choose a date and time.' };
    body.startsAt = startsAt;
  }
  const res = await api('PATCH', `/v1/learning/cohorts/${cohortId}/sessions/${sessionId}`, body);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Saved.' };
}

const MARKS = new Set(['present', 'late', 'absent', 'excused']);

export async function markAttendance(_: FormState, fd: FormData): Promise<FormState> {
  const cohortId = str(fd, 'cohortId');
  const sessionId = str(fd, 'sessionId');
  if (!isUuid(cohortId) || !isUuid(sessionId)) return BAD_LINK;
  const entries = fd
    .getAll('userId')
    .map(String)
    .filter(isUuid)
    .flatMap((userId) => {
      const status = str(fd, `status:${userId}`);
      return MARKS.has(status) ? [{ userId, status, minutes: null }] : [];
    });
  if (entries.length === 0) return { error: 'Mark at least one learner.' };
  const res = await api('PUT', `/v1/learning/cohorts/${cohortId}/sessions/${sessionId}/attendance`, { entries });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: `Attendance saved for ${entries.length === 1 ? 'one learner' : `${entries.length} learners`}.` };
}
