'use client';

import type { VideoChapter, VideoRef } from '@dreamlab/contracts';
import { useRef, useState } from 'react';
import { cx } from '@/components/ui/primitives';
import { formatClock, formatDuration, safeImageUrl, videoEmbedUrl, videoFileUrl, videoThumbnail } from '@/lib/media';
import { LibraryVideo } from './library-video';

/*
 * A YouTube or Vimeo video behind a light facade: only a thumbnail loads until the learner taps play,
 * so nothing streams (and no YouTube or Vimeo code runs) on a slow or metered connection unless they
 * ask. Chapters start the video at their time. An uploaded video plays in the browser's own player,
 * loading nothing until it is played.
 */
export function VideoFacade({ video, caption, className, chapters = [] }: { video: VideoRef; caption?: string; className?: string; chapters?: VideoChapter[] }) {
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState<number | undefined>(undefined);
  if (video.provider === 'library') {
    return <LibraryVideo key={video.videoId} videoId={video.videoId} title={video.title} channel={video.channel} caption={caption} chapters={chapters} startS={video.startS} endS={video.endS} />;
  }
  const file = videoFileUrl(video);
  if (file) return <FileVideo src={file} video={video} caption={caption} className={className} chapters={chapters} />;
  const thumb = video.provider === 'youtube' ? videoThumbnail(video.videoId) : null;
  const src = videoEmbedUrl(video, at);
  const service = video.provider === 'vimeo' ? 'Vimeo' : 'YouTube';
  // A clip runs from startS (or 0) to endS; show a length only when it is positive.
  const clip = video.endS ? video.endS - (video.startS ?? 0) : video.durationS;
  const duration = clip && clip > 0 ? formatDuration(clip) : null;
  if (!src) return null;
  return (
    <figure className={cx('space-y-2', className)} data-media="video">
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] bg-forest ring-1 ring-line">
        {playing ? (
          <iframe
            key={at ?? 'start'}
            src={src}
            title={video.title}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            // YouTube embeds need to know which site they are on; our pages otherwise send no referrer.
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video: ${video.title}`} className="group absolute inset-0 block h-full w-full text-left">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- a plain thumbnail, no image optimiser
              <img src={thumb} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            ) : (
              <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#1f7a55,#0a3d29_70%)]" />
            )}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <span aria-hidden className="absolute left-1/2 top-[42%] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 sm:top-1/2 sm:h-16 sm:w-16 text-forest shadow-lg ring-4 ring-white/30 transition-transform group-hover:scale-105 group-focus-visible:ring-primary">
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 sm:h-7 sm:w-7" fill="currentColor">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
            {duration && <span className="absolute right-3 top-3 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[11.5px] text-white">{duration}</span>}
            <span className="absolute inset-x-0 bottom-0 space-y-0.5 p-3 text-white sm:p-4">
              <span className="line-clamp-1 block font-display text-[15px] font-bold leading-snug sm:line-clamp-2 sm:text-[16px]">{video.title}</span>
              <span className="block text-[13px] text-white/80">{video.channel}</span>
            </span>
          </button>
        )}
      </div>
      {chapters.length > 0 && (
        <nav aria-label={`Chapters of ${video.title}`}>
          <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-field)] bg-card ring-1 ring-line">
            {chapters.map((c) => (
              <li key={c.atS}>
                <button
                  type="button"
                  onClick={() => {
                    setAt(c.atS);
                    setPlaying(true);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] hover:bg-surface"
                >
                  <span className="w-14 shrink-0 font-mono text-[12px] text-link">{formatClock(c.atS)}</span>
                  <span className="min-w-0 flex-1 text-ink">{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <figcaption className="space-y-1">
        {caption && <p className="text-[14px] leading-relaxed text-body">{caption}</p>}
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
          Video: {video.channel} · Streams from {service} · uses mobile data
        </p>
      </figcaption>
    </figure>
  );
}

function FileVideo({ src, video, caption, className, chapters = [] }: { src: string; video: VideoRef; caption?: string; className?: string; chapters?: VideoChapter[] }) {
  const duration = video.durationS ? formatDuration(video.durationS) : null;
  const player = useRef<HTMLVideoElement>(null);
  return (
    <figure className={cx('space-y-2', className)} data-media="video">
      <video
        ref={player}
        src={src}
        controls
        preload="none"
        playsInline
        aria-label={video.title}
        className="aspect-video w-full rounded-[var(--radius-card)] bg-forest ring-1 ring-line"
      />
      {chapters.length > 0 && (
        <nav aria-label={`Chapters of ${video.title}`}>
          <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-field)] bg-card ring-1 ring-line">
            {chapters.map((c) => (
              <li key={c.atS}>
                <button
                  type="button"
                  onClick={() => {
                    const el = player.current;
                    if (!el) return;
                    el.currentTime = c.atS;
                    void el.play().catch(() => undefined);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] hover:bg-surface"
                >
                  <span className="w-14 shrink-0 font-mono text-[12px] text-link">{formatClock(c.atS)}</span>
                  <span className="min-w-0 flex-1 text-ink">{c.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <figcaption className="space-y-1">
        <p className="font-display text-[15px] font-bold leading-snug text-ink">{video.title}</p>
        {caption && <p className="text-[14px] leading-relaxed text-body">{caption}</p>}
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
          Video: {video.channel}
          {duration ? ` · ${duration}` : ''} · uses mobile data
        </p>
      </figcaption>
    </figure>
  );
}

export function ImageFigure({ url, alt, caption, credit }: { url: string; alt: string; caption?: string; credit?: string }) {
  const src = safeImageUrl(url);
  if (!src) return null;
  return (
    <figure className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote images from allowed hosts, served as they are */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="h-auto w-full max-w-full rounded-[var(--radius-card)] bg-surface ring-1 ring-line" />
      {(caption || credit) && (
        <figcaption className="space-y-0.5">
          {caption && <p className="text-[14px] leading-relaxed text-body">{caption}</p>}
          {credit && <p className="break-words text-[12px] text-faint">{credit}</p>}
        </figcaption>
      )}
    </figure>
  );
}

const FILE_KINDS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-excel': 'Excel',
  'application/zip': 'ZIP',
  'text/plain': 'Text',
  'text/csv': 'CSV',
  'image/jpeg': 'Picture',
  'image/png': 'Picture',
  'audio/mpeg': 'Audio',
};

/** A file learners save: a worksheet, slides, a template (CAT-6). */
export function DownloadCard({ title, description, path, fileName, size, contentType }: { title: string; description?: string; path: string; fileName: string; size: number; contentType: string }) {
  const href = /^courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(path) ? `/media/${path}` : null;
  const kind = FILE_KINDS[contentType] ?? 'File';
  const mb = size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-success-tint font-mono text-[11px] font-bold text-link ring-1 ring-success-line">
        {kind.slice(0, 4).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15.5px] font-bold leading-snug text-ink">{title}</p>
        {description && <p className="text-[13.5px] leading-relaxed text-body">{description}</p>}
        <p className="text-[12.5px] text-muted">
          {kind} · {mb}
        </p>
      </div>
      {href ? (
        <a href={href} download={fileName} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-forest">
          <span aria-hidden>⇩</span> Download<span className="sr-only"> {title}</span>
        </a>
      ) : (
        <span className="text-[12.5px] text-muted">Not uploaded yet</span>
      )}
    </div>
  );
}
