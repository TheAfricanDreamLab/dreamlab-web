'use client';

import type { DraftSave } from '@dreamlab/contracts';
import { useEffect, useState } from 'react';
import { loadDraftHistory, loadDraftSave } from '@/app/actions/authoring';
import { Icon } from '@/components/ui/icons';
import { cx, Notice } from '@/components/ui/primitives';

/*
 * A draft's version history (CAT-5): checkpoints of the course as it was, newest first. Each can be
 * downloaded or restored; restoring keeps what was there in the history, so it can be undone.
 */

function ago(iso: string): string {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function HistoryPanel({
  draftId,
  slug,
  currentRevision,
  editable,
  onRestore,
  onClose,
}: {
  draftId: string;
  slug: string;
  currentRevision: number;
  editable: boolean;
  onRestore: (revision: number) => Promise<void>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<DraftSave[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    void loadDraftHistory(draftId).then((res) => {
      if (!live) return;
      if (res.ok) setItems(res.data);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [draftId, currentRevision]);

  const download = async (revision: number) => {
    setBusy(revision);
    const res = await loadDraftSave(draftId, revision);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' }));
    a.download = `${slug}-r${revision}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col" aria-label="Version history">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Version history</h2>
          <p className="text-[12px] text-muted">Autosaves every few minutes, plus each manual save</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close version history" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error && <Notice tone="error">{error}</Notice>}
        {!items && !error && <p className="p-3 text-[13.5px] text-muted">Loading…</p>}
        <ol className="space-y-2">
          {items?.map((s) => {
            const current = s.revision === currentRevision;
            return (
              <li key={s.revision} className={cx('rounded-[var(--radius-field)] p-3 ring-1', current ? 'bg-success-tint ring-success-line' : 'bg-card ring-line')}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">
                    <time dateTime={s.savedAt} title={new Date(s.savedAt).toLocaleString('en-GB')}>
                      {ago(s.savedAt)}
                    </time>
                    {current && <span className="ml-2 text-[11.5px] font-bold uppercase tracking-wide text-link">Current</span>}
                  </p>
                  <span className="font-mono text-[11px] text-faint">r{s.revision}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {s.savedBy?.name ?? 'An author'} · {s.modules} module{s.modules === 1 ? '' : 's'}, {s.items} item{s.items === 1 ? '' : 's'}
                </p>
                <div className="mt-2 flex gap-2">
                  {editable && !current && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={async () => {
                        if (!window.confirm(`Restore the version from ${ago(s.savedAt)}? What you have now stays in the history.`)) return;
                        setBusy(s.revision);
                        await onRestore(s.revision);
                        setBusy(null);
                      }}
                      className="rounded-full bg-forest px-3 py-1 text-[12.5px] font-semibold text-white hover:bg-primary disabled:opacity-50"
                    >
                      {busy === s.revision ? 'Restoring…' : 'Restore'}
                    </button>
                  )}
                  <button type="button" disabled={busy !== null} onClick={() => void download(s.revision)} className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-link ring-1 ring-line hover:bg-surface disabled:opacity-50">
                    Download
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
