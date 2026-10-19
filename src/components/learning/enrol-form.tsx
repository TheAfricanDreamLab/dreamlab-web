'use client';

import { useActionState } from 'react';
import { enrol } from '@/app/actions/learning';
import { SubmitButton } from '@/components/auth/forms';
import { Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';

export function EnrolForm({ courseSlug }: { courseSlug: string }) {
  const [state, action] = useActionState(enrol, {} as FormState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseSlug" value={courseSlug} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Enrolling you…">Enrol for free</SubmitButton>
    </form>
  );
}
