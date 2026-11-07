import type { PreviewItem } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ItemIcon } from '@/components/learning/course-ui';
import { PreviewItemView } from '@/components/learning/preview-item';
import { PageChrome } from '@/components/site/page-chrome';
import { Breadcrumbs } from '@/components/ui/nav';
import { ButtonLink, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { ITEM_LABELS, SLUG } from '@/lib/learning';

type Params = { params: Promise<{ slug: string; itemKey: string }> };
const KEY = /^[a-z0-9][a-z0-9-]{0,47}$/;

async function load(slug: string, itemKey: string) {
  return api<PreviewItem>('GET', `/v1/catalog/courses/${slug}/preview/${itemKey}`);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, itemKey } = await params;
  if (!SLUG.test(slug) || !KEY.test(itemKey)) return { title: 'Preview' };
  const res = await load(slug, itemKey);
  return res.ok ? { title: `${res.data.item.title} · Free preview of ${res.data.course.title}` } : { title: 'Preview' };
}

/** A free-preview lesson or item (CAT-6), open to anyone who can see the course. */
export default async function PreviewPage({ params }: Params) {
  const { slug, itemKey } = await params;
  if (!SLUG.test(slug) || !KEY.test(itemKey)) notFound();
  const res = await load(slug, itemKey);
  if (!res.ok && res.status === 404) notFound();
  const course = `/courses/${slug}`;

  return (
    <PageChrome next={course}>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {!res.ok ? (
          <Notice tone="error">{friendlyError(res.error)}</Notice>
        ) : (
          <>
            <header className="space-y-3">
              <Breadcrumbs
                items={[
                  { label: 'Courses', href: '/courses' },
                  { label: res.data.course.title, href: course },
                  { label: 'Free preview' },
                ]}
              />
              <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
                <ItemIcon type={res.data.item.type} className="h-3.5 w-3.5 text-link" />
                Module {res.data.module.position} · {res.data.module.title} · {ITEM_LABELS[res.data.item.type]} · {res.data.item.minutes} min
              </p>
              <h1 className="text-[30px] font-extrabold leading-tight">{res.data.item.title}</h1>
              <p className="inline-flex items-center gap-2 rounded-full bg-gold-tint px-3 py-1 text-[13px] font-semibold text-gold-ink ring-1 ring-gold-line">Free preview · nothing you do here is saved</p>
            </header>

            <PreviewItemView preview={res.data} />

            <aside className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-forest p-6 text-white sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-display text-[19px] font-bold">Like what you see?</p>
                <p className="text-[14px] text-white/80">Enrol in “{res.data.course.title}” to have your answers checked, keep your progress and earn the certificate.</p>
              </div>
              <ButtonLink href={course} variant="secondary" className="shrink-0">
                See the course and enrol
              </ButtonLink>
            </aside>
          </>
        )}
      </div>
    </PageChrome>
  );
}
