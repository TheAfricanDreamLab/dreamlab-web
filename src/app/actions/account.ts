'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { friendlyError, fieldErrors } from '@/lib/errors';
import { FormState } from '@/lib/forms';
import { api } from '@/lib/gateway';
import { clearTokens } from '@/lib/session';

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const newPassword = String(fd.get('password') ?? '');
  if (newPassword !== String(fd.get('confirm') ?? '')) return { error: 'The two new passwords don’t match yet.' };
  const res = await api('POST', '/v1/auth/password/change', { currentPassword: String(fd.get('current') ?? ''), newPassword });
  if (!res.ok) return { error: friendlyError(res.error), fields: fieldErrors(res.error) };
  revalidatePath('/app/account');
  return { notice: 'Password changed. You’ve been signed out on your other devices.' };
}

export async function revokeSession(fd: FormData): Promise<void> {
  await api('DELETE', `/v1/auth/sessions/${String(fd.get('sessionId') ?? '')}`);
  revalidatePath('/app/account');
}

export async function signOutEverywhere(): Promise<void> {
  await api('POST', '/v1/auth/logout-all', {});
  await clearTokens();
  redirect('/login?signedout=1');
}
