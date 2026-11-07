import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FunnelView } from '@/components/cohorts/funnel';
import { BackLink } from '@/components/ui/nav';
import { Eyebrow, Notice } from '@/components/ui/primitives';
import type { CompletionFunnel } from '@/lib/engagement';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { SLUG } from '@/lib/learning';

export const metadata: Metadata = { title: 'Course funnel' };

type Props = { params: Promise<{ slug: string }> };

/** A course's completion funnel across every learner (LRN-9), for platform admins (the admin layout checks). */
export default async function CourseFunnelPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const res = await api<CompletionFunnel>('GET', `/v1/learning/admin/courses/${slug}/funnel`);
  if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 405)) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const f = res.data;

  return (
    <div className="space-y-6">
      <BackLink href="/app/admin/catalog" label="Catalog" />
      <header className="space-y-1">
        <Eyebrow tone="gold">Platform admin · Course</Eyebrow>
        <h1 className="text-[30px] font-extrabold">{f.scope.title}</h1>
        <p className="max-w-3xl text-[14px] text-muted">The completion funnel across everyone enrolled on this course, in every organisation and cohort. Shares are of everyone enrolled.</p>
      </header>
      <FunnelView funnel={f} />
    </div>
  );
}
