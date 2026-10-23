'use client';

import { useActionState, useState } from 'react';
import { createCourseDraft } from '@/app/actions/authoring';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Notice } from '@/components/ui/primitives';
import { slugify } from '@/lib/authoring';
import type { FormState } from '@/lib/forms';

/** Title and web address; the address follows the title until the author edits it. */
export function NewCourseForm() {
  const [state, action] = useActionState(createCourseDraft, {} as FormState);
  const [title, setTitle] = useState(state.values?.title ?? '');
  const [slug, setSlug] = useState(state.values?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(state.values?.slug));
  return (
    <form action={action} className="space-y-4">
      <TextInput
        label="Course title"
        name="title"
        required
        minLength={3}
        maxLength={160}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (!slugEdited) setSlug(slugify(e.target.value, '').slice(0, 80));
        }}
        placeholder="Bronze Casting for Beginners"
      />
      <TextInput
        label="Web address"
        name="slug"
        required
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        minLength={3}
        maxLength={80}
        value={slug}
        onChange={(e) => {
          setSlugEdited(true);
          setSlug(e.target.value.toLowerCase());
        }}
        hint={`/courses/${slug || 'your-course'} · lowercase letters, digits and hyphens. It can’t change later.`}
      />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pending="Starting…">Start writing</SubmitButton>
    </form>
  );
}
