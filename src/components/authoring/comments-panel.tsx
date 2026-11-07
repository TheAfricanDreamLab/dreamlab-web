'use client';

import type { CommentAnchor, DraftComment } from '@dreamlab/contracts';
import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { addComment, deleteComment, updateComment } from '@/app/actions/authoring';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import type { ModuleDoc } from '@/lib/authoring';
import type { Selection } from '@/lib/course-outline';
import { initials } from './outline-tree';

/*
 * Review comments (CAT-6): threads on the course, a module, an item or one block. Reviewers comment
 * from the live preview (the editor is read-only for them); authors from a block's menu too. Replies,
 * resolving and reopening; only a comment's author edits or deletes it.
 */

/** What the workspace offers deeper components: open threads per block, and starting a comment. */
export const CommentsContext = createContext<{ count: (itemKey: string | null, blockId: string | null) => number; start: (anchor: Partial<CommentAnchor>) => void } | null>(null);

/** Where the selection is, as an anchor for a new comment. */
export function anchorFor(sel: Selection, modules: ModuleDoc[]): CommentAnchor {
  if (sel.kind === 'module' || sel.kind === 'item') {
    const mod = modules[sel.m];
    if (mod) {
      const base = { moduleKey: mod.key || null, label: `Module ${sel.m + 1}${mod.title ? ` “${mod.title.slice(0, 40)}”` : ''}` };
      const item = sel.kind === 'item' ? mod.items[sel.i] : undefined;
      if (item) return { ...base, itemKey: item.key || null, blockId: null, label: `${base.label} › ${item.title.slice(0, 50) || 'Untitled'}` };
      return { ...base, itemKey: null, blockId: null };
    }
  }
  return { moduleKey: null, itemKey: null, blockId: null, label: 'Course details' };
}

/** Where an anchor is in the outline now (keys follow items when they move), or null if it's gone. */
export function selectionOf(anchor: CommentAnchor, modules: ModuleDoc[]): Selection | null {
  if (!anchor.moduleKey) return { kind: 'details' };
  const m = modules.findIndex((x) => x.key === anchor.moduleKey);
  if (!anchor.itemKey) return m < 0 ? null : { kind: 'module', m };
  const i = m < 0 ? -1 : modules[m]!.items.findIndex((x) => x.key === anchor.itemKey);
  if (i >= 0) return { kind: 'item', m, i };
  // The item moved to another module: follow its key.
  for (const [mm, mod] of modules.entries()) {
    const ii = mod.items.findIndex((x) => x.key === anchor.itemKey);
    if (ii >= 0) return { kind: 'item', m: mm, i: ii };
  }
  return null;
}

const ago = (iso: string) => {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export function CommentsPanel({
  draftId,
  comments,
  setComments,
  modules,
  draftAnchor,
  onDraftAnchor,
  onGo,
  onClose,
  highlight,
}: {
  draftId: string;
  comments: DraftComment[];
  setComments: (update: (list: DraftComment[]) => DraftComment[]) => void;
  modules: ModuleDoc[];
  /** A new comment being started, and where it points. */
  draftAnchor: CommentAnchor;
  onDraftAnchor: (a: CommentAnchor) => void;
  onGo: (s: Selection) => void;
  onClose: () => void;
  highlight?: string | null;
}) {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);

  // A comment started from a block focuses the box.
  useEffect(() => {
    box.current?.focus();
  }, [draftAnchor]);

  const linked = highlight ? (comments.find((c) => c.id === highlight)?.parentId ?? highlight) : null;
  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    return roots
      .map((root) => ({ root, replies: comments.filter((c) => c.parentId === root.id) }))
      .filter(({ root }) => root.id === linked || (filter === 'all' ? true : filter === 'open' ? !root.resolvedAt : !!root.resolvedAt))
      .reverse();
  }, [comments, filter, linked]);
  const openCount = comments.filter((c) => !c.parentId && !c.resolvedAt).length;

  const post = async () => {
    if (!text.trim() || sending.current) return;
    sending.current = true;
    const sent = text;
    setBusy(true);
    setError(null);
    const res = await addComment(draftId, draftAnchor, sent);
    sending.current = false;
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setComments((list) => [...list, res.data]);
    setText((t) => (t === sent ? '' : t));
    setFilter('open');
  };

  return (
    <div className="flex h-full min-h-0 flex-col" aria-label="Comments">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <span className="text-[14px] font-bold text-ink">Comments {openCount > 0 && <span className="ml-1 rounded-full bg-[#eef4fb] px-1.5 text-[11.5px] text-[#1c4673]">{openCount} open</span>}</span>
        <button type="button" onClick={onClose} aria-label="Close comments" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 border-b border-line p-3">
        <p className="flex items-center gap-1.5 text-[12px] text-muted">
          On: <span className="min-w-0 truncate font-semibold text-ink">{draftAnchor.label}</span>
          {(draftAnchor.blockId || draftAnchor.itemKey || draftAnchor.moduleKey) && (
            <button type="button" onClick={() => onDraftAnchor({ moduleKey: null, itemKey: null, blockId: null, label: 'Course details' })} className="shrink-0 text-link hover:underline">
              the whole course instead
            </button>
          )}
        </p>
        <textarea
          ref={box}
          rows={3}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void post();
          }}
          placeholder="Write a comment for the authors… (Ctrl+Enter to send)"
          aria-label="New comment"
          className="w-full resize-y rounded-[var(--radius-field)] bg-card px-3 py-2 text-[14px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {error && (
          <p role="alert" className="text-[12.5px] text-danger-ink">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={() => void post()} disabled={busy || !text.trim()} className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-white hover:bg-forest disabled:opacity-50">
            {busy ? 'Sending…' : 'Comment'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line px-3 py-2" role="tablist" aria-label="Which comments">
        {(['open', 'resolved', 'all'] as const).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cx('rounded-full px-3 py-1 text-[12.5px] font-semibold', filter === f ? 'bg-forest text-white' : 'text-muted hover:bg-surface')}>
            {f === 'open' ? 'Open' : f === 'resolved' ? 'Resolved' : 'All'}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-page p-3">
        {threads.length === 0 ? (
          <p className="p-6 text-center text-[13.5px] text-muted">{filter === 'open' ? 'No open comments. Anything to raise? Write it above.' : 'Nothing here.'}</p>
        ) : (
          threads.map(({ root, replies }) => (
            <Thread
              key={root.id}
              draftId={draftId}
              root={root}
              replies={replies}
              highlight={linked === root.id}
              target={selectionOf(root.anchor, modules)}
              onGo={onGo}
              setComments={setComments}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Thread({
  draftId,
  root,
  replies,
  highlight,
  target,
  onGo,
  setComments,
}: {
  draftId: string;
  root: DraftComment;
  replies: DraftComment[];
  highlight: boolean;
  target: Selection | null;
  onGo: (s: Selection) => void;
  setComments: (update: (list: DraftComment[]) => DraftComment[]) => void;
}) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const sendingReply = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: 'center' });
  }, [highlight]);

  const replace = (c: DraftComment) => setComments((list) => list.map((x) => (x.id === c.id ? c : x)));
  const act = async (fn: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(res.error);
    return res.ok;
  };

  return (
    <article ref={ref} className={cx('space-y-2 rounded-[var(--radius-card)] bg-card p-3 ring-1', highlight ? 'ring-2 ring-primary' : 'ring-line', root.resolvedAt && 'opacity-80')}>
      <button
        type="button"
        onClick={() => target && onGo(target)}
        disabled={!target}
        className="block max-w-full truncate text-left font-mono text-[10.5px] uppercase tracking-[0.08em] text-link enabled:hover:underline disabled:text-faint"
        title={target ? 'Go to it' : 'This part was removed'}
      >
        {root.anchor.label || 'Course'}
        {!target && ' (removed)'}
      </button>
      {[root, ...replies].map((c) => (
        <Comment key={c.id} draftId={draftId} c={c} onChanged={replace} onRemoved={(id) => setComments((list) => list.filter((x) => x.id !== id && x.parentId !== id))} />
      ))}
      {root.resolvedAt ? (
        <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-[12.5px] text-muted">
          <span>✓ Resolved by {root.resolvedBy?.name ?? 'someone'}</span>
          <button type="button" disabled={busy} onClick={() => void act(async () => updateComment(draftId, root.id, { resolved: false }).then((r) => (r.ok && replace(r.data), r)))} className="font-semibold text-link hover:underline">
            Reopen
          </button>
        </div>
      ) : (
        <div className="space-y-2 border-t border-line pt-2">
          <div className="flex gap-2">
            <input
              value={reply}
              maxLength={2000}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && reply.trim() && !sendingReply.current) {
                  e.preventDefault();
                  sendingReply.current = true;
                  const sent = reply;
                  void act(async () =>
                    addComment(draftId, root.anchor, sent, root.id).then((r) => {
                      sendingReply.current = false;
                      if (r.ok) {
                        setComments((list) => [...list, r.data]);
                        setReply((t) => (t === sent ? '' : t));
                      }
                      return r;
                    }),
                  );
                }
              }}
              placeholder="Reply… (Enter to send)"
              aria-label="Reply"
              className="h-9 min-w-0 flex-1 rounded-[var(--radius-field)] bg-surface px-3 text-[13.5px] ring-1 ring-line focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(async () => updateComment(draftId, root.id, { resolved: true }).then((r) => (r.ok && replace(r.data), r)))}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold text-primary ring-1 ring-success-line hover:bg-success-tint"
            >
              <Icon name="check" className="h-3.5 w-3.5" /> Resolve
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] text-danger-ink">
          {error}
        </p>
      )}
    </article>
  );
}

function Comment({ draftId, c, onChanged, onRemoved }: { draftId: string; c: DraftComment; onChanged: (c: DraftComment) => void; onRemoved: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.body);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const res = await updateComment(draftId, c.id, { body: text });
    if (!res.ok) return setError(res.error);
    onChanged(res.data);
    setEditing(false);
  };
  const remove = async () => {
    if (!window.confirm(c.parentId ? 'Delete this reply?' : 'Delete this comment and its replies?')) return;
    const res = await deleteComment(draftId, c.id);
    if (!res.ok) return setError(res.error);
    onRemoved(c.id);
  };
  return (
    <div className={cx('flex gap-2', c.parentId && 'pl-6')}>
      <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-[10.5px] font-bold text-white">
        {initials(c.author?.name ?? '?')}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[12px] text-muted">
          <span className="font-semibold text-ink">{c.author?.name ?? 'Someone'}</span> · {ago(c.createdAt)}
          {c.editedAt && ' · edited'}
        </p>
        {editing ? (
          <div className="space-y-1.5">
            <textarea rows={3} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} aria-label="Edit comment" className="w-full rounded-[var(--radius-field)] bg-card px-2.5 py-2 text-[13.5px] ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="flex gap-3 text-[12.5px]">
              <button type="button" onClick={() => void save()} disabled={!text.trim()} className="font-semibold text-link hover:underline">
                Save
              </button>
              <button type="button" onClick={() => (setEditing(false), setText(c.body))} className="text-muted hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-body">{c.body}</p>
        )}
        {c.mine && !editing && (
          <p className="flex gap-3 text-[12px]">
            <button type="button" onClick={() => setEditing(true)} className="text-muted hover:text-ink">
              Edit
            </button>
            <button type="button" onClick={() => void remove()} className="text-muted hover:text-danger-ink">
              Delete
            </button>
          </p>
        )}
        {error && (
          <p role="alert" className="text-[12px] text-danger-ink">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
