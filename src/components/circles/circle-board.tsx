'use client';

import type { CircleAttachment, CirclePost, CirclePostPage, LinkPreview } from '@dreamlab/contracts';
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';
import { loadCirclePosts, pinCirclePost, removeCirclePost } from '@/app/actions/circles';
import { Icon } from '@/components/ui/icons';
import { Badge, cx, Notice } from '@/components/ui/primitives';
import { clock } from '@/lib/circle-media';
import { initials } from '@/lib/labels';
import { fileSize } from '@/lib/upload';
import { attempt } from './attempt';
import { Composer } from './composer';

const ROLE_BADGE = { mentor: 'Mentor', staff: 'Cohort team', member: null } as const;

/**
 * The circle's board (COMM-2): newest posts first, pinned ones on top. The first page arrives with
 * the page; older posts load as the reader reaches the end, and replies only when opened. Media
 * carry their own signed links, so nothing waits on further requests.
 */
export function CircleBoard({ circleId, initial }: { circleId: string; initial: CirclePostPage }) {
  const [posts, setPosts] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  // Older posts load when the end of the list comes into view.
  useEffect(() => {
    const el = end.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        // After a failure, loading waits for "Show older posts" instead of retrying on its own.
        if (entries.some((e) => e.isIntersecting) && !loading && !error) void more();
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  });

  async function more() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    const res = await attempt(() => loadCirclePosts(circleId, { before: cursor }));
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setPosts((all) => [...all, ...res.data.items.filter((p) => !all.some((a) => a.id === p.id))]);
    setCursor(res.data.nextCursor);
  }

  // A post pinned just now goes to the top of the pinned ones.
  const replace = (post: CirclePost) =>
    setPosts((all) => {
      const before = all.find((p) => p.id === post.id);
      const rest = all.filter((p) => p.id !== post.id);
      return sortPinned(post.pinned && !before?.pinned ? [post, ...rest] : all.map((p) => (p.id === post.id ? post : p)));
    });
  const remove = (id: string) => setPosts((all) => all.filter((p) => p.id !== id));

  return (
    <div className="space-y-4">
      <Composer circleId={circleId} placeholder="Share an update, a question or a win with your circle" onPosted={(p) => setPosts((all) => sortPinned([p, ...all]))} />
      {posts.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-6 text-center text-[14.5px] text-muted ring-1 ring-line">Nothing here yet. Start the conversation.</p>
      ) : (
        <ol className="space-y-3" aria-label="Posts">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard circleId={circleId} post={p} onChange={replace} onRemoved={() => remove(p.id)} />
            </li>
          ))}
        </ol>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div ref={end} className="flex justify-center">
        {cursor && (
          <button type="button" onClick={() => void more()} disabled={loading} className="min-h-11 rounded-full px-5 text-[14px] font-semibold text-link hover:bg-surface disabled:text-faint">
            {loading ? 'Loading…' : 'Show older posts'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Pinned posts on top, most recently pinned first (as listed); the rest newest first. */
function sortPinned(posts: CirclePost[]): CirclePost[] {
  const newest = (a: CirclePost, b: CirclePost) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
  return [...posts.filter((p) => p.pinned), ...posts.filter((p) => !p.pinned).sort(newest)];
}

function PostCard({ circleId, post, onChange, onRemoved, reply = false }: { circleId: string; post: CirclePost; onChange: (p: CirclePost) => void; onRemoved: () => void; reply?: boolean }) {
  const [replies, setReplies] = useState<CirclePost[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleReplies() {
    setOpen((o) => !o);
    if (replies !== null || open) return;
    setError(null);
    const res = await attempt(() => loadCirclePosts(circleId, { parentId: post.id }));
    if (res.ok) setReplies(res.data.items);
    else setError(res.error);
  }

  async function remove() {
    if (!confirm(reply ? 'Remove this reply?' : 'Remove this post and its files? Replies go with it.')) return;
    setBusy(true);
    const res = await attempt(() => removeCirclePost(post.id));
    setBusy(false);
    if (res.ok) onRemoved();
    else setError(res.error);
  }

  async function pin() {
    setBusy(true);
    const res = await attempt(() => pinCirclePost(post.id, !post.pinned));
    setBusy(false);
    if (res.ok) onChange(res.data);
    else setError(res.error);
  }

  const badge = ROLE_BADGE[post.author.role];
  return (
    <article className={cx('space-y-3', reply ? 'border-l-2 border-line pl-3' : 'rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line', post.pinned && 'ring-2 ring-gold-line')}>
      <header className="flex items-start gap-3">
        <span aria-hidden className={cx('grid shrink-0 place-items-center rounded-full bg-success-tint font-display font-bold text-link', reply ? 'h-8 w-8 text-[12px]' : 'h-10 w-10 text-sm')}>
          {initials(post.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink">
            {post.author.name}
            {badge && <Badge tone="gold">{badge}</Badge>}
            {post.pinned && <Badge tone="green">Pinned</Badge>}
          </p>
          <p className="text-[12.5px] text-muted">
            <time dateTime={post.createdAt}>{when(post.createdAt)}</time>
          </p>
        </div>
        {(post.can.pin || post.can.delete) && (
          <div className="flex shrink-0 gap-1">
            {post.can.pin && (
              <button type="button" onClick={() => void pin()} disabled={busy} className="min-h-9 rounded-lg px-2.5 text-[12.5px] font-semibold text-link hover:bg-surface">
                {post.pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
            {post.can.delete && (
              <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-9 rounded-lg px-2.5 text-[12.5px] font-semibold text-muted hover:bg-danger-tint hover:text-danger-ink">
                Remove
              </button>
            )}
          </div>
        )}
      </header>
      {post.body && <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-body">{linkified(post.body)}</p>}
      {post.attachments.length > 0 && <Attachments items={post.attachments} />}
      {post.links.length > 0 && (
        <ul className="space-y-2">
          {post.links.map((l) => (
            <li key={l.url}>
              <LinkCard link={l} />
            </li>
          ))}
        </ul>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {!reply && (
        <div className="space-y-3">
          <button type="button" onClick={() => void toggleReplies()} aria-expanded={open} className="min-h-9 text-[13.5px] font-semibold text-link hover:underline">
            {open ? 'Hide replies' : post.replyCount > 0 ? `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
          </button>
          {open && (
            <div className="space-y-3">
              {replies === null ? (
                !error && <p className="text-[13px] text-muted">Loading replies…</p>
              ) : (
                replies.map((r) => (
                  <PostCard
                    key={r.id}
                    circleId={circleId}
                    post={r}
                    reply
                    onChange={(x) => setReplies((all) => all!.map((y) => (y.id === x.id ? x : y)))}
                    onRemoved={() => {
                      setReplies((all) => all!.filter((y) => y.id !== r.id));
                      onChange({ ...post, replyCount: Math.max(0, post.replyCount - 1) });
                    }}
                  />
                ))
              )}
              <Composer
                compact
                circleId={circleId}
                parentId={post.id}
                placeholder={`Reply to ${post.author.name}`}
                onPosted={(r) => {
                  setReplies((all) => [...(all ?? []), r]);
                  onChange({ ...post, replyCount: post.replyCount + 1 });
                }}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Pictures in a grid with their space reserved; sound and video load nothing until played. */
function Attachments({ items }: { items: CircleAttachment[] }) {
  const pictures = items.filter((a) => a.kind === 'image');
  const others = items.filter((a) => a.kind !== 'image');
  return (
    <div className="space-y-2">
      {pictures.length > 0 && (
        <div className={cx('grid gap-2', pictures.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {pictures.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg bg-surface ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage links, already sized when uploaded */}
              <img
                src={a.url}
                alt={a.fileName}
                loading="lazy"
                decoding="async"
                width={a.width ?? undefined}
                height={a.height ?? undefined}
                className={cx('h-auto w-full object-cover', pictures.length > 1 && 'aspect-square')}
              />
            </a>
          ))}
        </div>
      )}
      {others.map((a) => (
        <Fragment key={a.id}>
          {a.kind === 'audio' ? (
            <div className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 ring-1 ring-line">
              <Icon name="mic" className="h-5 w-5 shrink-0 text-link" />
              <audio controls preload="none" src={a.url} className="h-10 min-w-0 flex-1">
                <track kind="captions" />
              </audio>
              {a.durationSec !== null && <span className="text-[12.5px] text-muted">{clock(a.durationSec)}</span>}
            </div>
          ) : a.kind === 'video' ? (
            <video controls preload="none" playsInline src={a.url} width={a.width ?? undefined} height={a.height ?? undefined} className="h-auto max-h-[70vh] w-full rounded-lg bg-ink">
              <track kind="captions" />
            </video>
          ) : (
            <a href={a.url} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2.5 ring-1 ring-line hover:ring-line-heavy">
              <Icon name="file" className="h-5 w-5 shrink-0 text-link" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{a.fileName}</span>
              <span className="shrink-0 text-[12.5px] text-muted">{fileSize(a.size)}</span>
            </a>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function LinkCard({ link }: { link: LinkPreview }) {
  const host = new URL(link.url).hostname.replace(/^www\./, '');
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="block rounded-lg bg-surface px-3.5 py-3 ring-1 ring-line hover:ring-line-heavy">
      <span className="block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{link.siteName ?? host}</span>
      <span className="block truncate text-[14.5px] font-semibold text-link">{link.title ?? link.url}</span>
      {link.description && <span className="mt-0.5 line-clamp-2 block text-[13px] text-body">{link.description}</span>}
    </a>
  );
}

/** The post's text with its links made clickable (as text and links only: nothing is rendered as HTML). */
function linkified(text: string): ReactNode[] {
  const parts = text.split(/(\bhttps?:\/\/[^\s<>"')\]]+)/gi);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const href = part.replace(/[.,;:!?]+$/, '');
    const tail = part.slice(href.length);
    return (
      <Fragment key={i}>
        <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-link underline">
          {href}
        </a>
        {tail}
      </Fragment>
    );
  });
}

/** "Just now", "12 min ago", "3 h ago", then the date. */
function when(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}
