'use server';

import type { CaptionCue, LibraryVideo, VideoUploadLink } from '@dreamlab/contracts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import type { Outcome } from './authoring';

/*
 * The video library (CAT-6). Server Actions are public endpoints: every argument is checked here
 * before it reaches the API, which checks again.
 */

const BAD = { ok: false as const, error: 'That video’s link isn’t right. Open it again from the library.' };
const LANG = /^[a-z]{2,3}(-[A-Z]{2})?$/;
const TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/x-matroska'];
const base = '/v1/catalog/authoring/videos';

async function call<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<Outcome<T>> {
  const res = await api<T>(method, path, body);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: friendlyError(res.error), code: res.error.code };
}

export async function listVideos(q?: string): Promise<Outcome<LibraryVideo[]>> {
  const query = typeof q === 'string' && q.trim() ? `?q=${encodeURIComponent(q.trim().slice(0, 100))}` : '';
  const res = await call<{ items: LibraryVideo[] }>('GET', `${base}${query}`);
  return res.ok ? { ok: true, data: res.data.items } : res;
}

export async function getVideo(videoId: string): Promise<Outcome<LibraryVideo>> {
  if (!isUuid(videoId)) return BAD;
  return call<LibraryVideo>('GET', `${base}/${videoId}`);
}

export async function createVideo(file: { title: string; fileName: string; contentType: string; size: number }): Promise<Outcome<{ video: LibraryVideo; upload: VideoUploadLink }>> {
  if (!file || typeof file.title !== 'string' || typeof file.fileName !== 'string' || !TYPES.includes(file.contentType) || !Number.isInteger(file.size) || file.size < 1) {
    return { ok: false, error: 'Choose an MP4, WebM, MOV or MKV video.' };
  }
  return call('POST', base, { title: file.title.trim().slice(0, 200) || 'Untitled video', fileName: file.fileName.slice(-200), contentType: file.contentType, size: file.size });
}

export async function videoUploadLink(videoId: string): Promise<Outcome<VideoUploadLink>> {
  if (!isUuid(videoId)) return BAD;
  return call('POST', `${base}/${videoId}/upload-link`, {});
}

export async function videoUploadStatus(videoId: string): Promise<Outcome<{ received: number[]; blocks: number }>> {
  if (!isUuid(videoId)) return BAD;
  return call('GET', `${base}/${videoId}/upload-status`);
}

export async function videoUploaded(videoId: string): Promise<Outcome<LibraryVideo>> {
  if (!isUuid(videoId)) return BAD;
  return call('POST', `${base}/${videoId}/uploaded`, {});
}

export async function renameVideo(videoId: string, title: string): Promise<Outcome<LibraryVideo>> {
  if (!isUuid(videoId) || typeof title !== 'string' || !title.trim()) return BAD;
  return call('PATCH', `${base}/${videoId}`, { title: title.trim().slice(0, 200) });
}

export async function deleteVideo(videoId: string): Promise<Outcome<null>> {
  if (!isUuid(videoId)) return BAD;
  const res = await call<unknown>('DELETE', `${base}/${videoId}`);
  return res.ok ? { ok: true, data: null } : res;
}

export async function retryVideo(videoId: string): Promise<Outcome<LibraryVideo>> {
  if (!isUuid(videoId)) return BAD;
  return call('POST', `${base}/${videoId}/retry`, {});
}

// ---------- captions ----------

export async function loadCaptions(videoId: string, lang: string): Promise<Outcome<{ lang: string; label: string; cues: CaptionCue[] }>> {
  if (!isUuid(videoId) || !LANG.test(lang)) return BAD;
  return call('GET', `${base}/${videoId}/captions/${lang}`);
}

export async function saveCaptions(videoId: string, lang: string, track: { label: string; cues: CaptionCue[]; fromFile: boolean }): Promise<Outcome<LibraryVideo>> {
  if (!isUuid(videoId) || !LANG.test(lang) || !track || !Array.isArray(track.cues)) return BAD;
  const cues = track.cues
    .filter((c) => c && Number.isFinite(c.startS) && Number.isFinite(c.endS) && typeof c.text === 'string' && c.text.trim())
    .map((c) => ({ startS: c.startS, endS: c.endS, text: c.text.trim().slice(0, 500) }));
  return call('PUT', `${base}/${videoId}/captions/${lang}`, { label: String(track.label ?? '').trim().slice(0, 60) || lang, cues, fromFile: track.fromFile === true });
}

export async function removeCaptions(videoId: string, lang: string): Promise<Outcome<LibraryVideo>> {
  if (!isUuid(videoId) || !LANG.test(lang)) return BAD;
  return call('DELETE', `${base}/${videoId}/captions/${lang}`);
}

export async function autoCaptions(videoId: string, lang: string): Promise<Outcome<LibraryVideo>> {
  if (!isUuid(videoId) || (lang !== 'auto' && !LANG.test(lang))) return BAD;
  return call('POST', `${base}/${videoId}/captions-auto`, { lang });
}

// ---------- YouTube and Vimeo details ----------

/**
 * A YouTube or Vimeo video's title, maker and (Vimeo) length, from the service's public oEmbed
 * endpoint. Only ids are accepted, and the address is built here, so nothing else can be fetched.
 */
export async function lookupVideo(provider: 'youtube' | 'vimeo', id: string): Promise<Outcome<{ title: string; channel: string; durationS: number | null }>> {
  const valid = provider === 'youtube' ? /^[A-Za-z0-9_-]{11}$/.test(id) : provider === 'vimeo' && /^\d{6,12}$/.test(id);
  if (!valid) return { ok: false, error: 'That isn’t a YouTube or Vimeo link.' };
  const url =
    provider === 'youtube'
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`
      : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'This video can’t be embedded: its owner has turned that off, or it is private.' };
    if (!res.ok) return { ok: false, error: 'That video wasn’t found. Check the link.' };
    const data = (await res.json()) as { title?: unknown; author_name?: unknown; duration?: unknown };
    return {
      ok: true,
      data: {
        title: typeof data.title === 'string' ? data.title.slice(0, 200) : '',
        channel: typeof data.author_name === 'string' ? data.author_name.slice(0, 120) : '',
        durationS: typeof data.duration === 'number' && data.duration > 0 ? Math.round(data.duration) : null,
      },
    };
  } catch {
    return { ok: false, error: 'Couldn’t reach the video service. Fill in the title yourself.' };
  }
}
