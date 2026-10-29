'use client';

import { useActionState, useRef, useState } from 'react';
import { removeInstructor, saveInstructor, setCourseStaff, startInstructorPhotoUpload } from '@/app/actions/instructors';
import { SubmitButton } from '@/components/auth/forms';
import { Icon } from '@/components/ui/icons';
import { TextInput } from '@/components/ui/fields';
import { cx, Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { type InstructorProfile, STAFF_ROLE_LABELS, STAFF_ROLES, type StaffRole } from '@/lib/instructors';
import { COURSE_IMAGE_TYPES, fileSize, putFile } from '@/lib/upload';

const MAX_PHOTO = 5 * 1024 * 1024;
const selectClass = 'h-11 rounded-[var(--radius-field)] bg-card px-3 text-[14px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary';

/** Add an instructor, or edit one (`profile` set). The photo goes straight to storage. */
export function InstructorForm({ profile }: { profile?: InstructorProfile }) {
  const [state, action] = useActionState(saveInstructor, {} as FormState);
  const v = state.values ?? {};
  const [photoUrl, setPhotoUrl] = useState(v.photoUrl ?? profile?.photoUrl ?? '');
  const [upload, setUpload] = useState<{ progress: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const bioId = `bio-${profile?.id ?? 'new'}`;

  async function send(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (!COURSE_IMAGE_TYPES.includes(file.type)) return setUploadError('Choose a JPEG, PNG or WebP image.');
    if (file.size > MAX_PHOTO) return setUploadError(`That file is ${fileSize(file.size)}; the limit is ${fileSize(MAX_PHOTO)}.`);
    setUpload({ progress: 0 });
    try {
      const ticket = await startInstructorPhotoUpload({ fileName: file.name, contentType: file.type, size: file.size });
      if (!ticket.ok) return setUploadError(ticket.error);
      await putFile(ticket.data, file, (p) => setUpload({ progress: p }));
      setPhotoUrl(ticket.data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'The upload failed. Try again.');
    } finally {
      setUpload(null);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <form action={action} className="space-y-4">
      {profile && <input type="hidden" name="profileId" value={profile.id} />}
      <input type="hidden" name="photoUrl" value={photoUrl} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Name" name="name" required minLength={2} maxLength={120} defaultValue={v.name ?? profile?.name} error={state.fields?.name} />
        <TextInput label="Title" name="title" maxLength={160} placeholder="Founder, Kano Agritech" defaultValue={v.title ?? profile?.title} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={bioId} className="text-[13px] font-semibold text-ink">
          Short biography
        </label>
        <textarea
          id={bioId}
          name="bio"
          rows={4}
          maxLength={1200}
          defaultValue={v.bio ?? profile?.bio}
          className="w-full rounded-[var(--radius-field)] bg-card px-4 py-3 text-[15px] text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded media, served from storage
          <img src={photoUrl} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-line" />
        ) : (
          <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted ring-1 ring-line">
            <Icon name="user" className="h-6 w-6" />
          </span>
        )}
        <label
          className={cx(
            'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ring-1 focus-within:ring-2 focus-within:ring-primary',
            upload ? 'cursor-wait bg-surface text-muted ring-line' : 'cursor-pointer bg-card text-link ring-line-strong hover:bg-surface',
          )}
        >
          <Icon name="upload" className="h-4 w-4" />
          {upload ? `Uploading ${Math.round(upload.progress * 100)}%…` : photoUrl ? 'Change photo' : 'Upload a photo'}
          <input ref={input} type="file" accept={COURSE_IMAGE_TYPES.join(',')} disabled={!!upload} onChange={(e) => void send(e.target.files?.[0])} className="sr-only" />
        </label>
        {photoUrl && !upload && (
          <button type="button" onClick={() => setPhotoUrl('')} className="min-h-11 px-2 text-[13.5px] font-semibold text-muted hover:text-ink">
            Remove photo
          </button>
        )}
      </div>
      {uploadError && (
        <p role="alert" className="text-[13px] text-danger-ink">
          {uploadError}
        </p>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <div className="sm:max-w-xs">
        <SubmitButton pending="Saving…" disabled={!!upload}>
          {profile ? 'Save' : 'Add instructor'}
        </SubmitButton>
      </div>
    </form>
  );
}

export function RemoveInstructorForm({ profile }: { profile: InstructorProfile }) {
  const [state, action] = useActionState(removeInstructor, {} as FormState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Remove ${profile.name}? They come off every course they teach.`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="profileId" value={profile.id} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <button type="submit" className="min-h-10 rounded-lg px-3 text-[13.5px] font-semibold text-danger-ink hover:bg-danger-tint">
        Remove<span className="sr-only"> {profile.name}</span>
      </button>
    </form>
  );
}

/** Who teaches one course. Ticked profiles are saved in list order with their roles. */
export function CourseStaffForm({ course, profiles }: { course: { slug: string; title: string }; profiles: InstructorProfile[] }) {
  const [state, action] = useActionState(setCourseStaff, {} as FormState);
  const current = (p: InstructorProfile) => p.courses.find((c) => c.slug === course.slug)?.role;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseSlug" value={course.slug} />
      <fieldset className="space-y-2">
        <legend className="sr-only">Staff for {course.title}</legend>
        {profiles.map((p) => {
          const role: StaffRole = current(p) ?? 'instructor';
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-field)] bg-card px-3 py-2 ring-1 ring-line has-[:checked]:ring-primary">
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5">
                <input type="checkbox" name="profileId" value={p.id} defaultChecked={!!current(p)} className="accent-[var(--color-primary)]" />
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{p.name}</span>
                  {p.title && <span className="block text-[12.5px] text-muted">{p.title}</span>}
                </span>
              </label>
              <select name={`role-${p.id}`} defaultValue={role} aria-label={`Role of ${p.name} on ${course.title}`} className={selectClass}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {STAFF_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </fieldset>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <div className="sm:max-w-xs">
        <SubmitButton pending="Saving…">Save course staff</SubmitButton>
      </div>
    </form>
  );
}
