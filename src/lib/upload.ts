/**
 * Browser uploads straight to storage (MEDIA-1): the API hands out a short-lived upload link, the
 * file goes there with progress, and nothing large passes through our servers.
 */

export interface UploadTicket {
  uploadUrl: string;
  headers: Record<string, string>;
}

/** PUT the file to its upload link, reporting progress from 0 to 1. Resolves when storage has it. */
export function putFile(ticket: UploadTicket, file: File, onProgress: (share: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', ticket.uploadUrl);
    for (const [k, v] of Object.entries(ticket.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}

/** 1536 → "1.5 KB". */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Same lists as the contracts (SUBMISSION_FILE_TYPES, COURSE_*_TYPES). */
export const SUBMISSION_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'audio/mpeg',
];
export const COURSE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const COURSE_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MAX_SUBMISSION_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_SUBMISSION_FILES = 5;
