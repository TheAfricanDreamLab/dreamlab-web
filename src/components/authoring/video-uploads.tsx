'use client';

import type { LibraryVideo } from '@dreamlab/contracts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { toastSuccess } from '@/components/ui/toast';
import { fileSize } from '@/lib/upload';
import { uploadLibraryVideo } from '@/lib/video-upload';

/*
 * Video uploads in progress (CAT-6), shared by the workspace and the library: they keep going while
 * the author works, show in a tray in the corner, and the page asks before closing while any is
 * still sending.
 */

export type UploadItem = {
  key: string;
  name: string;
  size: number;
  videoId: string | null;
  progress: number;
  state: 'sending' | 'done' | 'failed' | 'cancelled';
  error?: string;
};

type Start = (file: File, opts?: { title?: string; resumeVideoId?: string; onCreated?: (v: LibraryVideo) => void; onDone?: (v: LibraryVideo) => void }) => void;

const Ctx = createContext<{ items: UploadItem[]; start: Start } | null>(null);

export function useVideoUploads() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVideoUploads needs <VideoUploads>');
  return ctx;
}

export function VideoUploads({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const aborts = useRef(new Map<string, AbortController>());
  const files = useRef(new Map<string, File>());
  const seq = useRef(0);
  const update = useCallback((key: string, patch: Partial<UploadItem>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i))), []);

  const run = useCallback(
    (key: string, file: File, opts: Parameters<Start>[1] = {}) => {
      const abort = new AbortController();
      aborts.current.set(key, abort);
      files.current.set(key, file);
      uploadLibraryVideo(file, {
        title: opts.title,
        resumeVideoId: opts.resumeVideoId,
        signal: abort.signal,
        onCreated: (v) => {
          update(key, { videoId: v.id });
          opts.onCreated?.(v);
        },
        onProgress: (p) => update(key, { progress: p }),
      })
        .then((v) => {
          update(key, { state: 'done', progress: 1, videoId: v.id });
          toastSuccess(`Uploaded “${v.title}”. It’s being prepared for streaming.`);
          opts.onDone?.(v);
        })
        .catch((err: unknown) => {
          if (abort.signal.aborted) return update(key, { state: 'cancelled' });
          update(key, { state: 'failed', error: err instanceof Error ? err.message : 'The upload failed.' });
        })
        .finally(() => aborts.current.delete(key));
    },
    [update],
  );

  const start = useCallback<Start>(
    (file, opts = {}) => {
      const key = `u${++seq.current}`;
      setItems((list) => [...list, { key, name: file.name, size: file.size, videoId: opts.resumeVideoId ?? null, progress: 0, state: 'sending' }]);
      run(key, file, opts);
    },
    [run],
  );

  const retry = (item: UploadItem) => {
    const file = files.current.get(item.key);
    if (!file) return;
    update(item.key, { state: 'sending', error: undefined });
    run(item.key, file, item.videoId ? { resumeVideoId: item.videoId } : {});
  };

  const sending = items.some((i) => i.state === 'sending');
  useEffect(() => {
    if (!sending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [sending]);

  const value = useMemo(() => ({ items, start }), [items, start]);
  const visible = items.filter((i) => i.state !== 'cancelled');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Ctx.Provider value={value}>
      {children}
      {visible.length > 0 && (
        <section
          aria-label="Video uploads"
          className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-panel)] ring-1 ring-line"
        >
          <header className="flex items-center justify-between gap-2 bg-forest px-4 py-2.5 text-white">
            <p className="text-[13.5px] font-semibold" aria-live="polite">
              {sending ? `Uploading ${visible.filter((i) => i.state === 'sending').length} of ${visible.length}` : 'Uploads finished'}
            </p>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} aria-label={collapsed ? 'Show uploads' : 'Hide uploads'} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10">
                <Icon name={collapsed ? 'expand' : 'collapse'} className="h-4 w-4" />
              </button>
              {!sending && (
                <button type="button" onClick={() => setItems([])} aria-label="Close uploads" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              )}
            </span>
          </header>
          {!collapsed && (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
              {visible.map((i) => (
                <li key={i.key} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[13.5px] font-semibold text-ink" title={i.name}>
                      {i.name}
                    </p>
                    {i.state === 'sending' ? (
                      <button type="button" onClick={() => aborts.current.get(i.key)?.abort()} className="shrink-0 text-[12.5px] font-semibold text-muted hover:text-danger-ink">
                        Cancel
                      </button>
                    ) : i.state === 'failed' ? (
                      <button type="button" onClick={() => retry(i)} className="shrink-0 text-[12.5px] font-semibold text-link hover:underline">
                        Try again
                      </button>
                    ) : (
                      <span className="shrink-0 text-[12.5px] font-semibold text-primary">✓ Uploaded</span>
                    )}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={`Uploading ${i.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(i.progress * 100)}>
                    <div className={cx('h-full rounded-full transition-[width] duration-300', i.state === 'failed' ? 'bg-danger' : 'bg-primary')} style={{ width: `${Math.max(2, i.progress * 100)}%` }} />
                  </div>
                  <p className={cx('text-[12px]', i.state === 'failed' ? 'text-danger-ink' : 'text-muted')}>
                    {i.state === 'failed' ? i.error : `${fileSize(Math.round(i.size * i.progress))} of ${fileSize(i.size)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Ctx.Provider>
  );
}
