/**
 * Course media: images from a short list of hosts, YouTube videos played from youtube-nocookie.com.
 * Kept free of runtime contract imports so client components stay light.
 */
import type { MEDIA_IMAGE_HOSTS as CONTRACT_HOSTS, VideoRef } from '@dreamlab/contracts';

/** Same list as the contracts' MEDIA_IMAGE_HOSTS; `satisfies` fails the typecheck if they drift. */
export const MEDIA_IMAGE_HOSTS = ['images.unsplash.com', 'upload.wikimedia.org', 'i.ytimg.com'] as const satisfies typeof CONTRACT_HOSTS;

export const VIDEO_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

/** Only https images from the allowed hosts; anything else is not shown. */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
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

export function videoEmbedUrl(video: Pick<VideoRef, 'videoId' | 'startS' | 'endS'>): string | null {
  if (!YOUTUBE_ID.test(video.videoId)) return null;
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
