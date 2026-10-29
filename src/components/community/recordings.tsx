'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { startRecordingUpload } from '@/app/actions/community';
import { TextInput } from '@/components/ui/fields';
import { Icon } from '@/components/ui/icons';
import { cx, Notice } from '@/components/ui/primitives';
import { MAX_RECORDING_BYTES, type Recording, RECORDING_TYPES } from '@/lib/community';
import { fileSize, putFile } from '@/lib/upload';

/** A session's recordings; each opens through /recordings/<id>, which checks who may see it. */
export function RecordingList({ recordings }: { recordings: Recording[] }) {
  if (recordings.length === 0) return null;
  return (
    <ul className="space-y-1.5" aria-label="Recordings">
      {recordings.map((r) => (
        <li key={r.id}>
          <a
            href={`/recordings/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2 ring-1 ring-line hover:ring-primary"
          >
            <Icon name="file" className="h-4 w-4 shrink-0 text-link" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-link">{r.title}</span>
            <span className="shrink-0 text-[12.5px] text-muted">{fileSize(r.size)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Faculty upload a class recording (LIVE-1): the API hands out an upload link and the file goes
 * straight to storage, so a large video never passes through our servers.
 */
export function RecordingUploadForm({ cohortId, sessionId, defaultTitle }: { cohortId: string; sessionId: string; defaultTitle: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(null);
    if (!(RECORDING_TYPES as readonly string[]).includes(file.type)) return setError('Choose an MP4 or WebM video, or an MP3, OGG, WebM or M4A audio file.');
    if (file.size > MAX_RECORDING_BYTES) return setError(`That file is ${fileSize(file.size)}; the limit is 2 GB.`);
    if (title.trim().length < 2) return setError('Give the recording a title first.');
    setProgress(0);
    try {
      const ticket = await startRecordingUpload(cohortId, sessionId, { title: title.trim(), fileName: file.name, contentType: file.type, size: file.size });
      if (!ticket.ok) return setError(ticket.error);
      await putFile(ticket.data, file, setProgress);
      setDone(`${title.trim()} is uploaded. The cohort’s learners can open it now.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload failed. Try again.');
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <TextInput label="Recording title" name="recordingTitle" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} disabled={progress !== null} />
      <label
        className={cx(
          'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ring-1 focus-within:ring-2 focus-within:ring-primary',
          progress !== null ? 'cursor-wait bg-surface text-muted ring-line' : 'cursor-pointer bg-card text-link ring-line-strong hover:bg-surface',
        )}
      >
        <Icon name="upload" className="h-4 w-4" />
        {progress !== null ? `Uploading ${Math.round(progress * 100)}%…` : 'Upload a recording'}
        <input ref={input} type="file" accept={RECORDING_TYPES.join(',')} disabled={progress !== null} onChange={(e) => void upload(e.target.files?.[0])} className="sr-only" />
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-danger-ink">
          {error}
        </p>
      )}
      {done && <Notice tone="success">{done}</Notice>}
    </div>
  );
}
