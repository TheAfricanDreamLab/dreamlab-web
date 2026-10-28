/**
 * Course media: uploaded images and videos (served from this site's /media path), images from a
 * short list of hosts, and YouTube videos played from youtube-nocookie.com.
 * Kept free of runtime contract imports so client components stay light.
 */
import type { MEDIA_IMAGE_HOSTS as CONTRACT_HOSTS, VideoRef } from '@dreamlab/contracts';

/** Same list as the contracts' MEDIA_IMAGE_HOSTS; `satisfies` fails the typecheck if they drift. */
export const MEDIA_IMAGE_HOSTS = ['images.unsplash.com', 'upload.wikimedia.org', 'i.ytimg.com'] as const satisfies typeof CONTRACT_HOSTS;

export const VIDEO_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

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

export function videoEmbedUrl(video: Pick<VideoRef, 'provider' | 'videoId' | 'startS' | 'endS'>): string | null {
  if (video.provider !== 'youtube' || !YOUTUBE_ID.test(video.videoId)) return null;
  const q = new URLSearchParams({ autoplay: '1', rel: '0' });
  if (video.startS) q.set('start', String(video.startS));
  if (video.endS) q.set('end', String(video.endS));
  return `${VIDEO_EMBED_ORIGIN}/embed/${video.videoId}?${q}`;
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
