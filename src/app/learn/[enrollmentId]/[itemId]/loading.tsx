/**
 * Shown while a lesson opens. It also stops link prefetching from rendering the lesson on the server:
 * opening a lesson records progress, and a prefetch must never count as the learner starting it.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Opening the lesson" className="mx-auto max-w-4xl animate-pulse space-y-6 px-4 py-6 sm:px-6">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-line/70" />
        <div className="h-8 w-72 max-w-full rounded-lg bg-line" />
      </div>
      <div className="aspect-video w-full rounded-[var(--radius-card)] bg-card ring-1 ring-line" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-line/70" />
        <div className="h-4 w-11/12 rounded bg-line/70" />
        <div className="h-4 w-3/4 rounded bg-line/70" />
      </div>
    </div>
  );
}
