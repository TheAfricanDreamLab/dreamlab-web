'use server';

import { MAX_SUSPENSION_DAYS, type PlatformUserDetail, type ProgramAuthoring, type SetUserStatus, USER_STATUSES, type UserStatus } from '@dreamlab/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { friendlyError, longDate } from '@/lib/errors';
import { type FormState, str } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { type AdminCourse, type ImportResult, isUuid } from '@/lib/learning';

/** List, hide or feature a course in the catalogue. */
export async function setCourseFlag(fd: FormData): Promise<void> {
  const courseId = str(fd, 'courseId');
  const flag = str(fd, 'flag');
  if (!isUuid(courseId) || (flag !== 'listed' && flag !== 'featured')) redirect('/app/admin/catalog?error=flag_invalid');
  const res = await api<AdminCourse>('PATCH', `/v1/catalog/admin/courses/${courseId}`, { [flag]: str(fd, 'value') === 'true' });
  revalidatePath('/app/admin/catalog');
  // Only a known-safe error code travels in the URL; the page turns it into words.
  if (!res.ok) redirect(`/app/admin/catalog?error=${/^[a-z_]{1,64}$/.test(res.error.code ?? '') ? res.error.code : 'flag_update_failed'}`);
}

const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

/** Upload an authored course or programme (.json) and publish it. */
export async function importContent(_: FormState, fd: FormData): Promise<FormState> {
  const kind = str(fd, 'kind') === 'program' ? 'program' : 'course';
  const file = fd.get('file');
  const values = { kind };
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a .json file to import.', values };
  if (file.size > MAX_IMPORT_BYTES) return { error: 'That file is too big. Course files are usually well under 4 MB.', values };
  let body: unknown;
  try {
    body = JSON.parse(await file.text());
  } catch {
    return { error: `${file.name} isn’t valid JSON. Check it in an editor and try again.`, values };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'The file should hold one course or programme object.', values };

  if (kind === 'program') {
    const res = await api<{ slug: string }>('POST', '/v1/catalog/admin/programs/import', body);
    if (!res.ok) return { error: importError(res.error), values };
    revalidatePath('/app/admin/catalog');
    return { notice: `Programme “${res.data.slug}” imported.`, values };
  }
  const res = await api<ImportResult>('POST', '/v1/catalog/admin/courses/import', body);
  if (!res.ok) return { error: importError(res.error), values };
  revalidatePath('/app/admin/catalog');
  const { slug, published, versionNo } = res.data;
  return {
    notice: published
      ? `Course “${slug}” imported. Version ${versionNo} is now published.`
      : versionNo
        ? `Course “${slug}” is unchanged. Version ${versionNo} stays published.`
        : `Course “${slug}” saved as coming soon (no modules yet).`,
    values,
  };
}

function importError(error: Parameters<typeof friendlyError>[0]): string {
  const base = friendlyError(error);
  const details = Array.isArray(error?.details) ? (error.details as { path?: string; message?: string }[]).slice(0, 5) : [];
  if (!details.length) return base;
  return `${base} ${details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join(' · ')}`;
}

/** Save a programme from the browser editor (an import of the whole programme). */
export async function saveProgram(doc: ProgramAuthoring): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || typeof doc.slug !== 'string') return { ok: false, error: 'This programme can’t be saved as it is. Reload the page.' };
  const res = await api<{ slug: string }>('POST', '/v1/catalog/admin/programs/import', doc);
  if (!res.ok) return { ok: false, error: importError(res.error) };
  revalidatePath('/app/admin/catalog');
  revalidatePath(`/programs/${res.data.slug}`);
  return { ok: true };
}

/** Suspend a person (ends every session) or let them back in. */
export async function setUserStatus(_: FormState, fd: FormData): Promise<FormState> {
  const userId = str(fd, 'userId');
  const status = str(fd, 'status');
  const reason = str(fd, 'reason');
  const message = str(fd, 'message');
  const days = str(fd, 'days');
  const values = { status, reason, message, days };
  if (!isUuid(userId) || !(USER_STATUSES as readonly string[]).includes(status)) return { error: 'Something went wrong. Reload the page and try again.' };
  if (reason.length < 3) return { error: 'Give a short reason. It goes in the audit trail.', values };
  if (message.length > 500) return { error: 'Keep the message to 500 characters.', values };
  const n = Number(days);
  if (status === 'suspended' && days && !(Number.isInteger(n) && n >= 1 && n <= MAX_SUSPENSION_DAYS)) return { error: 'Choose how long the suspension lasts.', values };
  const body: SetUserStatus = {
    status: status as UserStatus,
    reason,
    notify: fd.get('notify') === 'on',
    ...(message ? { message } : {}),
    ...(status === 'suspended' && days ? { until: new Date(Date.now() + n * 86_400_000).toISOString() } : {}),
  };
  const res = await api<PlatformUserDetail>('POST', `/v1/platform/users/${userId}/status`, body);
  if (!res.ok) return { error: friendlyError(res.error), values };
  revalidatePath(`/app/admin/users/${userId}`);
  revalidatePath('/app/admin/users');
  revalidatePath('/app/admin');
  const told = body.notify ? ' We’ve emailed them.' : '';
  const name = res.data.fullName;
  return {
    notice:
      status === 'banned'
        ? `${name} is banned and signed out everywhere.${told}`
        : status === 'suspended'
          ? `${name} is suspended${res.data.suspendedUntil ? ` until ${longDate(res.data.suspendedUntil)}` : ''} and signed out everywhere.${told}`
          : `${name} can sign in again.${told}`,
  };
}
