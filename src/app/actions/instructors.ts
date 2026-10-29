'use server';

import type { CourseMediaUpload, InstructorProfile } from '@dreamlab/contracts';
import { refresh } from 'next/cache';
import { fieldErrors, friendlyError } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { isUuid, SLUG } from '@/lib/learning';
import { STAFF_ROLES, type StaffRole } from '@/lib/instructors';
import type { Outcome } from './authoring';

const BAD_LINK = { error: 'This page’s link isn’t right. Open it again from Authoring.' };

/** Add a profile, or save one (profileId set). */
export async function saveInstructor(_: FormState, fd: FormData): Promise<FormState> {
  const profileId = str(fd, 'profileId');
  if (profileId && !isUuid(profileId)) return BAD_LINK;
  const values = { name: str(fd, 'name'), title: str(fd, 'title'), bio: str(fd, 'bio'), photoUrl: str(fd, 'photoUrl') };
  if (values.name.length < 2) return { error: 'Give the instructor’s name.', fields: { name: 'At least two characters' }, values };
  const body = { name: values.name, title: values.title, bio: values.bio, photoUrl: values.photoUrl || null, userId: null };
  const res = profileId ? await api<InstructorProfile>('PUT', `/v1/catalog/instructors/${profileId}`, body) : await api<InstructorProfile>('POST', '/v1/catalog/instructors', body);
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error), values };
  refresh();
  return { notice: profileId ? 'Saved.' : `${res.data.name} added.` };
}

export async function removeInstructor(_: FormState, fd: FormData): Promise<FormState> {
  const profileId = str(fd, 'profileId');
  if (!isUuid(profileId)) return BAD_LINK;
  const res = await api('DELETE', `/v1/catalog/instructors/${profileId}`);
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: 'Removed.' };
}

/** An upload link for a profile photo (the browser then sends the file there). */
export async function startInstructorPhotoUpload(file: { fileName: string; contentType: string; size: number }): Promise<Outcome<CourseMediaUpload>> {
  if (!file || typeof file.fileName !== 'string' || typeof file.contentType !== 'string' || !Number.isInteger(file.size)) return { ok: false, error: BAD_LINK.error };
  const res = await api<CourseMediaUpload>('POST', '/v1/catalog/instructors/photo', file);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error) };
}

/** Who teaches a course: each chosen profile with its role, in the order listed. */
export async function setCourseStaff(_: FormState, fd: FormData): Promise<FormState> {
  const courseSlug = str(fd, 'courseSlug');
  if (!SLUG.test(courseSlug)) return BAD_LINK;
  const staff: { profileId: string; role: StaffRole }[] = [];
  for (const profileId of fd.getAll('profileId').map(String)) {
    const role = str(fd, `role-${profileId}`) as StaffRole;
    if (!isUuid(profileId) || !STAFF_ROLES.includes(role)) return BAD_LINK;
    staff.push({ profileId, role });
  }
  const res = await api('PUT', `/v1/catalog/courses/${courseSlug}/staff`, { staff });
  if (!res.ok) return { error: friendlyError(res.error) };
  refresh();
  return { notice: staff.length ? 'Course staff saved. The course page shows them now.' : 'Course staff cleared. The course page shows the instructors in its file again.' };
}
