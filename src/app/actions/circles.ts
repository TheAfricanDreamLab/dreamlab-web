'use server';

import type { CirclePost, CirclePostPage, CircleUploadTicket } from '@dreamlab/contracts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import type { Outcome } from './community';

/*
 * A Dream Circle's board (COMM-2). The browser calls these and keeps the page itself: posting, pages
 * of older posts and replies arrive without reloading the whole space.
 */

const BAD = { ok: false as const, error: 'That link is not valid.' };

/** An upload link for one file; the browser then sends it straight to storage. */
export async function startCircleUpload(
  circleId: string,
  file: { fileName: string; contentType: string; size: number; durationSec?: number; width?: number; height?: number },
): Promise<Outcome<CircleUploadTicket>> {
  if (!isUuid(circleId)) return BAD;
  const res = await api<CircleUploadTicket>('POST', `/v1/learning/circles/${circleId}/uploads`, file);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}

export async function postToCircle(circleId: string, post: { body: string; attachmentIds: string[]; parentId?: string }): Promise<Outcome<CirclePost>> {
  if (!isUuid(circleId) || (post.parentId && !isUuid(post.parentId))) return BAD;
  const res = await api<CirclePost>('POST', `/v1/learning/circles/${circleId}/posts`, post);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}

/** Older posts (`before`), or a post's replies (`parentId`). */
export async function loadCirclePosts(circleId: string, q: { before?: string; parentId?: string }): Promise<Outcome<CirclePostPage>> {
  if (!isUuid(circleId) || (q.parentId && !isUuid(q.parentId))) return BAD;
  const params = new URLSearchParams();
  if (q.before) params.set('before', q.before);
  if (q.parentId) params.set('parentId', q.parentId);
  params.set('limit', q.parentId ? '50' : '20');
  const res = await api<CirclePostPage>('GET', `/v1/learning/circles/${circleId}/posts?${params}`);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}

export async function removeCirclePost(postId: string): Promise<Outcome<null>> {
  if (!isUuid(postId)) return BAD;
  const res = await api('DELETE', `/v1/learning/circle-posts/${postId}`);
  return res.ok ? { ok: true, data: null } : { ok: false, error: friendlyError(res.error) };
}

export async function pinCirclePost(postId: string, pinned: boolean): Promise<Outcome<CirclePost>> {
  if (!isUuid(postId)) return BAD;
  const res = await api<CirclePost>('PUT', `/v1/learning/circle-posts/${postId}/pin`, { pinned });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}
