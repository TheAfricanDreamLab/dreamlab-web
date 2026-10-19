'use client';

import { useActionState, useState } from 'react';
import { type DiscussionState, postDiscussion } from '@/app/actions/learning';
import { SubmitButton } from '@/components/auth/forms';
import { cx, Notice } from '@/components/ui/primitives';
import { wordCount } from '@/lib/learning';

/** Your answer to the discussion prompt. */
export function DiscussionPostForm({ enrollmentId, itemId, minWords, peers }: { enrollmentId: string; itemId: string; minWords: number; peers: number }) {
  const [state, action] = useActionState(postDiscussion, {} as DiscussionState);
  const [body, setBody] = useState(state.values?.body ?? '');
  const words = wordCount(body);
  const enough = words >= Math.max(1, minWords);
  return (
    <form action={action} className="space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="itemId" value={itemId} />
      <label htmlFor="discussion-body" className="font-display text-[17px] font-bold text-ink">
        Your answer
      </label>
      <textarea
        id="discussion-body"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        maxLength={6000}
        required
        aria-describedby="discussion-count"
        className="w-full rounded-[var(--radius-field)] bg-surface p-4 text-[15px] leading-relaxed text-ink ring-1 ring-line-strong focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <p id="discussion-count" className={cx('font-mono text-[11.5px]', enough ? 'text-link' : 'text-muted')}>
        {words} words{minWords > 0 ? ` · at least ${minWords}` : ''}
        {enough && ' ✓'}
      </p>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {enough ? (
        <SubmitButton pending="Posting…">Post my answer</SubmitButton>
      ) : (
        <button type="button" disabled className="h-12 w-full cursor-not-allowed rounded-[var(--radius-field)] bg-line-heavy px-5 text-[15px] font-semibold text-white">
          Write at least {minWords} words to post
        </button>
      )}
      {peers > 0 && (
        <p className="text-center text-[13px] text-muted">
          Post your answer to see {peers} {peers === 1 ? 'classmate’s response' : 'classmates’ responses'}.
        </p>
      )}
    </form>
  );
}

/** A small reply box under a post. */
export function ReplyForm({ enrollmentId, itemId, parentId, name }: { enrollmentId: string; itemId: string; parentId: string; name: string }) {
  const [state, action] = useActionState(postDiscussion, {} as DiscussionState);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  // Close the box once a reply lands (adjusting state while rendering, not in an effect).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.posted) {
      setOpen(false);
      setBody('');
    }
  }
  if (!open)
    return (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-semibold text-link hover:underline">
          Reply
        </button>
        {state.notice && <span className="text-[12.5px] text-muted">{state.notice}</span>}
      </div>
    );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="parentId" value={parentId} />
      <label htmlFor={`reply-${parentId}`} className="sr-only">
        Reply to {name}
      </label>
      <textarea
        id={`reply-${parentId}`}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={6000}
        required
        autoFocus
        placeholder={`Reply to ${name}…`}
        className="w-full rounded-[var(--radius-field)] bg-surface p-3 text-[14px] text-ink ring-1 ring-line-strong focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex gap-2">
        <button type="submit" disabled={!body.trim()} className="h-9 rounded-[10px] bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:bg-line-heavy">
          Post reply
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-[10px] px-3 text-[13.5px] font-semibold text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
