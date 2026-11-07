'use client';

import type { CaptionCue, LibraryVideo as Video, VideoManifest } from '@dreamlab/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { autoCaptions, deleteVideo, listVideos, loadCaptions, removeCaptions, renameVideo, retryVideo, saveCaptions } from '@/app/actions/videos';
import { LibraryVideo } from '@/components/learning/library-video';
import { Icon } from '@/components/ui/icons';
import { cx, Notice } from '@/components/ui/primitives';
import { toastSuccess } from '@/components/ui/toast';
import { CAPTION_LANGUAGES, formatCueTime, parseCaptions, parseCueTime } from '@/lib/captions';
import { attachHls } from '@/lib/hls';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { formatDuration, libraryVideoBase } from '@/lib/media';
import { fileSize } from '@/lib/upload';
import { LIBRARY_VIDEO_TYPES, videoType } from '@/lib/video-upload';
import { useVideoUploads, VideoUploads } from './video-uploads';

/*
 * The organisation's video library (CAT-6): upload videos (several at once, carrying on after an
 * interruption), see them being prepared for streaming, rename them, add captions from a file, by
 * speech recognition or by hand, and see which courses use each one.
 */

const STATUS: Record<Video['status'], { text: string; tone: string }> = {
  uploading: { text: 'Upload not finished', tone: 'bg-gold-tint text-gold-ink' },
  queued: { text: 'Waiting to be processed', tone: 'bg-gold-tint text-gold-ink' },
  processing: { text: 'Processing', tone: 'bg-gold-tint text-gold-ink' },
  ready: { text: 'Ready', tone: 'bg-success-tint text-forest' },
  failed: { text: 'Failed', tone: 'bg-danger-tint text-danger-ink' },
};
const ACCEPT = [...LIBRARY_VIDEO_TYPES, '.mkv', '.mov'].join(',');

export function VideoLibrary({ initial, openId, canChange }: { initial: Video[]; openId: string | null; canChange: boolean }) {
  return (
    <VideoUploads>
      <Library initial={initial} openId={openId} canChange={canChange} />
    </VideoUploads>
  );
}

function Library({ initial, openId, canChange }: { initial: Video[]; openId: string | null; canChange: boolean }) {
  const [videos, setVideos] = useState(initial);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(openId);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { start, items } = useVideoUploads();

  const refresh = useCallback(async () => {
    const res = await listVideos();
    if (res.ok) setVideos(res.data);
  }, []);
  // Keep statuses moving while anything is being uploaded, processed or captioned.
  const busy = videos.some((v) => v.status === 'queued' || v.status === 'processing' || v.captionJob?.status === 'queued' || v.captionJob?.status === 'running') || items.some((i) => i.state === 'sending');
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  const upload = (files: FileList | File[] | null, resumeVideoId?: string) => {
    setError(null);
    const list = [...(files ?? [])];
    const bad = list.filter((f) => !videoType(f));
    if (bad.length) setError(`${bad.map((f) => f.name).join(', ')}: choose MP4, WebM, MOV or MKV videos.`);
    for (const f of list.filter((x) => videoType(x))) start(f, { resumeVideoId, onCreated: () => void refresh(), onDone: () => void refresh() });
  };

  const shown = useMemo(() => videos.filter((v) => !q || v.title.toLowerCase().includes(q.toLowerCase())), [videos, q]);
  const current = videos.find((v) => v.id === selected) ?? null;
  const replace = (v: Video) => setVideos((list) => list.map((x) => (x.id === v.id ? v : x)));

  return (
    <div className="space-y-5">
      {canChange && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files);
          }}
          className={cx('flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed bg-card p-6 text-center transition-colors sm:flex-row sm:text-left', dragging ? 'border-primary bg-success-tint' : 'border-line-strong')}
        >
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success-tint text-link">
            <Icon name="upload" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">Drop videos here to upload them</p>
            <p className="text-[13px] text-muted">MP4, MOV, WebM or MKV, up to 2 GB each. They are prepared for streaming at 360p and 720p, so learners on slow connections can watch too.</p>
          </div>
          <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-white hover:bg-forest focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            Choose videos
            <input type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
          </label>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search videos"
            aria-label="Search videos"
            className="h-11 w-full rounded-[var(--radius-field)] bg-card pl-9 pr-3 text-[14.5px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <p className="text-[13px] text-muted">
          {videos.length} video{videos.length === 1 ? '' : 's'}
        </p>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-card p-10 text-center ring-1 ring-line">
          <p className="text-[15px] font-semibold text-ink">{q ? `No videos match “${q}”` : 'No videos yet'}</p>
          <p className="mt-1 text-[13.5px] text-muted">{q ? 'Try another word.' : 'Upload one above; it can then be used in any of your courses.'}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setSelected(v.id)} className="group block w-full overflow-hidden rounded-[var(--radius-card)] bg-card text-left ring-1 ring-line transition-shadow hover:shadow-[var(--shadow-soft)] focus-visible:ring-2 focus-visible:ring-primary">
                <span className="relative block aspect-video bg-forest">
                  {v.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the library thumbnail, from /media
                    <img src={v.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-white/60">
                      <Icon name="video" className="h-8 w-8" />
                    </span>
                  )}
                  {v.durationS && <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">{formatDuration(v.durationS)}</span>}
                  {(v.status === 'processing' || v.status === 'queued') && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                      <span className="block h-full bg-gold transition-[width] duration-500" style={{ width: `${Math.max(3, v.progress ?? 0)}%` }} />
                    </span>
                  )}
                </span>
                <span className="block space-y-1.5 p-3">
                  <span className="line-clamp-2 block text-[14.5px] font-semibold text-ink">{v.title}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[12px]">
                    <span className={cx('rounded-full px-2 py-0.5 font-semibold', STATUS[v.status].tone)}>
                      {STATUS[v.status].text}
                      {v.status === 'processing' && v.progress !== null ? ` ${v.progress}%` : ''}
                    </span>
                    {v.captions.length > 0 && <span className="rounded-full bg-surface px-2 py-0.5 text-muted ring-1 ring-line">CC {v.captions.map((c) => c.lang.toUpperCase()).join(' · ')}</span>}
                    {v.usedIn.length > 0 && (
                      <span className="text-muted">
                        In {v.usedIn.length} course{v.usedIn.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {current && (
        <Details
          key={current.id}
          video={current}
          canChange={canChange}
          onClose={() => setSelected(null)}
          onChanged={replace}
          onRemoved={() => {
            setVideos((list) => list.filter((x) => x.id !== current.id));
            setSelected(null);
          }}
          onResume={(f) => upload([f], current.id)}
        />
      )}
    </div>
  );
}

function Details({ video, canChange, onClose, onChanged, onRemoved, onResume }: { video: Video; canChange: boolean; onClose: () => void; onChanged: (v: Video) => void; onRemoved: () => void; onResume: (f: File) => void }) {
  const [title, setTitle] = useState(video.title);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ lang: string; label: string; cues: CaptionCue[] } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const escape = useRef(() => {});
  useEffect(() => {
    escape.current = () => !editing && onClose();
  });
  useEffect(() => {
    panel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && escape.current();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);
  // The caption editor, when open, holds focus instead.
  useFocusTrap(panel, !editing);

  const run = async <T,>(p: Promise<{ ok: true; data: T } | { ok: false; error: string }>, done?: (d: T) => void) => {
    setError(null);
    const res = await p;
    if (!res.ok) return setError(res.error), false;
    done?.(res.data);
    return true;
  };

  // On the page itself, above the upload tray: a parent's transform would otherwise trap it.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={video.title}>
      <div className="absolute inset-0 bg-forest/35 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={panel} tabIndex={-1} className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-page shadow-[var(--shadow-panel)] focus:outline-none">
        <header className="flex items-center gap-2 border-b border-line bg-card px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate text-[16px] font-bold">{video.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {video.status === 'ready' ? (
            <LibraryVideo
              key={video.captions.map((c) => `${c.lang}:${c.updatedAt}`).join('|')}
              videoId={video.id}
              title={video.title}
              channel={`${video.width}×${video.height} · ${video.renditions.map((h) => `${h}p`).join(', ')}`}
            />
          ) : (
            <div className="space-y-2 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
              <p className={cx('inline-block rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold', STATUS[video.status].tone)}>{STATUS[video.status].text}</p>
              {video.status === 'processing' || video.status === 'queued' ? (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label="Processing" aria-valuenow={video.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${Math.max(3, video.progress ?? 0)}%` }} />
                  </div>
                  <p className="text-[13px] text-muted">Being prepared for streaming. You can use it in a lesson now; it can be published once it’s ready.</p>
                </>
              ) : video.status === 'failed' ? (
                <>
                  <p className="text-[13.5px] text-danger-ink">{video.error}</p>
                  {canChange && (
                    <button type="button" onClick={() => void run(retryVideo(video.id), onChanged)} className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-forest">
                      Try processing again
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[13.5px] text-body">This upload didn’t finish. Choose the same file to carry on from where it stopped.</p>
                  {canChange && (
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-forest">
                      <Icon name="upload" className="h-4 w-4" /> Resume upload
                      <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => e.target.files?.[0] && onResume(e.target.files[0])} />
                    </label>
                  )}
                </>
              )}
            </div>
          )}

          {error && <Notice tone="error">{error}</Notice>}

          <section className="space-y-2">
            <label htmlFor="video-title" className="text-[13px] font-semibold text-ink">
              Title
            </label>
            <div className="flex gap-2">
              <input
                id="video-title"
                value={title}
                maxLength={200}
                disabled={!canChange}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 min-w-0 flex-1 rounded-[var(--radius-field)] bg-card px-3 text-[15px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {canChange && title.trim() && title !== video.title && (
                <button type="button" onClick={() => void run(renameVideo(video.id, title), (v) => (onChanged(v), toastSuccess('Renamed.')))} className="h-11 rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-forest">
                  Save
                </button>
              )}
            </div>
            <p className="text-[12.5px] text-muted">
              {video.fileName} · {fileSize(video.size)} · added by {video.createdBy?.name ?? 'an author'} on {new Date(video.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </section>

          <Captions video={video} canChange={canChange} onChanged={onChanged} onEdit={setEditing} run={run} />

          <section className="space-y-2">
            <h3 className="text-[15px] font-bold">Used in</h3>
            {video.usedIn.length === 0 ? (
              <p className="text-[13.5px] text-muted">Not used in any course yet.</p>
            ) : (
              <ul className="space-y-1 text-[14px]">
                {video.usedIn.map((c) => (
                  <li key={c.slug}>
                    <a href={`/courses/${c.slug}`} className="font-semibold text-link hover:underline">
                      {c.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canChange && (
            <section className="space-y-2 border-t border-line pt-4">
              <button
                type="button"
                disabled={video.usedIn.length > 0}
                title={video.usedIn.length ? 'Take it out of its courses first' : undefined}
                onClick={async () => {
                  if (!window.confirm(`Delete “${video.title}” and its captions? This can’t be undone.`)) return;
                  if (await run(deleteVideo(video.id))) {
                    toastSuccess('Video deleted.');
                    onRemoved();
                  }
                }}
                className="inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold text-danger-ink ring-1 ring-danger-line hover:bg-danger-tint disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete video
              </button>
              {video.usedIn.length > 0 && <p className="text-[12.5px] text-muted">A video used in a course can’t be deleted. Take it out of those courses first.</p>}
            </section>
          )}
        </div>
      </div>
      {editing && (
        <CaptionEditor
          video={video}
          readOnly={!canChange}
          track={editing}
          onClose={() => setEditing(null)}
          onSaved={(v) => {
            onChanged(v);
            setEditing(null);
            toastSuccess('Captions saved.');
          }}
        />
      )}
    </div>,
    document.body,
  );
}

function Captions({
  video,
  canChange,
  onChanged,
  onEdit,
  run,
}: {
  video: Video;
  canChange: boolean;
  onChanged: (v: Video) => void;
  onEdit: (t: { lang: string; label: string; cues: CaptionCue[] }) => void;
  run: <T>(p: Promise<{ ok: true; data: T } | { ok: false; error: string }>, done?: (d: T) => void) => Promise<boolean>;
}) {
  const [lang, setLang] = useState('en');
  const [autoLang, setAutoLang] = useState('auto');
  const fileInput = useRef<HTMLInputElement>(null);
  const ready = video.status === 'ready';
  const job = video.captionJob;
  const label = (l: string) => CAPTION_LANGUAGES[l] ?? l;

  const fromFile = async (file: File | undefined) => {
    if (!file) return;
    let cues: CaptionCue[];
    try {
      cues = parseCaptions(await file.text());
    } catch (err) {
      await run(Promise.resolve({ ok: false as const, error: err instanceof Error ? err.message : 'That file has no captions.' }));
      return;
    }
    await run(saveCaptions(video.id, lang, { label: label(lang), cues, fromFile: true }), (v) => (onChanged(v), toastSuccess(`${label(lang)} captions added: ${cues.length} lines.`)));
  };

  return (
    <section className="space-y-3">
      <h3 className="text-[15px] font-bold">Captions</h3>
      {video.captions.length === 0 ? (
        <p className="text-[13.5px] text-muted">No captions yet. Captions help learners in noisy places, with hearing loss, or watching in a second language, and power the transcript.</p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-field)] bg-card ring-1 ring-line">
          {video.captions.map((c) => (
            <li key={c.lang} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">{c.label}</span>
                <span className="block text-[12px] text-muted">
                  {c.cues} lines · {c.source === 'auto' ? 'made automatically: check before publishing' : c.source === 'upload' ? 'from a file' : 'edited'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void run(loadCaptions(video.id, c.lang), (t) => onEdit(t))}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-link ring-1 ring-line hover:bg-surface"
              >
                {canChange ? 'Edit' : 'View'}
              </button>
              {canChange && (
                <button
                  type="button"
                  onClick={() => window.confirm(`Remove the ${c.label} captions?`) && void run(removeCaptions(video.id, c.lang), onChanged)}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-danger-ink ring-1 ring-danger-line hover:bg-danger-tint"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {job && (
        <p className={cx('rounded-lg px-3 py-2 text-[13px] ring-1', job.status === 'failed' ? 'bg-danger-tint text-danger-ink ring-danger-line' : 'bg-gold-tint text-gold-ink ring-gold-line')} aria-live="polite">
          {job.status === 'failed' ? `Automatic captions failed: ${job.error ?? 'try again.'}` : `Making ${job.lang === 'auto' ? '' : `${label(job.lang)} `}captions automatically… This takes a few minutes; you can leave this page.`}
        </p>
      )}

      {canChange && ready && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-[var(--radius-field)] bg-card p-3 ring-1 ring-line">
            <p className="text-[13.5px] font-semibold text-ink">From a file</p>
            <p className="text-[12px] text-muted">WebVTT (.vtt) or SubRip (.srt)</p>
            <div className="flex gap-2">
              <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language of the caption file" className="h-9 min-w-0 flex-1 rounded-[var(--radius-field)] bg-surface px-2 text-[13.5px] ring-1 ring-line">
                {Object.entries(CAPTION_LANGUAGES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => fileInput.current?.click()} className="h-9 shrink-0 rounded-full bg-primary px-3 text-[13px] font-semibold text-white hover:bg-forest">
                Upload
              </button>
              <input ref={fileInput} type="file" accept=".vtt,.srt,text/vtt" className="sr-only" onChange={(e) => (void fromFile(e.target.files?.[0]), (e.target.value = ''))} />
            </div>
          </div>
          <div className="space-y-2 rounded-[var(--radius-field)] bg-card p-3 ring-1 ring-line">
            <p className="text-[13.5px] font-semibold text-ink">Automatically</p>
            <p className="text-[12px] text-muted">Speech recognition; check and correct them after</p>
            <div className="flex gap-2">
              <select value={autoLang} onChange={(e) => setAutoLang(e.target.value)} aria-label="Language spoken" className="h-9 min-w-0 flex-1 rounded-[var(--radius-field)] bg-surface px-2 text-[13.5px] ring-1 ring-line">
                <option value="auto">Detect the language</option>
                {Object.entries(CAPTION_LANGUAGES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={job?.status === 'queued' || job?.status === 'running'}
                onClick={() => void run(autoCaptions(video.id, autoLang), (v) => (onChanged(v), toastSuccess('Making captions. They’ll appear here in a few minutes.')))}
                className="h-9 shrink-0 rounded-full bg-primary px-3 text-[13px] font-semibold text-white hover:bg-forest disabled:opacity-50"
              >
                Make
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEdit({ lang, label: label(lang), cues: [] })}
            className="text-left text-[13px] font-semibold text-link hover:underline sm:col-span-2"
          >
            Or write {label(lang)} captions by hand
          </button>
        </div>
      )}
      {canChange && !ready && <p className="text-[12.5px] text-muted">Captions can be added once the video is processed.</p>}
    </section>
  );
}

/** Edit captions line by line while watching: play from a line, add a line where the video is. */
function CaptionEditor({
  video,
  track,
  readOnly,
  onClose,
  onSaved,
}: {
  video: Video;
  track: { lang: string; label: string; cues: CaptionCue[] };
  readOnly: boolean;
  onClose: () => void;
  onSaved: (v: Video) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useFocusTrap(box);
  // Times that don't read as times yet (they keep the cue's last good time, but block saving).
  const [badTimes, setBadTimes] = useState<Set<string>>(new Set());
  const markTime = (id: string, bad: boolean) =>
    setBadTimes((s) => {
      if (s.has(id) === bad) return s;
      const n = new Set(s);
      if (bad) n.add(id);
      else n.delete(id);
      return n;
    });
  const [cues, setCues] = useState<(CaptionCue & { key: number })[]>(() => track.cues.map((c, i) => ({ ...c, key: i })));
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement>(null);
  const seq = useRef(track.cues.length);
  const base = libraryVideoBase(video.id);

  useEffect(() => {
    const el = player.current;
    if (!el || !base) return;
    let stop = () => undefined as void;
    let live = true;
    void fetch(`${base}manifest.json`)
      .then((r) => r.json() as Promise<VideoManifest>)
      .then((m) => {
        if (live) stop = attachHls(el, `${base}${m.hls}`);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      stop();
    };
  }, [base]);

  const play = (s: number) => {
    const el = player.current;
    if (!el) return;
    el.currentTime = s;
    void el.play().catch(() => undefined);
  };
  const add = () => {
    const at = Math.round((player.current?.currentTime ?? 0) * 10) / 10;
    player.current?.pause();
    setCues((list) => [...list, { key: seq.current++, startS: at, endS: Math.round((at + 3) * 10) / 10, text: '' }].sort((a, b) => a.startS - b.startS));
  };
  const set = (key: number, patch: Partial<CaptionCue>) => setCues((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const problems = cues.filter((c) => !c.text.trim() || !(c.endS > c.startS)).length;

  const save = async () => {
    if (badTimes.size) return setError('Some times aren’t written as times (minutes:seconds.tenths, e.g. 1:23.4). Correct them first.');
    if (problems) return setError(`${problems} line${problems === 1 ? ' needs' : 's need'} text and an end after the start.`);
    if (!cues.length) return setError('Add at least one line.');
    setSaving(true);
    setError(null);
    const res = await saveCaptions(video.id, track.lang, { label: track.label, cues: [...cues].sort((a, b) => a.startS - b.startS).map((c) => ({ startS: c.startS, endS: c.endS, text: c.text })), fromFile: false });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onSaved(res.data);
  };

  return (
    <div ref={box} className="fixed inset-0 z-[70] flex flex-col bg-page" role="dialog" aria-modal="true" aria-label={`${readOnly ? '' : 'Edit '}${track.label} captions`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-bold">
          {track.label} captions · {video.title}
        </h2>
        <button type="button" onClick={onClose} className="h-10 rounded-full px-4 text-[13.5px] font-semibold text-body ring-1 ring-line hover:bg-surface">
          {readOnly ? 'Close' : 'Cancel'}
        </button>
        {!readOnly && (
          <button type="button" onClick={() => void save()} disabled={saving} className="h-10 rounded-full bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-forest disabled:opacity-50">
            {saving ? 'Saving…' : 'Save captions'}
          </button>
        )}
      </header>
      {error && (
        <div className="px-4 pt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <video ref={player} controls playsInline onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} className="aspect-video w-full rounded-[var(--radius-card)] bg-black ring-1 ring-line" />
          <div className={cx('flex flex-wrap items-center gap-2', readOnly && 'hidden')}>
            <button type="button" onClick={add} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-[13.5px] font-semibold text-white hover:bg-primary">
              <Icon name="plus" className="h-4 w-4" /> Add a line at {formatCueTime(time)}
            </button>
            <p className="text-[12.5px] text-muted">Pause where someone starts speaking, add a line, type what they say.</p>
          </div>
        </div>
        <ol className="min-h-0 space-y-2 overflow-y-auto pb-6">
          {cues.length === 0 && <li className="rounded-[var(--radius-card)] bg-card p-6 text-center text-[13.5px] text-muted ring-1 ring-line">No lines yet. Play the video and add the first.</li>}
          {cues.map((c) => {
            const active = time >= c.startS && time < c.endS;
            const bad = !c.text.trim() || !(c.endS > c.startS);
            return (
              <li key={c.key} className={cx('space-y-2 rounded-[var(--radius-field)] bg-card p-3 ring-1', active ? 'ring-2 ring-primary' : bad ? 'ring-danger-line' : 'ring-line')}>
                <div className="flex flex-wrap items-center gap-2">
                  <TimeBox label="From" value={c.startS} readOnly={readOnly} onChange={(s) => set(c.key, { startS: s })} onValidity={(bad) => markTime(`${c.key}-start`, bad)} />
                  <TimeBox label="to" value={c.endS} readOnly={readOnly} onChange={(s) => set(c.key, { endS: s })} onValidity={(bad) => markTime(`${c.key}-end`, bad)} />
                  <button type="button" onClick={() => play(c.startS)} className="ml-auto rounded-full px-3 py-1 text-[12.5px] font-semibold text-link ring-1 ring-line hover:bg-surface">
                    ▶ Play
                  </button>
                  <button type="button" hidden={readOnly} onClick={() => {
                      setCues((list) => list.filter((x) => x.key !== c.key));
                      // Its time fields go with it.
                      markTime(`${c.key}-start`, false);
                      markTime(`${c.key}-end`, false);
                    }} aria-label="Remove this line" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-danger-tint hover:text-danger-ink">
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  readOnly={readOnly}
                  value={c.text}
                  maxLength={500}
                  onChange={(e) => set(c.key, { text: e.target.value })}
                  aria-label={`Caption from ${formatCueTime(c.startS)}`}
                  className="w-full resize-y rounded-md bg-surface px-2.5 py-2 text-[14px] ring-1 ring-line focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function TimeBox({ label, value, onChange, onValidity, readOnly }: { label: string; value: number; onChange: (s: number) => void; onValidity: (bad: boolean) => void; readOnly: boolean }) {
  const [text, setText] = useState(formatCueTime(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    if (parseCueTime(text) !== value) setText(formatCueTime(value));
  }
  const bad = parseCueTime(text) === null;
  return (
    <label className="flex items-center gap-1.5 text-[12px] text-muted">
      {label}
      <input
        value={text}
        readOnly={readOnly}
        onChange={(e) => {
          setText(e.target.value);
          const s = parseCueTime(e.target.value);
          onValidity(s === null);
          if (s !== null) onChange(s);
        }}
        aria-invalid={bad || undefined}
        className={cx('h-8 w-20 rounded-md bg-surface px-2 font-mono text-[12.5px] text-ink ring-1 focus:outline-none focus:ring-2 focus:ring-primary', bad ? 'ring-danger' : 'ring-line')}
      />
    </label>
  );
}
