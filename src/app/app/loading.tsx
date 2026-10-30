/** Shown while an app page loads: the outline of a page, so a click answers at once. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-line" />
        <div className="h-4 w-80 max-w-full rounded bg-line/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-[var(--radius-card)] bg-card ring-1 ring-line" />
        ))}
      </div>
      <div className="h-64 rounded-[var(--radius-card)] bg-card ring-1 ring-line" />
    </div>
  );
}
