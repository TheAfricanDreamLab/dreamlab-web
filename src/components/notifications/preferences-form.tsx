'use client';

import { useActionState } from 'react';
import { saveNotificationPreferences } from '@/app/actions/notifications';
import { SubmitButton } from '@/components/auth/forms';
import { Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

export function NotificationPreferencesForm({ categories, email }: { categories: [string, string][]; email: Record<string, boolean> }) {
  const [state, action] = useActionState(saveNotificationPreferences, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-1">
        <legend className="mb-2 text-[14px] text-muted">Email me about:</legend>
        {categories.map(([key, label]) => (
          <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-[14.5px] text-body hover:bg-surface">
            <input type="checkbox" name={`email:${key}`} defaultChecked={email[key] !== false} className="h-5 w-5 accent-[var(--color-forest)]" />
            {label}
          </label>
        ))}
      </fieldset>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <SubmitButton pending="Saving…">Save email choices</SubmitButton>
    </form>
  );
}
