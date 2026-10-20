'use server';

import type {
  AssignmentSubmission,
  BlockResponse,
  BlockResult,
  Discussion,
  Enrollment,
  QuizAttempt,
} from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid, type ProgressUpdate, SLUG } from '@/lib/learning';
import { getClaims } from '@/lib/session';

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

const BAD_LINK_MESSAGE = 'This page’s link isn’t right. Open the course again.';
const BAD_LINK = { ok: false, error: BAD_LINK_MESSAGE } as const;

function itemPath(enrollmentId: string, itemId: string, tail: string): string | null {
  if (!isUuid(enrollmentId) || !isUuid(itemId)) return null;
  return `/v1/learning/enrollments/${enrollmentId}/items/${itemId}/${tail}`;
}

/** Enrol (idempotent), then open the course home. */
export async function enrol(_: FormState, fd: FormData): Promise<FormState> {
  const slug = str(fd, 'courseSlug');
  if (!SLUG.test(slug)) return { error: 'That course link isn’t right.' };
  if (!(await getClaims())) redirect(`/signup?next=${encodeURIComponent(`/courses/${slug}`)}`);
  const res = await api<Enrollment>('POST', '/v1/learning/enrollments', { courseSlug: slug });
  if (!res.ok) return { error: friendlyError(res.error) };
  // Land on the course home first: orientation, then the learner chooses to start.
  redirect(`/learn/${res.data.id}`);
}

/** Answer one interactive block in a lesson. */
export async function checkBlock(enrollmentId: string, itemId: string, blockId: string, response: BlockResponse): Promise<Outcome<BlockResult>> {
  const path = itemPath(enrollmentId, itemId, 'checks');
  if (!path) return BAD_LINK;
  const res = await api<BlockResult>('POST', path, { blockId, response });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}

/** Save the furthest step reached, or mark the lesson complete. */
export async function saveProgress(enrollmentId: string, itemId: string, stepIndex: number, complete = false): Promise<Outcome<ProgressUpdate>> {
  const path = itemPath(enrollmentId, itemId, 'progress');
  if (!path || !Number.isInteger(stepIndex) || stepIndex < 0) return BAD_LINK;
  const res = await api<ProgressUpdate>('PUT', path, { stepIndex, complete });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}

export async function submitQuiz(enrollmentId: string, itemId: string, answers: Record<string, BlockResponse>): Promise<Outcome<QuizAttempt>> {
  const path = itemPath(enrollmentId, itemId, 'quiz-attempts');
  if (!path) return BAD_LINK;
  const res = await api<QuizAttempt>('POST', path, { answers });
  if (!res.ok) return { ok: false, error: friendlyError(res.error) };
  refresh();
  return { ok: true, data: res.data };
}

export type SubmissionState = FormState & { submission?: AssignmentSubmission };

export async function submitAssignment(_: SubmissionState, fd: FormData): Promise<SubmissionState> {
  const path = itemPath(str(fd, 'enrollmentId'), str(fd, 'itemId'), 'submissions');
  if (!path) return { error: BAD_LINK_MESSAGE };
  const text = String(fd.get('text') ?? '');
  const link = str(fd, 'link');
  const selfAssessment = Object.fromEntries(fd.getAll('criteria').map((id) => [String(id), true]));
  const values = { text, link };
  if (link && !/^https?:\/\//i.test(link)) return { error: 'Links start with https:// (or http://).', values };
  const res = await api<AssignmentSubmission>('POST', path, { text, link: link || null, selfAssessment });
  if (!res.ok) return { error: friendlyError(res.error), values };
  refresh();
  return { submission: res.data, notice: `Submitted · version ${res.data.version} · awaiting faculty review` };
}

export type DiscussionState = FormState & { posted?: boolean };

export async function postDiscussion(_: DiscussionState, fd: FormData): Promise<DiscussionState> {
  const path = itemPath(str(fd, 'enrollmentId'), str(fd, 'itemId'), 'discussion');
  if (!path) return { error: BAD_LINK_MESSAGE };
  const body = String(fd.get('body') ?? '');
  const parentId = str(fd, 'parentId');
  if (parentId && !isUuid(parentId)) return { error: BAD_LINK_MESSAGE };
  const res = await api<Discussion>('POST', path, { body, parentId: parentId || null });
  if (!res.ok) return { error: friendlyError(res.error), values: { body } };
  refresh();
  return { posted: true, notice: parentId ? 'Reply posted.' : 'Posted. Here’s what your classmates said.' };
}
