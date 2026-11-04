'use client';

import { CIRCLE_ATTACHMENTS_MAX, CIRCLE_POST_MAX_CHARS, CIRCLE_VOICE_MAX_SECONDS, type CirclePost } from '@dreamlab/contracts';
import { useEffect, useId, useRef, useState } from 'react';
import { postToCircle, startCircleUpload } from '@/app/actions/circles';
import { Icon } from '@/components/ui/icons';
import { cx, Notice } from '@/components/ui/primitives';
import { CIRCLE_ACCEPT, clock, prepareFile, type PreparedFile, voiceMimeType } from '@/lib/circle-media';
import { attempt } from './attempt';
import { fileSize, putFile } from '@/lib/upload';

interface Pending {
  key: string;
  prepared: PreparedFile;
  /** 0..1 while uploading; 1 when stored. */
  progress: number;
  attachmentId?: string;
  error?: string;
  preview?: string;
}

const iconButton = 'grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40';

/**
 * Write a post or a reply: text, pictures, videos, files and voice messages. Each file starts
 * uploading straight to storage as soon as it is chosen, so posting itself is quick.
 */
export function Composer({ circleId, parentId, placeholder, onPosted, compact = false }: { circleId: string; parentId?: string; placeholder: string; onPosted: (post: CirclePost) => void; compact?: boolean }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  /** Files on the post, counting those still being prepared, so quick picks cannot pass the limit. */
  const slots = useRef(0);
  const textId = useId();

  // Object URLs for previews are released when their file is removed or posted, and when this closes.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const live = previews.current;
    return () => live.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  const release = (gone: Pending[]) =>
    gone.forEach((f) => {
      if (!f.preview) return;
      URL.revokeObjectURL(f.preview);
      previews.current.delete(f.preview);
    });

  const update = (key: string, change: Partial<Pending>) => setFiles((all) => all.map((f) => (f.key === key ? { ...f, ...change } : f)));

  async function add(raw: File[]) {
    setError(null);
    const room = Math.max(0, CIRCLE_ATTACHMENTS_MAX - slots.current);
    if (raw.length > room) setError(`A post can carry ${CIRCLE_ATTACHMENTS_MAX} files at most.`);
    const taken = raw.slice(0, room);
    slots.current += taken.length;
    for (const file of taken) {
      const prepared = await prepareFile(file);
      if ('error' in prepared) {
        slots.current -= 1;
        setError(prepared.error);
        continue;
      }
      const key = String((seq.current += 1));
      const preview = prepared.kind === 'image' ? URL.createObjectURL(prepared.file) : undefined;
      if (preview) previews.current.add(preview);
      setFiles((all) => [...all, { key, prepared, progress: 0, preview }]);
      void upload(key, prepared);
    }
  }

  async function upload(key: string, p: PreparedFile) {
    const ticket = await attempt(() =>
      startCircleUpload(circleId, {
        fileName: p.file.name,
        contentType: p.file.type || 'application/octet-stream',
        size: p.file.size,
        durationSec: p.durationSec,
        width: p.width,
        height: p.height,
      }),
    );
    if (!ticket.ok) return update(key, { error: ticket.error });
    try {
      await putFile(ticket.data, p.file, (share) => update(key, { progress: Math.min(share, 0.99) }));
      update(key, { progress: 1, attachmentId: ticket.data.attachmentId });
    } catch (e) {
      update(key, { error: e instanceof Error ? e.message : 'The upload failed.' });
    }
  }

  const uploading = files.some((f) => !f.error && f.progress < 1);
  const ready = files.filter((f) => f.attachmentId);
  const canPost = !posting && !uploading && (body.trim().length > 0 || ready.length > 0) && !files.some((f) => f.error);

  async function submit() {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    // What is sent now; text and files added while it posts stay for the next one.
    const sentBody = body;
    const sent = new Set(ready.map((f) => f.key));
    const res = await attempt(() => postToCircle(circleId, { body: sentBody.trim(), attachmentIds: ready.map((f) => f.attachmentId!), parentId }));
    setPosting(false);
    if (!res.ok) return setError(res.error);
    setBody((now) => (now === sentBody ? '' : now));
    release(ready);
    slots.current -= sent.size;
    setFiles((all) => all.filter((f) => !sent.has(f.key)));
    onPosted(res.data);
  }

  return (
    <div className={cx('space-y-3', !compact && 'rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line')}>
      <label htmlFor={textId} className="sr-only">
        {placeholder}
      </label>
      <textarea
        id={textId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submit();
        }}
        maxLength={CIRCLE_POST_MAX_CHARS}
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        className="w-full resize-y rounded-[var(--radius-field)] bg-surface px-3.5 py-3 text-[15px] text-ink ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Files for this post">
          {files.map((f) => (
            <li key={f.key} className="relative flex w-40 flex-col gap-1 rounded-lg bg-surface p-2 text-[12.5px] ring-1 ring-line">
              {f.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not yet uploaded
                <img src={f.preview} alt="" className="h-20 w-full rounded object-cover" />
              ) : (
                <span className="flex h-20 items-center justify-center rounded bg-card text-muted">
                  <Icon name={f.prepared.kind === 'audio' ? 'mic' : f.prepared.kind === 'video' ? 'video' : 'file'} className="h-7 w-7" />
                </span>
              )}
              <span className="truncate text-ink" title={f.prepared.file.name}>
                {f.prepared.kind === 'audio' && f.prepared.durationSec ? `Voice message · ${clock(f.prepared.durationSec)}` : f.prepared.file.name}
              </span>
              <span className="text-muted">{f.error ? <span className="text-danger-ink">{f.error}</span> : f.progress < 1 ? `Uploading ${Math.round(f.progress * 100)}%` : fileSize(f.prepared.file.size)}</span>
              {f.progress < 1 && !f.error && (
                <span className="h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="block h-full bg-primary transition-[width]" style={{ width: `${Math.round(f.progress * 100)}%` }} />
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  release([f]);
                  slots.current -= 1;
                  setFiles((all) => all.filter((x) => x.key !== f.key));
                }}
                aria-label={`Remove ${f.prepared.file.name}`}
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-card/90 text-muted ring-1 ring-line hover:text-danger-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex items-center gap-1">
        <input
          ref={picker}
          type="file"
          multiple
          accept={CIRCLE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            void add([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
        <button type="button" className={iconButton} onClick={() => picker.current?.click()} disabled={files.length >= CIRCLE_ATTACHMENTS_MAX} aria-label="Add pictures, videos or files" title="Pictures, videos and files">
          <Icon name="clip" className="h-5 w-5" />
        </button>
        <VoiceRecorder disabled={files.length >= CIRCLE_ATTACHMENTS_MAX} onRecorded={(file) => void add([file])} onError={setError} />
        <span className="ml-auto text-[12px] text-faint">{body.length > CIRCLE_POST_MAX_CHARS - 200 ? `${CIRCLE_POST_MAX_CHARS - body.length} left` : ''}</span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canPost}
          className="h-10 rounded-full bg-primary px-5 text-[14px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-heavy"
        >
          {posting ? 'Posting…' : uploading ? 'Uploading…' : parentId ? 'Reply' : 'Post'}
        </button>
      </div>
    </div>
  );
}

/** Record a voice message (compact Opus where the browser has it), up to five minutes. */
function VoiceRecorder({ onRecorded, onError, disabled }: { onRecorded: (file: File) => void; onError: (message: string) => void; disabled: boolean }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    const mimeType = voiceMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) return onError('This browser cannot record voice messages. Record one on your phone and attach it instead.');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return onError('Allow the microphone to record a voice message.');
    }
    // Closed while the browser was asking for the microphone: let it go, record nothing.
    if (!mounted.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
    const startedAt = Date.now();
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(timer.current);
      stream.getTracks().forEach((t) => t.stop());
      setSeconds(null);
      const type = mimeType.split(';')[0]!;
      const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
      if ((Date.now() - startedAt) / 1000 < 1) return;
      onRecorded(new File([new Blob(chunks, { type })], `voice-message-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${ext}`, { type }));
    };
    rec.start(1000);
    recorder.current = rec;
    setSeconds(0);
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - startedAt) / 1000);
      setSeconds(s);
      if (s >= CIRCLE_VOICE_MAX_SECONDS) rec.stop();
    }, 500);
  }

  if (seconds !== null) {
    return (
      <span className="flex items-center gap-2 rounded-full bg-danger-tint px-3 py-1.5 text-[13px] font-semibold text-danger-ink" role="status">
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden />
        Recording {clock(seconds)}
        <button type="button" onClick={() => recorder.current?.stop()} className="rounded-full bg-card px-2.5 py-0.5 text-ink ring-1 ring-line">
          Stop
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={iconButton} onClick={() => void start()} disabled={disabled} aria-label="Record a voice message" title="Voice message">
      <Icon name="mic" className="h-5 w-5" />
    </button>
  );
}
