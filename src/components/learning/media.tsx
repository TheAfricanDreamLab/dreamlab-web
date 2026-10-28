'use client';

import type { VideoRef } from '@dreamlab/contracts';
import { useState } from 'react';
import { cx } from '@/components/ui/primitives';
import { formatDuration, safeImageUrl, videoEmbedUrl, videoFileUrl, videoThumbnail } from '@/lib/media';

/*
 * A YouTube video behind a light facade: only a thumbnail loads until the learner taps play, so
 * nothing streams (and no YouTube code runs) on a slow or metered connection unless they ask.
 * An uploaded video plays in the browser's own player, loading nothing until it is played.
 */
export function VideoFacade({ video, caption, className }: { video: VideoRef; caption?: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const file = videoFileUrl(video);
  if (file) return <FileVideo src={file} video={video} caption={caption} className={className} />;
  const thumb = videoThumbnail(video.videoId);
  const src = videoEmbedUrl(video);
  // A clip runs from startS (or 0) to endS; show a length only when it is positive.
  const clip = video.endS ? video.endS - (video.startS ?? 0) : video.durationS;
  const duration = clip && clip > 0 ? formatDuration(clip) : null;
  if (!src) return null;
  return (
    <figure className={cx('space-y-2', className)} data-media="video">
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)] bg-forest ring-1 ring-line">
        {playing ? (
          <iframe
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
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element -- a plain thumbnail, no image optimiser
              <img src={thumb} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
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
      <figcaption className="space-y-1">
        {caption && <p className="text-[14px] leading-relaxed text-body">{caption}</p>}
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
          Video: {video.channel} · Streams from YouTube · uses mobile data
        </p>
      </figcaption>
    </figure>
  );
}

function FileVideo({ src, video, caption, className }: { src: string; video: VideoRef; caption?: string; className?: string }) {
  const duration = video.durationS ? formatDuration(video.durationS) : null;
  return (
    <figure className={cx('space-y-2', className)} data-media="video">
      <video
        src={src}
        controls
        preload="none"
        playsInline
        aria-label={video.title}
        className="aspect-video w-full rounded-[var(--radius-card)] bg-forest ring-1 ring-line"
      />
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
