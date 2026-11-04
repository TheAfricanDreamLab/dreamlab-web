'use server';

import type { CircleContact, CircleMeetup, CirclePost, CirclePostPage, CircleUploadTicket } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { fromLocalInput } from '@/lib/cohorts';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { LOCAL_TIME, NO_ZONE, zoneOf } from '@/lib/zones';
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

// ---------- contact details and meetups (COMM-3) ----------

const BAD_FORM: FormState = { error: 'This page’s link isn’t right. Open the circle again.' };

/** What I share with the circle; a blank form shares nothing. */
export async function saveCircleContact(_: FormState, fd: FormData): Promise<FormState> {
  const circleId = str(fd, 'circleId');
  if (!isUuid(circleId)) return BAD_FORM;
  const values = { email: str(fd, 'email'), phone: str(fd, 'phone').replace(/[\s()-]/g, ''), linkedin: str(fd, 'linkedin') };
  const whatsapp = fd.get('whatsapp') === 'on';
  const res = await api<CircleContact>('PUT', `/v1/learning/circles/${circleId}/contact`, {
    email: values.email || null,
    phone: values.phone || null,
    whatsapp,
    linkedin: values.linkedin || null,
  });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values: { ...values, whatsapp: whatsapp ? 'on' : '' } };
  refresh();
  const c = res.data;
  return { notice: c.email || c.phone || c.linkedin ? 'Saved. The people in this circle can now see what you shared.' : 'Saved. You are not sharing any contact details.' };
}

export async function scheduleCircleMeetup(_: FormState, fd: FormData): Promise<FormState> {
  const circleId = str(fd, 'circleId');
  if (!isUuid(circleId)) return BAD_FORM;
  const values = {
    title: str(fd, 'title'),
    startsAt: str(fd, 'startsAt'),
    durationMin: str(fd, 'durationMin') || '60',
    mode: str(fd, 'mode') || 'virtual',
    location: str(fd, 'location'),
    details: str(fd, 'details'),
  };
  const zone = zoneOf(fd);
  if (!zone) return { error: NO_ZONE, values };
  const startsAt = LOCAL_TIME.test(values.startsAt) ? fromLocalInput(values.startsAt, zone) : null;
  if (!startsAt) return { error: 'Choose a date and time.', fields: { startsAt: 'Choose a date and time' }, values };
  if (values.mode !== 'virtual' && values.mode !== 'physical') return { error: 'Choose online or in person.', values };
  if (values.mode === 'physical' && !values.location) return { error: 'Say where you will meet.', fields: { location: 'Where you will meet' }, values };
  const res = await api<CircleMeetup>('POST', `/v1/learning/circles/${circleId}/meetups`, {
    title: values.title,
    startsAt,
    durationMin: Number(values.durationMin),
    mode: values.mode,
    location: values.mode === 'physical' ? values.location : null,
    details: values.details,
  });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  refresh();
  return { notice: 'Meetup scheduled. Everyone in the circle has been told, and will be reminded an hour before.' };
}

export async function cancelCircleMeetup(_: FormState, fd: FormData): Promise<FormState> {
  const meetupId = str(fd, 'meetupId');
  if (!isUuid(meetupId)) return BAD_FORM;
  const res = await api('DELETE', `/v1/learning/circle-meetups/${meetupId}`);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Cancelled. The circle has been told.' };
}
