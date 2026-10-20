import type { Metadata } from 'next';
import Link from 'next/link';
import { BackLink } from '@/components/ui/nav';
import { ButtonLink, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime, type JournalEntry, plural } from '@/lib/learning';

export const metadata: Metadata = { title: 'My journal' };

export default async function JournalPage() {
  const res = await api<{ items: JournalEntry[] }>('GET', '/v1/learning/journal');
  const entries = res.ok ? [...res.data.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  // Group by course, keeping the course with the newest entry first.
  const groups = new Map<string, { title: string; slug: string; entries: JournalEntry[] }>();
  for (const e of entries) {
    const g = groups.get(e.course.slug) ?? { title: e.course.title, slug: e.course.slug, entries: [] };
    g.entries.push(e);
    groups.set(e.course.slug, g);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <BackLink href="/app/learning" label="My learning" className="-ml-0.5 mb-1" />
        <Eyebrow tone="gold">Only you can see this</Eyebrow>
        <h1 className="text-[30px] font-extrabold">My journal</h1>
        <p className="text-[14.5px] text-muted">Every reflection you write in a lesson lands here, so you can see how your thinking grows.</p>
      </header>

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : entries.length === 0 ? (
        <Card className="space-y-4 p-10 text-center">
          <p className="font-display text-[20px] font-bold text-ink">Your journal is empty for now.</p>
          <p className="text-[14.5px] text-muted">When a lesson asks you to reflect, what you write is saved here.</p>
          <ButtonLink href="/app/learning" className="mx-auto sm:px-8">
            Go to my learning
          </ButtonLink>
        </Card>
      ) : (
        [...groups.values()].map((g) => (
          <section key={g.slug} className="space-y-3" aria-labelledby={`journal-${g.slug}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`journal-${g.slug}`} className="text-[20px] font-bold">
                <Link href={`/courses/${g.slug}`} className="hover:underline">
                  {g.title}
                </Link>
              </h2>
              <span className="text-[12.5px] text-muted">{plural(g.entries.length, 'entry', 'entries')}</span>
            </div>
            <ol className="space-y-3">
              {g.entries.map((e) => (
                <li key={e.id}>
                  <article className="space-y-2 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                      {e.itemTitle} · <time dateTime={e.createdAt}>{dateTime(e.createdAt)}</time>
                    </p>
                    <p className="text-[14px] font-semibold leading-snug text-ink">{e.prompt}</p>
                    <p className="whitespace-pre-wrap border-l-2 border-gold pl-3 text-[14.5px] leading-relaxed text-body">{e.text}</p>
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
