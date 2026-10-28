import { type Block, CourseAuthoringSchema, type Draft, toDeliveryContent } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PreviewBlocks } from '@/components/authoring/preview-blocks';
import { CourseCover, ItemIcon } from '@/components/learning/course-ui';
import { RichText } from '@/components/learning/rich-text';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid, ITEM_LABELS } from '@/lib/learning';

export const metadata: Metadata = { title: 'Preview draft' };

/** A draft as learners will see it, item by item, before it goes for review. Nothing is saved. */
export default async function DraftPreviewPage({ params, searchParams }: { params: Promise<{ draftId: string }>; searchParams: Promise<{ item?: string }> }) {
  const { draftId } = await params;
  const { item: itemKey } = await searchParams;
  if (!isUuid(draftId)) notFound();
  const res = await api<Draft>('GET', `/v1/catalog/authoring/drafts/${draftId}`);
  if (!res.ok && res.status === 404) notFound();
  const back = <BackLink href={`/app/authoring/${draftId}`} label="Back to the editor" className="-ml-0.5 mb-1" />;
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;

  const parsed = CourseAuthoringSchema.safeParse(res.data.doc);
  if (!parsed.success || !parsed.data.modules?.length) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <h1 className="text-[28px] font-extrabold">Preview</h1>
        <Notice tone="info">The preview opens once the course is complete enough to publish. Fix the issues listed in the editor first.</Notice>
      </div>
    );
  }
  const course = parsed.data;
  const modules = course.modules!;
  const items = modules.flatMap((m, mi) => m.items.map((it) => ({ ...it, moduleIndex: mi })));
  const current = items.find((i) => i.key === itemKey) ?? null;
  const content = current ? toDeliveryContent(current, `preview:${draftId}`) : null;
  const navLink = (active: boolean) => cx('flex items-center gap-2 rounded-[var(--radius-field)] px-3 py-2 text-[14px]', active ? 'bg-forest text-white' : 'text-body hover:bg-surface');

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        {back}
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow tone="gold">Preview · not published</Eyebrow>
          <Badge tone="gold">Learners can’t see this yet</Badge>
        </div>
        <h1 className="text-[30px] font-extrabold leading-tight">{course.title}</h1>
        <p className="text-[15px] text-muted">{course.subtitle}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label="Course outline" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Link href={`/app/authoring/${draftId}/preview`} aria-current={!current ? 'page' : undefined} className={cx(navLink(!current), 'font-semibold')}>
            Course page
          </Link>
          {modules.map((m, mi) => (
            <div key={m.key} className="space-y-1">
              <p className="px-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                Module {mi + 1} · {m.title}
              </p>
              {m.items.map((it) => (
                <Link
                  key={it.key}
                  href={`/app/authoring/${draftId}/preview?item=${encodeURIComponent(it.key)}`}
                  aria-current={current?.key === it.key ? 'page' : undefined}
                  className={navLink(current?.key === it.key)}
                >
                  <ItemIcon type={it.type} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{it.title}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="min-w-0 space-y-6">
          {!current || !content ? (
            <>
              <CourseCover cover={course.cover} showCredit eager className="aspect-[21/9] rounded-[var(--radius-card)]" />
              <Card className="space-y-4 p-5 sm:p-6">
                <RichText text={course.description} />
                {course.outcomes.length > 0 && (
                  <>
                    <h2 className="text-[17px] font-bold">What you’ll be able to do</h2>
                    <ul className="list-disc space-y-1 pl-5 text-[14.5px] text-body">
                      {course.outcomes.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  Module {current.moduleIndex + 1} · {ITEM_LABELS[current.type]} · {current.minutes} min
                </p>
                <h2 className="text-[26px] font-extrabold">{current.title}</h2>
              </div>
              {content.type === 'lesson' &&
                content.steps.map((s, i) => (
                  <section key={s.id} className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line sm:p-6">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">
                      Step {i + 1} of {content.steps.length}
                      {s.title ? ` · ${s.title}` : ''}
                    </p>
                    <PreviewBlocks blocks={s.blocks} />
                  </section>
                ))}
              {content.type === 'quiz' && (
                <section className="space-y-4">
                  {content.intro && <RichText text={content.intro} />}
                  <p className="text-[14px] text-muted">
                    Pass mark {content.passPct}% · {content.maxAttempts ? `${content.maxAttempts} attempts` : 'unlimited attempts'}
                  </p>
                  <PreviewBlocks blocks={content.questions as Block[]} />
                </section>
              )}
              {content.type === 'assignment' && (
                <section className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line sm:p-6">
                  {content.practicalOutput && <Badge tone="gold">Practical output: {content.practicalOutput}</Badge>}
                  <RichText text={content.brief} />
                  <ol className="list-decimal space-y-1 pl-5 text-[14.5px] text-body">
                    {content.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  <h3 className="text-[16px] font-bold">Rubric</h3>
                  <ul className="space-y-2">
                    {content.rubric.map((r) => (
                      <li key={r.id} className="rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
                        <span className="block text-[14.5px] font-semibold text-ink">{r.criterion}</span>
                        <span className="block text-[14px] text-body">{r.description}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {content.type === 'discussion' && (
                <section className="space-y-3 rounded-[var(--radius-card)] bg-forest p-5 text-white sm:p-6">
                  <RichText text={content.prompt} className="text-white/90 [&_strong]:text-white" />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
