'use client';

import { useRef, useState } from 'react';
import { startSubmissionUpload } from '@/app/actions/learning';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { fileSize, MAX_SUBMISSION_FILE_BYTES, MAX_SUBMISSION_FILES, putFile, SUBMISSION_FILE_TYPES } from '@/lib/upload';

type Attachment = { key: string; name: string; size: number; fileId: string | null; progress: number; error: string | null };

/**
 * Files for an assignment: each uploads as soon as it is chosen, straight to storage. Only finished
 * uploads are submitted (hidden `fileId` inputs); the form waits while any is still going.
 */
export function FileAttachments({ enrollmentId, itemId, onBusyChange }: { enrollmentId: string; itemId: string; onBusyChange: (busy: boolean) => void }) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const input = useRef<HTMLInputElement>(null);
  // Files that count against the limit (uploaded or still uploading), kept outside render state so
  // files chosen while others are still uploading are counted too.
  const used = useRef(0);
  const update = (key: string, patch: Partial<Attachment>) =>
    setFiles((list) => {
      const next = list.map((f) => (f.key === key ? { ...f, ...patch } : f));
      onBusyChange(next.some((f) => !f.fileId && !f.error));
      return next;
    });

  async function add(chosen: FileList | null) {
    if (!chosen) return;
    // Every chosen file is listed (and counted) before any upload starts, so Submit stays closed
    // until the last of them is done.
    const queue: { key: string; file: File }[] = [];
    const entries: Attachment[] = [];
    for (const file of [...chosen]) {
      if (used.current >= MAX_SUBMISSION_FILES) break;
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const problem = !SUBMISSION_FILE_TYPES.includes(file.type)
        ? 'This kind of file can’t be attached. Use PDF, Word, PowerPoint, Excel, an image, a ZIP, MP4 or MP3.'
        : file.size > MAX_SUBMISSION_FILE_BYTES
          ? 'Files can be at most 50 MB.'
          : null;
      entries.push({ key, name: file.name, size: file.size, fileId: null, progress: 0, error: problem });
      if (!problem) {
        used.current++;
        queue.push({ key, file });
      }
    }
    setFiles((list) => [...list, ...entries]);
    if (queue.length > 0) onBusyChange(true);
    for (const { key, file } of queue) {
      try {
        const ticket = await startSubmissionUpload(enrollmentId, itemId, { fileName: file.name, contentType: file.type, size: file.size });
        if ('error' in ticket) throw new Error(ticket.error);
        await putFile(ticket, file, (p) => update(key, { progress: p }));
        update(key, { fileId: ticket.fileId, progress: 1 });
      } catch (err) {
        used.current--;
        update(key, { error: err instanceof Error ? err.message : 'The upload failed. Try again.' });
      }
    }
    if (input.current) input.current.value = '';
  }

  const remove = (key: string) =>
    setFiles((list) => {
      if (list.some((f) => f.key === key && !f.error)) used.current--;
      const next = list.filter((f) => f.key !== key);
      onBusyChange(next.some((f) => !f.fileId && !f.error));
      return next;
    });
  const active = files.filter((f) => !f.error).length;

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-ink">Files (optional)</p>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.key} className={cx('flex items-center gap-3 rounded-[var(--radius-field)] px-3 py-2.5 ring-1', f.error ? 'bg-danger-tint ring-danger-line' : 'bg-card ring-line')}>
              {f.fileId && <input type="hidden" name="fileId" value={f.fileId} />}
              <Icon name={f.error ? 'close' : f.fileId ? 'check' : 'upload'} className={cx('h-4 w-4 shrink-0', f.error ? 'text-danger-ink' : 'text-link')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-ink">{f.name}</span>
                <span className="block text-[12.5px] text-muted" aria-live="polite">
                  {f.error ?? (f.fileId ? `${fileSize(f.size)} · uploaded` : `Uploading… ${Math.round(f.progress * 100)}%`)}
                </span>
                {!f.fileId && !f.error && (
                  <span aria-hidden className="mt-1 block h-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full bg-primary transition-[width]" style={{ width: `${Math.round(f.progress * 100)}%` }} />
                  </span>
                )}
              </span>
              <button type="button" onClick={() => remove(f.key)} aria-label={`Remove ${f.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {active < MAX_SUBMISSION_FILES && (
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-field)] border-2 border-dashed border-line-strong bg-card px-4 text-[14px] font-semibold text-link hover:border-primary focus-within:ring-2 focus-within:ring-primary">
          <Icon name="plus" className="h-4 w-4" />
          Attach files
          <input ref={input} type="file" multiple accept={SUBMISSION_FILE_TYPES.join(',')} onChange={(e) => void add(e.target.files)} className="sr-only" />
        </label>
      )}
      <p className="text-[13px] text-muted">Up to {MAX_SUBMISSION_FILES} files, 50 MB each. Only you and the people who grade your work can open them.</p>
    </div>
  );
}
