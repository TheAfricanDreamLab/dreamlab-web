/**
 * Course media: uploaded images and videos (served from this site's /media path), images from a
 * short list of hosts, and YouTube videos played from youtube-nocookie.com.
 * Kept free of runtime contract imports so client components stay light.
 */
import type { MEDIA_IMAGE_HOSTS as CONTRACT_HOSTS, VideoRef } from '@dreamlab/contracts';

/** Same list as the contracts' MEDIA_IMAGE_HOSTS; `satisfies` fails the typecheck if they drift. */
export const MEDIA_IMAGE_HOSTS = ['images.unsplash.com', 'upload.wikimedia.org', 'i.ytimg.com'] as const satisfies typeof CONTRACT_HOSTS;

export const VIDEO_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
export const VIMEO_EMBED_ORIGIN = 'https://player.vimeo.com';
const VIMEO_ID = /^\d{6,12}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A library video's public folder on this site (CAT-6): manifest.json, the stream, poster and captions. */
export function libraryVideoBase(videoId: string): string | null {
  return UUID.test(videoId) ? `/media/videos/${videoId.toLowerCase()}/` : null;
}

/** Same as the contracts' MEDIA_PATH_PATTERN: courses/<org>/<upload>/<file name>. */
const MEDIA_PATH = /^courses\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

/** An uploaded file's address on this site, or null. */
export function mediaUrl(path: string | null | undefined): string | null {
  return path && MEDIA_PATH.test(path) ? `/media/${path}` : null;
}

/** Uploaded images, or https images from the allowed hosts; anything else is not shown. */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/media/')) return mediaUrl(url.slice('/media/'.length));
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (MEDIA_IMAGE_HOSTS as readonly string[]).includes(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function videoThumbnail(videoId: string): string | null {
  return YOUTUBE_ID.test(videoId) ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

/** The embed address for a YouTube or Vimeo video, starting at `at` seconds (a chapter) or the clip's start. */
export function videoEmbedUrl(video: Pick<VideoRef, 'provider' | 'videoId' | 'startS' | 'endS'>, at?: number): string | null {
  const start = at ?? video.startS;
  if (video.provider === 'vimeo' && VIMEO_ID.test(video.videoId)) {
    // dnt: Vimeo doesn't track learners; the start time goes in the fragment.
    return `${VIMEO_EMBED_ORIGIN}/video/${video.videoId}?autoplay=1&dnt=1&title=0&byline=0${start ? `#t=${start}s` : ''}`;
  }
  if (video.provider !== 'youtube' || !YOUTUBE_ID.test(video.videoId)) return null;
  const q = new URLSearchParams({ autoplay: '1', rel: '0' });
  if (start) q.set('start', String(start));
  if (video.endS) q.set('end', String(video.endS));
  return `${VIDEO_EMBED_ORIGIN}/embed/${video.videoId}?${q}`;
}

/** "1:23" or "1:02:03" or "83" → seconds; null when it isn't a time. */
export function parseClock(text: string): number | null {
  const t = text.trim();
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(t);
  if (!m || Number(m[3]) > 59 || (m[1] !== undefined && Number(m[2]) > 59)) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** 83 → "1:23", 3723 → "1:02:03" (0 → "0:00"). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** 95 → "1:35", 3725 → "1:02:05". */
export function formatDuration(seconds: number | undefined): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** An uploaded video's address, with its clip as a media fragment (#t=start,end). */
export function videoFileUrl(video: Pick<VideoRef, 'provider' | 'videoId' | 'startS' | 'endS'>): string | null {
  const url = video.provider === 'file' ? mediaUrl(video.videoId) : null;
  if (!url) return null;
  if (!video.startS && !video.endS) return url;
  return `${url}#t=${video.startS ?? 0}${video.endS ? `,${video.endS}` : ''}`;
}
