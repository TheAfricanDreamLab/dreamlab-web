/**
 * Uploading a video to the library (CAT-6), in the browser: the file goes straight to storage in
 * 8 MB blocks, three at a time. A block that fails is tried again (with growing waits); a link that
 * expires is renewed; an upload interrupted part-way carries on from the blocks storage already
 * has. Then the API joins the blocks and queues the video for processing.
 */
import type { LibraryVideo } from '@dreamlab/contracts';
import { createVideo, videoUploaded, videoUploadLink, videoUploadStatus } from '@/app/actions/videos';

export const LIBRARY_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/x-matroska'];
export const MAX_LIBRARY_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const PARALLEL = 3;
const TRIES = 5;

/** The browser's type, or one from the extension when it has none (some systems don't type .mkv or .mov). */
export function videoType(file: File): string | null {
  if (LIBRARY_VIDEO_TYPES.includes(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ({ mp4: 'video/mp4', m4v: 'video/x-m4v', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska' } as Record<string, string>)[ext ?? ''] ?? null;
}

/** "lesson_3-final cut.mp4" → "Lesson 3 final cut". */
export function titleFromFile(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 200) || 'Untitled video';
}

const blockId = (n: number) => btoa(`blk-${String(n).padStart(6, '0')}`);

class LinkExpired extends Error {}

function putBlock(url: string, body: Blob, onProgress: (loaded: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else if (xhr.status === 403) reject(new LinkExpired());
      else reject(new Error(`Storage answered ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('network'));
    const abort = () => xhr.abort();
    signal.addEventListener('abort', abort, { once: true });
    xhr.onloadend = () => signal.removeEventListener('abort', abort);
    xhr.send(body);
  });
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), reject(new DOMException('Aborted', 'AbortError'))), { once: true });
  });

export interface UploadCallbacks {
  /** Once the video exists in the library (before any bytes are sent). */
  onCreated?: (video: LibraryVideo) => void;
  /** Share of the file sent, 0 to 1. */
  onProgress?: (share: number) => void;
  signal?: AbortSignal;
}

/**
 * Uploads a file as a new library video, or carries on uploading `resumeVideoId` (the same file).
 * Resolves with the video, queued for processing.
 */
export async function uploadLibraryVideo(file: File, opts: UploadCallbacks & { title?: string; resumeVideoId?: string }): Promise<LibraryVideo> {
  const signal = opts.signal ?? new AbortController().signal;
  const stopIfCancelled = () => {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  };
  const type = videoType(file);
  if (!type) throw new Error('Choose an MP4, WebM, MOV or MKV video.');
  if (file.size > MAX_LIBRARY_VIDEO_BYTES) throw new Error('Videos can be up to 2 GB. Export a smaller file (720p is plenty for lessons).');

  let videoId = opts.resumeVideoId;
  let link: { url: string; blockBytes: number; blocks: number };
  let received = new Set<number>();
  if (videoId) {
    const [l, status] = await Promise.all([videoUploadLink(videoId), videoUploadStatus(videoId)]);
    stopIfCancelled();
    if (!l.ok) throw new Error(l.error);
    if (!status.ok) throw new Error(status.error);
    link = l.data;
    if (status.data.blocks !== link.blocks) throw new Error('This isn’t the same file: choose the file you started uploading.');
    received = new Set(status.data.received);
  } else {
    const created = await createVideo({ title: opts.title ?? titleFromFile(file.name), fileName: file.name, contentType: type, size: file.size });
    stopIfCancelled();
    if (!created.ok) throw new Error(created.error);
    videoId = created.data.video.id;
    link = created.data.upload;
    opts.onCreated?.(created.data.video);
  }

  const id = videoId;
  const todo = [...Array(link.blocks).keys()].filter((n) => !received.has(n));
  const sizeOf = (n: number) => Math.min(link.blockBytes, file.size - n * link.blockBytes);
  let done = [...received].reduce((sum, n) => sum + sizeOf(n), 0);
  const inFlight = new Map<number, number>();
  const report = () => opts.onProgress?.(Math.min(1, (done + [...inFlight.values()].reduce((a, b) => a + b, 0)) / file.size));
  report();

  let renewing: Promise<void> | null = null;
  const renew = () =>
    (renewing ??= videoUploadLink(id).then((l) => {
      renewing = null;
      if (!l.ok) throw new Error(l.error);
      link = l.data;
    }));

  const send = async (n: number) => {
    const body = file.slice(n * link.blockBytes, n * link.blockBytes + sizeOf(n));
    for (let attempt = 1; ; attempt++) {
      try {
        await putBlock(`${link.url}&comp=block&blockid=${encodeURIComponent(blockId(n))}`, body, (loaded) => (inFlight.set(n, loaded), report()), signal);
        inFlight.delete(n);
        done += sizeOf(n);
        report();
        return;
      } catch (err) {
        inFlight.delete(n);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (err instanceof LinkExpired && attempt <= TRIES) await renew();
        else if (attempt >= TRIES) throw new Error('The connection kept dropping. Your upload is saved so far: try again to carry on from where it stopped.');
        else await wait(1000 * 2 ** (attempt - 1), signal);
      }
    }
  };

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(PARALLEL, todo.length) }, async () => {
      while (next < todo.length) await send(todo[next++]!);
    }),
  );
  // Once every block is sent, joining them goes ahead even if Cancel is pressed now: the video is safe.
  stopIfCancelled();
  const joined = await videoUploaded(id);
  if (!joined.ok) throw new Error(joined.error);
  return joined.data;
}
