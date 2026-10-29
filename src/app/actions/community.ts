'use server';

import type { DreamCircle, MentorMeeting, RecordingUpload } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { fromLocalInput } from '@/lib/cohorts';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

const BAD_LINK = { error: 'This page’s link isn’t right. Open it again from the menu.' };
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * The browser's time zone, sent with the form, so a typed time means what the person meant. Missing
 * (the form was sent before the page finished loading) or unknown: null, and the time is refused
 * rather than guessed.
 */
function zoneOf(fd: FormData): string | null {
  const tz = str(fd, 'timeZone');
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

const NO_ZONE = 'Your browser’s time zone isn’t known yet. Wait for the page to finish loading, then try again.';

// ---------- recordings (LIVE-1) ----------

/** An upload link for a class recording; the browser then sends the file straight to storage. */
export async function startRecordingUpload(
  cohortId: string,
  sessionId: string,
  file: { title: string; fileName: string; contentType: string; size: number },
): Promise<Outcome<RecordingUpload>> {
  if (!isUuid(cohortId) || !isUuid(sessionId)) return { ok: false, error: BAD_LINK.error };
  const res = await api<RecordingUpload>('POST', `/v1/learning/cohorts/${cohortId}/sessions/${sessionId}/recordings`, file);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}

// ---------- mentors (cohort managers) ----------

export async function assignMentor(_: FormState, fd: FormData): Promise<FormState> {
  const cohortId = str(fd, 'cohortId');
  const mentorUserId = str(fd, 'mentorUserId');
  const learnerUserIds = fd.getAll('learnerUserId').map(String).filter(isUuid);
  if (!isUuid(cohortId)) return BAD_LINK;
  if (!isUuid(mentorUserId)) return { error: 'Choose a mentor.' };
  if (learnerUserIds.length === 0) return { error: 'Choose at least one learner.' };
  const res = await api('POST', `/v1/learning/cohorts/${cohortId}/mentors`, { mentorUserId, learnerUserIds });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: learnerUserIds.length === 1 ? 'Mentor assigned. They have both been told.' : `Mentor assigned to ${learnerUserIds.length} learners. Everyone has been told.` };
}

export async function endAssignment(_: FormState, fd: FormData): Promise<FormState> {
  const assignmentId = str(fd, 'assignmentId');
  if (!isUuid(assignmentId)) return BAD_LINK;
  const res = await api('DELETE', `/v1/learning/mentor-assignments/${assignmentId}`);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Assignment ended. Its meeting log is kept.' };
}

// ---------- Dream Circles (cohort managers) ----------

export async function saveCircle(_: FormState, fd: FormData): Promise<FormState> {
  const cohortId = str(fd, 'cohortId');
  const circleId = str(fd, 'circleId');
  const values = { name: str(fd, 'name') };
  const memberUserIds = fd.getAll('memberUserId').map(String).filter(isUuid);
  if (!isUuid(cohortId) || (circleId && !isUuid(circleId))) return BAD_LINK;
  if (values.name.length < 2) return { error: 'Give the circle a name.', fields: { name: 'At least 2 characters' }, values };
  if (memberUserIds.length < 2) return { error: 'A circle has at least two members.', values };
  if (memberUserIds.length > 12) return { error: 'A circle has at most twelve members.', values };
  const body = { name: values.name, memberUserIds };
  const res = circleId
    ? await api<DreamCircle>('PUT', `/v1/learning/circles/${circleId}`, body)
    : await api<DreamCircle>('POST', `/v1/learning/cohorts/${cohortId}/circles`, body);
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  refresh();
  return { notice: circleId ? 'Circle saved.' : `${res.data.name} is formed. Its members have been told.` };
}

export async function deleteCircle(_: FormState, fd: FormData): Promise<FormState> {
  const circleId = str(fd, 'circleId');
  if (!isUuid(circleId)) return BAD_LINK;
  const res = await api('DELETE', `/v1/learning/circles/${circleId}`);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Circle dissolved.' };
}

// ---------- mentor meetings (mentors) ----------

export async function scheduleMeeting(_: FormState, fd: FormData): Promise<FormState> {
  const values = { assignmentId: str(fd, 'assignmentId'), scheduledAt: str(fd, 'scheduledAt'), durationMin: str(fd, 'durationMin') || '45', mode: str(fd, 'mode') || 'virtual', location: str(fd, 'location') };
  if (!isUuid(values.assignmentId)) return { error: 'Choose a mentee.', values };
  const zone = zoneOf(fd);
  if (!zone) return { error: NO_ZONE, values };
  const scheduledAt = LOCAL_TIME.test(values.scheduledAt) ? fromLocalInput(values.scheduledAt, zone) : null;
  if (!scheduledAt) return { error: 'Choose a date and time.', fields: { scheduledAt: 'Choose a date and time' }, values };
  const durationMin = Number(values.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < 15 || durationMin > 240) return { error: 'A meeting lasts 15 to 240 minutes.', fields: { durationMin: '15 to 240 minutes' }, values };
  if (values.mode !== 'virtual' && values.mode !== 'physical') return { error: 'Choose online or in person.', values };
  const res = await api<MentorMeeting>('POST', '/v1/learning/mentoring/meetings', {
    assignmentId: values.assignmentId,
    scheduledAt,
    durationMin,
    mode: values.mode,
    location: values.location || null,
  });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  refresh();
  return { notice: `Scheduled with ${res.data.learner.name}. They have been told.` };
}

export async function updateMeeting(_: FormState, fd: FormData): Promise<FormState> {
  const meetingId = str(fd, 'meetingId');
  if (!isUuid(meetingId)) return BAD_LINK;
  const body: Record<string, unknown> = {};
  const status = str(fd, 'status');
  if (status) {
    if (!['scheduled', 'held', 'cancelled'].includes(status)) return { error: 'Choose what happened.' };
    body.status = status;
  }
  if (fd.has('notes')) body.notes = str(fd, 'notes');
  const when = str(fd, 'scheduledAt');
  if (when) {
    const zone = zoneOf(fd);
    if (!zone) return { error: NO_ZONE };
    const at = LOCAL_TIME.test(when) ? fromLocalInput(when, zone) : null;
    if (!at) return { error: 'Choose a date and time.' };
    body.scheduledAt = at;
  }
  const res = await api<MentorMeeting>('PATCH', `/v1/learning/mentoring/meetings/${meetingId}`, body);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: res.data.status === 'held' ? 'Logged as held.' : res.data.status === 'cancelled' ? 'Meeting cancelled.' : 'Meeting saved.' };
}
