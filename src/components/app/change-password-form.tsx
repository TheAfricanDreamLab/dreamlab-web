'use client';

import { useActionState } from 'react';
import { changePassword } from '@/app/actions/account';
import { SubmitButton } from '@/components/auth/forms';
import { NewPasswordInput, PasswordInput } from '@/components/ui/fields';
import { Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

export function ChangePasswordForm({ avoid }: { avoid: string[] }) {
  const [state, action] = useActionState(changePassword, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <PasswordInput name="current" label="Current password" autoComplete="current-password" required />
      <NewPasswordInput label="New password" avoid={avoid} />
      <PasswordInput name="confirm" label="Type the new one again" autoComplete="new-password" required />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <SubmitButton pending="Saving…">Change password</SubmitButton>
    </form>
  );
}
