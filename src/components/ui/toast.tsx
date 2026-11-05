'use client';

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { cx } from './primitives';

/*
 * Toasts for success messages across the app: "Saved.", "Invitation sent.", "You've joined." They
 * appear at the bottom of the screen, are read out by screen readers, and go away on their own
 * (hovering or focusing one keeps it). Errors stay inline, next to what needs fixing.
 */

type Toast = { id: number; text: ReactNode; key: string };

const TTL_MS = 6000;
let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Show a success toast. The same text twice within a second shows once (React's dev double effects). */
export function toastSuccess(text: ReactNode, key = typeof text === 'string' ? text : String(seq + 1)) {
  const now = Date.now();
  if (recent.get(key) && now - recent.get(key)! < 1000) return;
  recent.set(key, now);
  const id = ++seq;
  // At most three at once: the oldest goes first.
  toasts = [...toasts.slice(-2), { id, text, key }];
  emit();
}
const recent = new Map<string, number>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => toasts;
const empty: Toast[] = [];

/** Where toasts appear. Rendered once, in the root layout. */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, snapshot, () => empty);
  return (
    <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
      {list.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(toast.id), TTL_MS);
  };
  const stop = () => clearTimeout(timer.current);
  useEffect(() => {
    timer.current = setTimeout(() => dismiss(toast.id), TTL_MS);
    return () => clearTimeout(timer.current);
  }, [toast.id]);
  return (
    <div
      role="status"
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocus={stop}
      onBlur={start}
      className={cx(
        'dl-toast pointer-events-auto flex w-full max-w-[26rem] items-start gap-3 rounded-[var(--radius-card)] bg-forest px-4 py-3 text-[14px] leading-relaxed text-white shadow-[var(--shadow-panel)] ring-1 ring-white/10',
      )}
    >
      <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold">
        ✓
      </span>
      <div className="min-w-0 flex-1 [&_a]:font-semibold [&_a]:underline">{toast.text}</div>
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
        ✕
      </button>
    </div>
  );
}

/**
 * Toasts a form's success notice each time the action returns one. Put it next to the form in place
 * of an inline success notice: `<NoticeToast state={state} />`.
 */
const shownStates = new WeakSet<object>();
export function NoticeToast({ state }: { state: { notice?: string | null } }) {
  useEffect(() => {
    // Each result toasts once, even when the same words come back for a second save.
    if (!state.notice || shownStates.has(state)) return;
    shownStates.add(state);
    toastSuccess(state.notice, `notice:${++seq}`);
  }, [state]);
  return null;
}

/**
 * A message that arrives once with the page after a redirect ("?created=1"): toasted when the page
 * opens, then the flag is taken out of the address so a reload doesn't repeat it.
 */
export function FlashToast({ children, clear }: { children: ReactNode; clear: string[] }) {
  const shown = useRef(false);
  const keys = clear.join(',');
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    const url = new URL(window.location.href);
    toastSuccess(children, `flash:${url.pathname}:${keys}`);
    // Out of the address without reloading the page (Next keeps its router in step with history).
    for (const k of keys.split(',')) url.searchParams.delete(k);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [children, keys]);
  return null;
}
