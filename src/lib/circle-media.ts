/*
 * Getting a Dream Circle post's files ready in the browser (COMM-2), so little data travels: pictures
 * are shrunk before they are sent, videos and voice messages are measured here, and everything then
 * goes straight to storage.
 */

import { CIRCLE_UPLOAD_LIMITS, type CircleAttachmentKind } from '@dreamlab/contracts';

/** What the board accepts, by kind (the API checks the same list). */
export const CIRCLE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'application/pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
].join(',');

export function kindOf(contentType: string): CircleAttachmentKind {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  return 'file';
}

export interface PreparedFile {
  file: File;
  kind: CircleAttachmentKind;
  width?: number;
  height?: number;
  durationSec?: number;
}

/** Pictures larger than this on their longest side, or heavier than SHRINK_ABOVE, are made smaller. */
const MAX_SIDE = 1600;
const SHRINK_ABOVE = 400 * 1024;

/** A picture at most MAX_SIDE wide or tall, as WebP (JPEG where WebP cannot be made). GIFs keep moving. */
async function shrinkImage(file: File): Promise<PreparedFile> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { file, kind: 'image' };
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  if (file.type === 'image/gif' || (scale === 1 && file.size <= SHRINK_ABOVE)) {
    bitmap.close();
    return { file, kind: 'image', width, height };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const blob = (await encode('image/webp')) ?? (await encode('image/jpeg'));
  if (!blob || blob.size >= file.size) return { file, kind: 'image', width, height };
  const name = file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg');
  return { file: new File([blob], name, { type: blob.type }), kind: 'image', width, height };
}

/** A video's or a sound's length (and a video's size), read from the file without uploading it. */
function mediaMeta(file: File, kind: 'video' | 'audio'): Promise<{ durationSec?: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    const url = URL.createObjectURL(file);
    const done = (meta: { durationSec?: number; width?: number; height?: number }) => {
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const durationSec = Number.isFinite(el.duration) ? Math.round(el.duration) : undefined;
      done(kind === 'video' ? { durationSec, width: (el as HTMLVideoElement).videoWidth || undefined, height: (el as HTMLVideoElement).videoHeight || undefined } : { durationSec });
    };
    el.onerror = () => done({});
    setTimeout(() => done({}), 5000);
    el.src = url;
  });
}

/** Ready a file for the board, or say why it cannot go. */
export async function prepareFile(file: File): Promise<PreparedFile | { error: string }> {
  const kind = kindOf(file.type || 'application/octet-stream');
  const prepared = kind === 'image' ? await shrinkImage(file) : { file, kind, ...(kind === 'video' || kind === 'audio' ? await mediaMeta(file, kind) : {}) };
  const limit = CIRCLE_UPLOAD_LIMITS[prepared.kind];
  if (prepared.file.size > limit) return { error: `${file.name} is too large (at most ${limit / (1024 * 1024)} MB).` };
  return prepared;
}

/** "3:07" for 187 seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The best compact voice format this browser records in. */
export function voiceMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t));
}
