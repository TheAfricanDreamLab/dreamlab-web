'use server';

import type { CourseMediaUpload, Draft } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid, SLUG } from '@/lib/learning';

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

const BAD_LINK = { ok: false as const, error: 'This draft’s link isn’t right. Open it again from Authoring.' };

/** New course: a slug and a title, then straight into the editor. */
export async function createCourseDraft(_: FormState, fd: FormData): Promise<FormState> {
  const title = str(fd, 'title');
  const slug = str(fd, 'slug').toLowerCase();
  const values = { title, slug };
  if (title.length < 3) return { error: 'Give the course a title of at least three characters.', values };
  if (!SLUG.test(slug) || slug.length < 3) return { error: 'The web address uses lowercase letters, digits and hyphens (at least three).', values };
  const res = await api<Draft>('POST', '/v1/catalog/authoring/drafts', { slug, title });
  if (!res.ok) return { error: friendlyError(res.error), values };
  redirect(`/app/authoring/${res.data.id}`);
}

/** Edit an existing course: open its draft, starting one from the current version if there is none. */
export async function editCourse(fd: FormData): Promise<void> {
  const courseSlug = str(fd, 'courseSlug');
  const openDraft = str(fd, 'draftId');
  if (isUuid(openDraft)) redirect(`/app/authoring/${openDraft}`);
  if (!SLUG.test(courseSlug)) redirect('/app/authoring');
  const res = await api<Draft>('POST', '/v1/catalog/authoring/drafts', { courseSlug });
  if (res.ok) redirect(`/app/authoring/${res.data.id}`);
  const existing = (res.error.details as { draftId?: string } | undefined)?.draftId;
  redirect(existing && isUuid(existing) ? `/app/authoring/${existing}` : '/app/authoring?error=draft');
}

/** Save the whole document; the revision guards against overwriting someone else's save. */
export async function saveDraft(draftId: string, revision: number, doc: Record<string, unknown>): Promise<Outcome<Draft>> {
  // Server Actions are public endpoints: check what TypeScript can't.
  if (!isUuid(draftId) || !Number.isInteger(revision) || revision < 0 || !doc || typeof doc !== 'object' || Array.isArray(doc)) return BAD_LINK;
  const res = await api<Draft>('PUT', `/v1/catalog/authoring/drafts/${draftId}`, { revision, doc });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error), code: res.error.code };
}

const STEPS = ['submit', 'withdraw', 'publish', 'request-changes'] as const;
type Step = (typeof STEPS)[number];

/** Submit, withdraw, publish or request changes. Reviewers may add a note. */
export async function draftStep(draftId: string, step: Step, note?: string): Promise<Outcome<Draft>> {
  if (!isUuid(draftId) || !(STEPS as readonly string[]).includes(step)) return BAD_LINK;
  const body = step === 'publish' || step === 'request-changes' ? { note: note?.trim() || null } : {};
  const res = await api<Draft>('POST', `/v1/catalog/authoring/drafts/${draftId}/${step}`, body);
  if (!res.ok) return { ok: false, error: friendlyError(res.error), code: res.error.code };
  refresh();
  return { ok: true, data: res.data };
}

export async function discardDraft(draftId: string): Promise<Outcome<null>> {
  if (!isUuid(draftId)) return BAD_LINK;
  const res = await api('DELETE', `/v1/catalog/authoring/drafts/${draftId}`);
  if (!res.ok) return { ok: false, error: friendlyError(res.error) };
  redirect('/app/authoring?discarded=1');
}

/** An upload link for a cover photo or video in a draft (the browser then sends the file there). */
export async function startCourseMediaUpload(
  draftId: string,
  file: { kind: 'image' | 'video'; fileName: string; contentType: string; size: number },
): Promise<Outcome<CourseMediaUpload>> {
  if (!isUuid(draftId) || (file.kind !== 'image' && file.kind !== 'video')) return BAD_LINK;
  const res = await api<CourseMediaUpload>('POST', `/v1/catalog/authoring/drafts/${draftId}/media`, file);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}
