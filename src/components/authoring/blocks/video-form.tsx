'use client';

import type { LibraryVideo } from '@dreamlab/contracts';
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getVideo, listVideos, lookupVideo } from '@/app/actions/videos';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { BLOCK_INFO, type BlockDoc, videoLink } from '@/lib/blocks';
import { formatClock, formatDuration, parseClock } from '@/lib/media';
import { LIBRARY_VIDEO_TYPES, titleFromFile, videoType } from '@/lib/video-upload';
import { NumberField, TextField } from '../fields';
import { useVideoUploads } from '../video-uploads';
import { ListEditor } from './controls';

/*
 * The video block's form (CAT-6): a video from the organisation's library (uploaded once, streamed
 * in the quality each learner's connection allows, with captions), or a YouTube or Vimeo link whose
 * title and maker are filled in. Chapters, and questions that pause the video, for library videos.
 */

/** The blocks of the step being edited, so a video can ask the step's questions. */
export const StepBlocksContext = createContext<BlockDoc[]>([]);
/** The course's provider, used as a video's credit when nothing else is known. */
export const CourseProviderContext = createContext<string>('');

type Props = { block: BlockDoc; set: (b: BlockDoc) => void };
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const rows = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : []);
const INTERACTIVE = ['choice', 'order', 'match', 'poll', 'scale', 'reflection', 'scenario'];

const SOURCES = [
  { value: 'library', label: 'Video library', hint: 'Upload once, stream on any connection, with captions' },
  { value: 'youtube', label: 'YouTube', hint: 'Paste a link' },
  { value: 'vimeo', label: 'Vimeo', hint: 'Paste a link' },
] as const;

export function VideoForm({ block, set }: Props) {
  const name = useId();
  const latest = useRef(block);
  useEffect(() => {
    latest.current = block;
  }, [block]);
  // Uploads and look-ups finish later: they change the block as it is then.
  const patch = (p: Record<string, unknown>) => set({ ...latest.current, ...p });
  const provider = str(block.provider) || 'library';

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Where the video comes from</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SOURCES.map((s) => (
            <label key={s.value} className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-field)] p-3 ring-1 ring-line has-[:checked]:bg-success-tint has-[:checked]:ring-2 has-[:checked]:ring-primary">
              <input
                type="radio"
                name={name}
                checked={provider === s.value}
                onChange={() => patch({ provider: s.value, videoId: '', durationS: undefined, ...(s.value !== 'library' ? { pauses: undefined } : {}) })}
                className="mt-1 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-[14px] font-semibold text-ink">{s.label}</span>
                <span className="block text-[12px] leading-snug text-muted">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {provider === 'file' && (
          <p className="mt-2 rounded-lg bg-gold-tint px-3 py-2 text-[13px] text-gold-ink ring-1 ring-gold-line">
            This video was uploaded into the course directly. It still plays; upload it to the library for streaming on slow connections, captions and questions.
          </p>
        )}
      </fieldset>

      {provider === 'library' && <LibrarySource block={block} patch={patch} />}
      {(provider === 'youtube' || provider === 'vimeo') && <LinkSource provider={provider} block={block} patch={patch} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Title" value={str(block.title)} maxLength={200} onChange={(v) => patch({ title: v })} />
        <TextField label="Made by" value={str(block.channel)} maxLength={120} onChange={(v) => patch({ channel: v })} hint="Shown as the credit" />
      </div>
      <TextField label="What to watch for (optional)" value={str(block.caption)} maxLength={600} onChange={(v) => patch({ caption: v.trim() ? v : undefined })} />

      <Chapters block={block} patch={patch} />
      {provider === 'library' && <Pauses block={block} patch={patch} />}

      <details className="rounded-lg ring-1 ring-line">
        <summary className="cursor-pointer px-3 py-2 text-[12.5px] font-semibold text-muted hover:text-ink">Play only part of it</summary>
        <div className="grid gap-3 border-t border-line p-3 sm:grid-cols-2">
          <NumberField label="Start at (seconds)" allowEmpty min={0} value={num(block.startS)} onChange={(v) => patch({ startS: v ?? undefined })} />
          <NumberField label="Stop at (seconds)" allowEmpty min={1} value={num(block.endS)} onChange={(v) => patch({ endS: v ?? undefined })} />
        </div>
      </details>
    </div>
  );
}

// ---------- library ----------

function LibrarySource({ block, patch }: { block: BlockDoc; patch: (p: Record<string, unknown>) => void }) {
  const videoId = str(block.videoId);
  const [picking, setPicking] = useState(false);
  const { start } = useVideoUploads();
  const provider = useContext(CourseProviderContext);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!videoType(file)) return setError('Choose an MP4, WebM, MOV or MKV video.');
    start(file, {
      onCreated: (v) =>
        patch({
          videoId: v.id,
          ...(str(block.title) ? {} : { title: titleFromFile(file.name) }),
          ...(str(block.channel) ? {} : { channel: provider || 'Course team' }),
        }),
    });
  };
  const pick = (v: LibraryVideo) => {
    setPicking(false);
    patch({ videoId: v.id, title: str(block.title) || v.title, ...(str(block.channel) ? {} : { channel: provider || 'Course team' }), ...(v.durationS ? { durationS: v.durationS } : {}) });
  };

  return (
    <div className="space-y-2">
      {videoId ? (
        <LibraryCard videoId={videoId} onChange={() => setPicking(true)} onDuration={(s) => num(block.durationS) !== s && patch({ durationS: s })} />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files[0]);
          }}
          className={cx('flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed p-6 text-center transition-colors', dragging ? 'border-primary bg-success-tint' : 'border-line-strong')}
        >
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-surface text-link">
            <Icon name="video" className="h-5 w-5" />
          </span>
          <p className="text-[14px] text-body">Drop a video here, or</p>
          <div className="flex flex-wrap justify-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-forest focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
              <Icon name="upload" className="h-4 w-4" /> Upload a video
              <input type="file" accept={[...LIBRARY_VIDEO_TYPES, '.mkv', '.mov'].join(',')} className="sr-only" onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ''))} />
            </label>
            <button type="button" onClick={() => setPicking(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-card px-4 text-[13.5px] font-semibold text-link ring-1 ring-line-strong hover:bg-surface">
              Choose from the library
            </button>
          </div>
          <p className="text-[12px] text-muted">MP4, MOV, WebM or MKV, up to 2 GB. It keeps uploading while you work.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger-ink">
          {error}
        </p>
      )}
      {picking && <LibraryPicker onPick={pick} onClose={() => setPicking(false)} onUpload={(f) => (setPicking(false), upload(f))} />}
    </div>
  );
}

const STATUS_TEXT: Record<LibraryVideo['status'], string> = {
  uploading: 'Uploading',
  queued: 'Waiting to be processed',
  processing: 'Being prepared for streaming',
  ready: 'Ready',
  failed: 'Couldn’t be processed',
};

/** The chosen library video, kept up to date while it uploads and is processed. */
function LibraryCard({ videoId, onChange, onDuration }: { videoId: string; onChange: () => void; onDuration: (s: number) => void }) {
  const [video, setVideo] = useState<LibraryVideo | null | 'missing'>(null);
  const duration = useRef(onDuration);
  useEffect(() => {
    duration.current = onDuration;
  }, [onDuration]);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      const res = await getVideo(videoId);
      if (!live) return;
      if (!res.ok) return setVideo('missing');
      setVideo(res.data);
      if (res.data.status === 'ready' && res.data.durationS) duration.current(res.data.durationS);
      if (res.data.status !== 'ready' && res.data.status !== 'failed') timer = setTimeout(() => void load(), 4000);
    };
    void load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [videoId]);

  if (video === null) return <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface" aria-label="Loading the video" />;
  if (video === 'missing') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-danger-tint p-3 text-[13.5px] text-danger-ink ring-1 ring-danger-line">
        This video is no longer in the library.
        <button type="button" onClick={onChange} className="font-semibold underline">
          Choose another
        </button>
      </div>
    );
  }
  const busy = video.status !== 'ready' && video.status !== 'failed';
  return (
    <div className="flex gap-3 rounded-[var(--radius-card)] bg-surface p-3 ring-1 ring-line">
      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-forest sm:w-40">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the library thumbnail, from /media
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-white/70">
            <Icon name="video" className="h-6 w-6" />
          </span>
        )}
        {video.durationS && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 font-mono text-[10.5px] text-white">{formatDuration(video.durationS)}</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[14px] font-semibold text-ink">{video.title}</p>
        <p className={cx('text-[12.5px]', video.status === 'failed' ? 'text-danger-ink' : video.status === 'ready' ? 'text-primary' : 'text-gold-ink')} aria-live="polite">
          {video.status === 'ready' ? '✓ ' : ''}
          {STATUS_TEXT[video.status]}
          {busy && video.progress !== null && video.status === 'processing' ? ` · ${video.progress}%` : ''}
          {video.status === 'failed' && video.error ? `: ${video.error}` : ''}
        </p>
        {busy && (
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${Math.max(4, video.progress ?? 0)}%` }} />
          </div>
        )}
        <p className="text-[12px] text-muted">{video.captions.length ? `Captions: ${video.captions.map((c) => c.label).join(', ')}` : 'No captions yet'}</p>
        <p className="flex flex-wrap gap-x-3 text-[12.5px]">
          <button type="button" onClick={onChange} className="font-semibold text-link hover:underline">
            Change video
          </button>
          <a href={`/app/authoring/videos?video=${video.id}`} target="_blank" rel="noopener" className="font-semibold text-link hover:underline">
            Captions and details ↗
          </a>
        </p>
      </div>
    </div>
  );
}

/** Choose a video from the organisation's library. */
function LibraryPicker({ onPick, onClose, onUpload }: { onPick: (v: LibraryVideo) => void; onClose: () => void; onUpload: (f: File) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<LibraryVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await listVideos(q);
      if (res.ok) setItems(res.data);
      else setError(res.error);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    dialog.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Choose a video">
      <div className="absolute inset-0 bg-forest/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={dialog} className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-panel)] ring-1 ring-line">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <h2 className="flex-1 text-[16px] font-bold">Video library</h2>
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-link ring-1 ring-line-strong hover:bg-surface">
            <Icon name="upload" className="h-4 w-4" /> Upload new
            <input type="file" accept={[...LIBRARY_VIDEO_TYPES, '.mkv', '.mov'].join(',')} className="sr-only" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </label>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </header>
        <div className="border-b border-line p-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title" aria-label="Search videos" className="h-10 w-full rounded-[var(--radius-field)] bg-surface px-3 text-[14px] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {error ? (
            <p className="p-4 text-center text-[14px] text-danger-ink">{error}</p>
          ) : items === null ? (
            <p className="p-4 text-center text-[14px] text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-[14px] text-muted">{q ? `No videos match “${q}”.` : 'The library is empty. Upload a video to start it.'}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => onPick(v)} disabled={v.status === 'failed' || v.status === 'uploading'} className="flex w-full gap-3 rounded-[var(--radius-field)] p-2 text-left ring-1 ring-line hover:bg-success-tint disabled:cursor-not-allowed disabled:opacity-50">
                    <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-forest">
                      {v.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- the library thumbnail
                        <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      )}
                      {v.durationS && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 font-mono text-[10px] text-white">{formatDuration(v.durationS)}</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-[13.5px] font-semibold text-ink">{v.title}</span>
                      <span className="block text-[12px] text-muted">{STATUS_TEXT[v.status]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------- YouTube and Vimeo ----------

function LinkSource({ provider, block, patch }: { provider: 'youtube' | 'vimeo'; block: BlockDoc; patch: (p: Record<string, unknown>) => void }) {
  const videoId = str(block.videoId);
  const [text, setText] = useState(videoId ? (provider === 'youtube' ? `https://www.youtube.com/watch?v=${videoId}` : `https://vimeo.com/${videoId}`) : '');
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'busy' } | { kind: 'filled'; from: string } | { kind: 'error'; text: string }>({ kind: 'idle' });

  const take = async (value: string) => {
    setText(value);
    const link = videoLink(value);
    if (!value.trim()) return setState({ kind: 'idle' });
    if (!link) return setState({ kind: 'error', text: 'Paste a YouTube or Vimeo link.' });
    if (link.provider !== provider) patch({ provider: link.provider });
    patch({ videoId: link.id });
    setState({ kind: 'busy' });
    const res = await lookupVideo(link.provider, link.id);
    if (!res.ok) return setState({ kind: 'error', text: res.error });
    patch({
      ...(res.data.title ? { title: res.data.title } : {}),
      ...(res.data.channel ? { channel: res.data.channel } : {}),
      ...(res.data.durationS ? { durationS: res.data.durationS } : {}),
    });
    setState({ kind: 'filled', from: link.provider === 'youtube' ? 'YouTube' : 'Vimeo' });
  };

  return (
    <TextField
      label={provider === 'youtube' ? 'YouTube link' : 'Vimeo link'}
      value={text}
      onChange={(v) => void take(v)}
      placeholder={provider === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'https://vimeo.com/…'}
      hint={
        state.kind === 'busy' ? (
          'Looking it up…'
        ) : state.kind === 'filled' ? (
          <span className="text-primary">✓ Title and maker filled in from {state.from}. Change them if you like.</span>
        ) : state.kind === 'error' ? (
          <span className="text-danger-ink">{state.text}</span>
        ) : (
          'Paste the link; the title and maker are filled in for you'
        )
      }
    />
  );
}

// ---------- chapters and questions ----------

/** A time typed as 1:23 (or seconds); kept as typed until it reads as a time. */
function TimeInput({ label, value, onChange }: { label: string; value: number; onChange: (s: number) => void }) {
  const id = useId();
  const [text, setText] = useState(formatClock(value));
  const [bad, setBad] = useState(false);
  // A change from outside (a row moved) shows the new time; typing keeps what was typed.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    if (parseClock(text) !== value) setText(formatClock(value));
  }
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[12px] font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        value={text}
        inputMode="numeric"
        placeholder="1:30"
        aria-invalid={bad || undefined}
        onChange={(e) => {
          setText(e.target.value);
          const s = parseClock(e.target.value);
          setBad(s === null);
          if (s !== null) onChange(s);
        }}
        className={cx('h-10 w-full rounded-[var(--radius-field)] bg-card px-3 font-mono text-[14px] ring-1 focus:outline-none focus:ring-2 focus:ring-primary', bad ? 'ring-danger' : 'ring-line-strong')}
      />
    </div>
  );
}

function Chapters({ block, patch }: { block: BlockDoc; patch: (p: Record<string, unknown>) => void }) {
  const uid = useId();
  const items = rows<{ atS: number; title: string }>(block.chapters);
  const set = (next: { atS: number; title: string }[]) => patch({ chapters: next.length ? next : undefined });
  return (
    <ListEditor
      legend="Chapters (optional)"
      hint="Named points learners can jump to, in time order. Start the first at 0:00."
      noun="chapter"
      max={50}
      items={items}
      onChange={set}
      create={() => ({ atS: items.length ? (items.at(-1)!.atS ?? 0) + 60 : 0, title: '' })}
      render={(c, setC, i) => (
        <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <TimeInput label={`Chapter ${i + 1} starts at`} value={c.atS} onChange={(s) => setC({ ...c, atS: s })} />
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-muted" htmlFor={`${uid}-${i}`}>
              Title
            </label>
            <input
              id={`${uid}-${i}`}
              value={c.title}
              maxLength={120}
              onChange={(e) => setC({ ...c, title: e.target.value })}
              className="h-10 w-full rounded-[var(--radius-field)] bg-card px-3 text-[14px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}
    />
  );
}

function Pauses({ block, patch }: { block: BlockDoc; patch: (p: Record<string, unknown>) => void }) {
  const siblings = useContext(StepBlocksContext).filter((b) => INTERACTIVE.includes(b.type));
  const items = rows<{ atS: number; blockId: string }>(block.pauses);
  const set = (next: { atS: number; blockId: string }[]) => patch({ pauses: next.length ? next : undefined });
  const uid = useId();
  const label = (b: BlockDoc) => `${BLOCK_INFO[b.type]?.label ?? b.type}: ${str(b.prompt) || str(b.situation) || b.id}`.slice(0, 90);
  if (siblings.length === 0) {
    return (
      <p className="rounded-lg bg-surface px-3 py-2.5 text-[13px] text-muted ring-1 ring-line">
        <strong className="text-ink">Questions during the video:</strong> add a question block (multiple choice, poll, reflection…) to this step, then choose it here to pause the video and ask it.
      </p>
    );
  }
  return (
    <ListEditor
      legend="Questions during the video (optional)"
      hint="The video pauses at the time and asks one of this step’s questions. Learners can also answer it below the video."
      noun="question"
      max={20}
      items={items}
      onChange={set}
      create={() => ({ atS: 30, blockId: siblings.find((s) => !items.some((p) => p.blockId === s.id))?.id ?? siblings[0]!.id })}
      render={(p, setP, i) => (
        <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <TimeInput label={`Pause ${i + 1} at`} value={p.atS} onChange={(s) => setP({ ...p, atS: Math.max(1, s) })} />
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-muted" htmlFor={`${uid}-${i}`}>
              Ask
            </label>
            <select
              id={`${uid}-${i}`}
              value={p.blockId}
              onChange={(e) => setP({ ...p, blockId: e.target.value })}
              className="h-10 w-full rounded-[var(--radius-field)] bg-card px-2 text-[14px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {siblings.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    />
  );
}
