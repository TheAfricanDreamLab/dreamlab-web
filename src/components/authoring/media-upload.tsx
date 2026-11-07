'use client';

import { createContext, useEffect, useRef, useState } from 'react';
import { startCourseMediaUpload } from '@/app/actions/authoring';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { COURSE_FILE_EXTENSIONS, COURSE_IMAGE_TYPES, COURSE_VIDEO_TYPES, fileSize, putFile } from '@/lib/upload';

const LIMITS = { image: 5 * 1024 * 1024, video: 500 * 1024 * 1024, file: 50 * 1024 * 1024 };

/** The draft being edited, for uploads deep in the outline. */
export const DraftIdContext = createContext<string | null>(null);

/**
 * Upload a cover photo or a video for a course draft (MEDIA-1). The file goes straight to storage;
 * `onUploaded` gets its media path (courses/…), served from /media/<path> once published.
 */
export function MediaUploadButton({ draftId, kind, onUploaded, label }: { draftId: string; kind: 'image' | 'video' | 'file'; onUploaded: (path: string, file: File, contentType: string) => void; label?: string }) {
  const [state, setState] = useState<{ progress: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const types = kind === 'image' ? COURSE_IMAGE_TYPES : kind === 'video' ? COURSE_VIDEO_TYPES : Object.keys(COURSE_FILE_EXTENSIONS).map((e) => `.${e}`);
  // An upload can take minutes; the author keeps editing meanwhile. Call the newest callback, which
  // sees the draft as it is now, so the result never overwrites edits made during the upload.
  const latest = useRef(onUploaded);
  useEffect(() => {
    latest.current = onUploaded;
  }, [onUploaded]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    // Downloads are typed by their extension, the way the site serves them.
    const contentType = kind === 'file' ? COURSE_FILE_EXTENSIONS[file.name.split('.').pop()?.toLowerCase() ?? ''] : file.type;
    if (!contentType || (kind !== 'file' && !types.includes(file.type))) {
      return setError(kind === 'image' ? 'Choose a JPEG, PNG or WebP image.' : kind === 'video' ? 'Choose an MP4 or WebM video.' : 'Choose a PDF, Word, PowerPoint, Excel, ZIP, text, CSV, picture or MP3 file.');
    }
    if (file.size > LIMITS[kind]) return setError(`That file is ${fileSize(file.size)}; the limit is ${fileSize(LIMITS[kind])}.`);
    setState({ progress: 0, name: file.name });
    try {
      const ticket = await startCourseMediaUpload(draftId, { kind, fileName: file.name, contentType, size: file.size });
      if (!ticket.ok) return setError(ticket.error);
      await putFile(ticket.data, file, (p) => setState({ progress: p, name: file.name }));
      latest.current(ticket.data.path, file, contentType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload failed. Try again.');
    } finally {
      setState(null);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-1">
      <label
        className={cx(
          'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ring-1 focus-within:ring-2 focus-within:ring-primary',
          state ? 'cursor-wait bg-surface text-muted ring-line' : 'cursor-pointer bg-card text-link ring-line-strong hover:bg-surface',
        )}
      >
        <Icon name="upload" className="h-4 w-4" />
        {state ? `Uploading ${Math.round(state.progress * 100)}%…` : (label ?? (kind === 'image' ? 'Upload a photo' : kind === 'video' ? 'Upload a video' : 'Upload a file'))}
        <input ref={input} type="file" accept={types.join(',')} disabled={!!state} onChange={(e) => void upload(e.target.files?.[0])} className="sr-only" />
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
