'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { DIMENSIONS, type LearningAssignmentDetail, type Weights } from '@/lib/assigned';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid, SLUG } from '@/lib/learning';

const BAD_LINK = { error: 'This page’s link isn’t right. Open it again from the menu.' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Assign a course to the chosen people and groups, then open the assignment. */
export async function createAssignment(_: FormState, fd: FormData): Promise<FormState> {
  const values = { courseSlug: str(fd, 'courseSlug'), dueOn: str(fd, 'dueOn'), note: str(fd, 'note') };
  const userIds = fd.getAll('userId').map(String).filter(isUuid);
  const groupIds = fd.getAll('groupId').map(String).filter(isUuid);
  if (!SLUG.test(values.courseSlug)) return { error: 'Choose a course.', values };
  if (userIds.length + groupIds.length === 0) return { error: 'Choose people or groups to assign it to.', values };
  if (values.dueOn && !DATE.test(values.dueOn)) return { error: 'Choose a due date, or leave it blank.', fields: { dueOn: 'Choose a date' }, values };
  const res = await api<LearningAssignmentDetail>('POST', '/v1/learning/org/assignments', {
    courseSlug: values.courseSlug,
    userIds,
    groupIds,
    dueOn: values.dueOn || null,
    note: values.note,
  });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  redirect(`/app/assignments/${res.data.id}?created=1`);
}

export async function updateAssignment(_: FormState, fd: FormData): Promise<FormState> {
  const assignmentId = str(fd, 'assignmentId');
  if (!isUuid(assignmentId)) return BAD_LINK;
  const dueOn = str(fd, 'dueOn');
  if (dueOn && !DATE.test(dueOn)) return { error: 'Choose a due date, or leave it blank.' };
  const res = await api<LearningAssignmentDetail>('PATCH', `/v1/learning/org/assignments/${assignmentId}`, { dueOn: dueOn || null, note: str(fd, 'note') });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Saved.' };
}

/** Withdraw: it leaves everyone's list; their enrolments and progress stay. */
export async function withdrawAssignment(_: FormState, fd: FormData): Promise<FormState> {
  const assignmentId = str(fd, 'assignmentId');
  if (!isUuid(assignmentId)) return BAD_LINK;
  // The form confirms before sending; the server insists on it too.
  if (str(fd, 'confirm') !== 'withdraw') return { error: 'Confirm that you want to withdraw this assignment.' };
  const res = await api('DELETE', `/v1/learning/org/assignments/${assignmentId}`);
  if (!res.ok) return { error: friendlyError(res.error) };
  redirect('/app/assignments?withdrawn=1');
}

/** The organisation's Dream Score weights: whole percentages, one per dimension, totalling 100. */
export async function saveDreamScoreWeights(_: FormState, fd: FormData): Promise<FormState> {
  const weights = {} as Weights;
  for (const d of DIMENSIONS) {
    // An empty box is missing, not 0 (Number('') would be 0).
    const raw = str(fd, d.key);
    if (raw === '') return { error: `${d.label}: a whole number from 0 to 100.` };
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 100) return { error: `${d.label}: a whole number from 0 to 100.` };
    weights[d.key] = n;
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total !== 100) return { error: `The weights add up to ${total}%; they must total 100%.` };
  const res = await api<{ weights: Weights }>('PUT', '/v1/learning/dream-score/weights', { weights });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Saved. Every learner’s overall Dream Score now combines the dimensions this way.' };
}
